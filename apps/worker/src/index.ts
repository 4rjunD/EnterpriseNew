import { Worker, Queue, Job } from 'bullmq'
import Redis from 'ioredis'
import { prisma } from '@nexflow/database'
import { BottleneckDetector, PredictionEngine, AgentExecutor } from '@nexflow/ai'
import { LinearClient, GitHubClient } from '@nexflow/integrations'
import { env } from './config'
import { logger } from './logger'
import { startHealthServer, setHealthCheckDependencies } from './health'

// Redis connection
const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

connection.on('error', (error) => {
  logger.error('Redis connection error', { error })
})

connection.on('connect', () => {
  logger.info('Redis connected')
})

// Default job options with retry logic
const defaultJobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 1000, // Start with 1 second, then 2s, 4s, 8s, 16s
  },
  removeOnComplete: {
    count: 100,
    age: 24 * 60 * 60, // 24 hours
  },
  removeOnFail: {
    count: 50,
    age: 7 * 24 * 60 * 60, // 7 days
  },
}

// Queue definitions
export const syncQueue = new Queue('sync', { connection, defaultJobOptions })
export const analysisQueue = new Queue('analysis', { connection, defaultJobOptions })
export const agentQueue = new Queue('agents', { connection, defaultJobOptions })

// Helper to track job timing
function withJobTiming<T>(
  queue: string,
  fn: (job: Job) => Promise<T>
): (job: Job) => Promise<T> {
  return async (job: Job) => {
    const startTime = Date.now()
    logger.job.start(queue, job.id || 'unknown', job.name, {
      organizationId: job.data.organizationId,
    })

    try {
      const result = await fn(job)
      const duration = Date.now() - startTime
      logger.job.completed(queue, job.id || 'unknown', job.name, duration)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      logger.job.failed(queue, job.id || 'unknown', job.name, error, duration)
      throw error
    }
  }
}

// Sync worker - handles integration syncs
const syncWorker = new Worker(
  'sync',
  withJobTiming('sync', async (job) => {
    const { organizationId, integrationType } = job.data

    let client
    switch (integrationType) {
      case 'LINEAR':
        client = new LinearClient(organizationId)
        break
      case 'GITHUB':
        client = new GitHubClient(organizationId)
        break
      default:
        throw new Error(`Unknown integration type: ${integrationType}`)
    }

    const result = await client.sync()
    logger.job.progress('sync', job.id || 'unknown', `Synced ${result.itemsSynced} items`, {
      integrationType,
    })

    return result
  }),
  { connection, concurrency: env.WORKER_CONCURRENCY_SYNC }
)

// Analysis worker - handles bottleneck detection and predictions
const analysisWorker = new Worker(
  'analysis',
  withJobTiming('analysis', async (job) => {
    const { organizationId, projectId, type } = job.data

    switch (type) {
      case 'bottleneck_detection':
        const detector = new BottleneckDetector(organizationId)
        await detector.runDetection()
        break

      case 'predictions':
        const engine = new PredictionEngine({ organizationId, projectId })
        await engine.runAllPredictions()
        break

      default:
        throw new Error(`Unknown analysis type: ${type}`)
    }

    return { success: true }
  }),
  { connection, concurrency: env.WORKER_CONCURRENCY_ANALYSIS }
)

// Agent worker - handles agent evaluations and executions
const agentWorker = new Worker(
  'agents',
  withJobTiming('agents', async (job) => {
    const { organizationId, type } = job.data

    const executor = new AgentExecutor()

    switch (type) {
      case 'run_agents':
        await executor.runAllAgents(organizationId)
        break

      case 'execute_approved':
        await executor.executeApprovedActions()
        break

      default:
        throw new Error(`Unknown agent job type: ${type}`)
    }

    return { success: true }
  }),
  { connection, concurrency: env.WORKER_CONCURRENCY_AGENTS }
)

