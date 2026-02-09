import http from 'http'
import { env } from './config'
import { logger } from './logger'
import Redis from 'ioredis'
import { prisma } from '@nexflow/database'

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: number
  version: string
  checks: {
    redis: CheckResult
    database: CheckResult
  }
  metrics?: WorkerMetrics
}

interface CheckResult {
  status: 'pass' | 'fail'
  latencyMs?: number
  message?: string
}

interface WorkerMetrics {
  queues: {
    sync: QueueMetrics
    analysis: QueueMetrics
    agents: QueueMetrics
  }
  memory: {
    heapUsed: number
    heapTotal: number
    rss: number
  }
}

interface QueueMetrics {
  waiting: number
  active: number
  completed: number
  failed: number
}

let redisConnection: Redis | null = null
let queueMetricsGetter: (() => Promise<WorkerMetrics['queues']>) | null = null

const startTime = Date.now()

export function setHealthCheckDependencies(
  redis: Redis,
  getQueueMetrics: () => Promise<WorkerMetrics['queues']>
) {
  redisConnection = redis
  queueMetricsGetter = getQueueMetrics
}

async function checkRedis(): Promise<CheckResult> {
  if (!redisConnection) {
    return { status: 'fail', message: 'Redis connection not initialized' }
  }

  const start = Date.now()
  try {
    await redisConnection.ping()
    const latencyMs = Date.now() - start
    logger.health.checkPassed('redis', latencyMs)
    return { status: 'pass', latencyMs }
  } catch (error) {
    logger.health.checkFailed('redis', error)
    return { status: 'fail', message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    const latencyMs = Date.now() - start
    logger.health.checkPassed('database', latencyMs)
    return { status: 'pass', latencyMs }
  } catch (error) {
    logger.health.checkFailed('database', error)
    return { status: 'fail', message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function getFullHealthStatus(): Promise<HealthStatus> {
  const [redis, database] = await Promise.all([checkRedis(), checkDatabase()])

  const allPassing = redis.status === 'pass' && database.status === 'pass'
  const allFailing = redis.status === 'fail' && database.status === 'fail'

  let queueMetrics: WorkerMetrics['queues'] | undefined
  if (queueMetricsGetter) {
    try {
      queueMetrics = await queueMetricsGetter()
    } catch {
      // Ignore queue metrics errors
    }
  }

  const memoryUsage = process.memoryUsage()

  return {
    status: allPassing ? 'healthy' : allFailing ? 'unhealthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || '1.0.0',
    checks: { redis, database },
    metrics: queueMetrics
      ? {
          queues: queueMetrics,
          memory: {
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            rss: memoryUsage.rss,
          },
        }
      : undefined,
  }
}

function formatPrometheusMetrics(status: HealthStatus): string {
  const lines: string[] = []

  // Health status (1 = healthy, 0.5 = degraded, 0 = unhealthy)
  const healthValue =
    status.status === 'healthy' ? 1 : status.status === 'degraded' ? 0.5 : 0
  lines.push('# HELP nexflow_worker_health Health status of the worker')
  lines.push('# TYPE nexflow_worker_health gauge')
  lines.push(`nexflow_worker_health ${healthValue}`)

  // Uptime
  lines.push('# HELP nexflow_worker_uptime_seconds Worker uptime in seconds')
  lines.push('# TYPE nexflow_worker_uptime_seconds counter')
  lines.push(`nexflow_worker_uptime_seconds ${status.uptime}`)

  // Check latencies
  lines.push('# HELP nexflow_health_check_latency_ms Health check latency in milliseconds')
  lines.push('# TYPE nexflow_health_check_latency_ms gauge')
  if (status.checks.redis.latencyMs !== undefined) {
    lines.push(`nexflow_health_check_latency_ms{check="redis"} ${status.checks.redis.latencyMs}`)
  }
  if (status.checks.database.latencyMs !== undefined) {
    lines.push(`nexflow_health_check_latency_ms{check="database"} ${status.checks.database.latencyMs}`)
  }

  // Queue metrics
  if (status.metrics?.queues) {
    lines.push('# HELP nexflow_queue_jobs_waiting Jobs waiting in queue')
    lines.push('# TYPE nexflow_queue_jobs_waiting gauge')
    lines.push('# HELP nexflow_queue_jobs_active Jobs currently being processed')
    lines.push('# TYPE nexflow_queue_jobs_active gauge')
    lines.push('# HELP nexflow_queue_jobs_completed Jobs completed (lifetime)')
    lines.push('# TYPE nexflow_queue_jobs_completed counter')
    lines.push('# HELP nexflow_queue_jobs_failed Jobs failed (lifetime)')
    lines.push('# TYPE nexflow_queue_jobs_failed counter')

    for (const [queueName, metrics] of Object.entries(status.metrics.queues)) {
      lines.push(`nexflow_queue_jobs_waiting{queue="${queueName}"} ${metrics.waiting}`)
      lines.push(`nexflow_queue_jobs_active{queue="${queueName}"} ${metrics.active}`)
      lines.push(`nexflow_queue_jobs_completed{queue="${queueName}"} ${metrics.completed}`)
      lines.push(`nexflow_queue_jobs_failed{queue="${queueName}"} ${metrics.failed}`)
    }
  }

  // Memory metrics
  if (status.metrics?.memory) {
    lines.push('# HELP nexflow_worker_memory_bytes Memory usage in bytes')
    lines.push('# TYPE nexflow_worker_memory_bytes gauge')
    lines.push(`nexflow_worker_memory_bytes{type="heap_used"} ${status.metrics.memory.heapUsed}`)
    lines.push(`nexflow_worker_memory_bytes{type="heap_total"} ${status.metrics.memory.heapTotal}`)
    lines.push(`nexflow_worker_memory_bytes{type="rss"} ${status.metrics.memory.rss}`)
  }

  return lines.join('\n') + '\n'
}

export function startHealthServer(): http.Server {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${env.HEALTH_CHECK_PORT}`)

    try {
      switch (url.pathname) {
        case '/health': {
          const status = await getFullHealthStatus()
          res.writeHead(status.status === 'unhealthy' ? 503 : 200, {
            'Content-Type': 'application/json',
          })
          res.end(JSON.stringify(status, null, 2))
          break
        }

        case '/ready': {
          // Readiness: check if we can process jobs
          const [redis, database] = await Promise.all([checkRedis(), checkDatabase()])
          const ready = redis.status === 'pass' && database.status === 'pass'
          res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ready, checks: { redis, database } }))
          break
        }

        case '/live': {
          // Liveness: just check if the process is alive
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ alive: true, uptime: Math.floor((Date.now() - startTime) / 1000) }))
          break
        }

        case '/metrics': {
          const status = await getFullHealthStatus()
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
          res.end(formatPrometheusMetrics(status))
          break
        }

        default:
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Not found' }))
      }
    } catch (error) {
      logger.error('Health check server error', { error })
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Internal server error' }))
    }
  })

  server.listen(env.HEALTH_CHECK_PORT, () => {
    logger.info(`Health check server listening on port ${env.HEALTH_CHECK_PORT}`)
  })

  return server
}