// Scheduled jobs
async function scheduleRecurringJobs(): Promise<void> {
  // Get all organizations
  const orgs = await prisma.organization.findMany({
    select: { id: true },
  })

  logger.info(`Scheduling recurring jobs for ${orgs.length} organizations`)

  for (const org of orgs) {
    // Schedule sync jobs every 15 minutes
    const integrations = await prisma.integration.findMany({
      where: { organizationId: org.id, status: 'CONNECTED' },
    })

    for (const integration of integrations) {
      await syncQueue.add(
        `sync-${org.id}-${integration.type}`,
        { organizationId: org.id, integrationType: integration.type },
        {
          repeat: { every: 15 * 60 * 1000 }, // 15 minutes
          ...defaultJobOptions,
        }
      )
    }

    // Schedule bottleneck detection every 30 minutes
    await analysisQueue.add(
      `bottleneck-${org.id}`,
      { organizationId: org.id, type: 'bottleneck_detection' },
      {
        repeat: { every: 30 * 60 * 1000 }, // 30 minutes
        ...defaultJobOptions,
      }
    )

    // Schedule predictions every hour
    await analysisQueue.add(
      `predictions-${org.id}`,
      { organizationId: org.id, type: 'predictions' },
      {
        repeat: { every: 60 * 60 * 1000 }, // 1 hour
        ...defaultJobOptions,
      }
    )

    // Schedule agent runs every 15 minutes
    await agentQueue.add(
      `agents-${org.id}`,
      { organizationId: org.id, type: 'run_agents' },
      {
        repeat: { every: 15 * 60 * 1000 }, // 15 minutes
        ...defaultJobOptions,
      }
    )
  }

  logger.info('Recurring jobs scheduled')
}

// Queue metrics getter for health checks
async function getQueueMetrics() {
  const [syncCounts, analysisCounts, agentCounts] = await Promise.all([
    syncQueue.getJobCounts(),
    analysisQueue.getJobCounts(),
    agentQueue.getJobCounts(),
  ])

  return {
    sync: {
      waiting: syncCounts.waiting,
      active: syncCounts.active,
      completed: syncCounts.completed,
      failed: syncCounts.failed,
    },
    analysis: {
      waiting: analysisCounts.waiting,
      active: analysisCounts.active,
      completed: analysisCounts.completed,
      failed: analysisCounts.failed,
    },
    agents: {
      waiting: agentCounts.waiting,
      active: agentCounts.active,
      completed: agentCounts.completed,
      failed: agentCounts.failed,
    },
  }
}

// Event handlers
syncWorker.on('completed', (job) => {
  logger.debug(`Sync job ${job.id} completed`)
})

syncWorker.on('failed', (job, err) => {
  logger.error(`Sync job ${job?.id} failed`, { error: err, attempt: job?.attemptsMade })
})

syncWorker.on('stalled', (jobId) => {
  logger.warn(`Sync job ${jobId} stalled`)
})

analysisWorker.on('completed', (job) => {
  logger.debug(`Analysis job ${job.id} completed`)
})

analysisWorker.on('failed', (job, err) => {
  logger.error(`Analysis job ${job?.id} failed`, { error: err, attempt: job?.attemptsMade })
})

analysisWorker.on('stalled', (jobId) => {
  logger.warn(`Analysis job ${jobId} stalled`)
})

agentWorker.on('completed', (job) => {
  logger.debug(`Agent job ${job.id} completed`)
})

agentWorker.on('failed', (job, err) => {
  logger.error(`Agent job ${job?.id} failed`, { error: err, attempt: job?.attemptsMade })
})

agentWorker.on('stalled', (jobId) => {
  logger.warn(`Agent job ${jobId} stalled`)
})

// Graceful shutdown
let healthServer: ReturnType<typeof startHealthServer> | null = null

async function shutdown(): Promise<void> {
  logger.info('Shutting down workers...')

  // Close health server first
  if (healthServer) {
    await new Promise<void>((resolve) => {
      healthServer!.close(() => resolve())
    })
  }

  // Close workers
  await Promise.all([
    syncWorker.close(),
    analysisWorker.close(),
    agentWorker.close(),
  ])

  // Close Redis connection
  await connection.quit()

  // Disconnect Prisma
  await prisma.$disconnect()

  logger.info('Shutdown complete')
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error })
  shutdown()
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { error: reason })
})

// Start
async function start() {
  logger.info('NexFlow Worker starting...', {
    nodeEnv: env.NODE_ENV,
    redisUrl: env.REDIS_URL.replace(/\/\/.*@/, '//***@'), // Mask credentials
  })

  // Set up health check dependencies
  setHealthCheckDependencies(connection, getQueueMetrics)

  // Start health check server
  healthServer = startHealthServer()

  // Schedule recurring jobs
  await scheduleRecurringJobs()

  logger.info('Workers running. Press Ctrl+C to stop.')
}

start().catch((error) => {
  logger.error('Failed to start worker', { error })
  process.exit(1)
})
