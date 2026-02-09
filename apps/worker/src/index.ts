import { Worker, Queue } from 'bullmq'
import Redis from 'ioredis'
import { prisma } from '@nexflow/database'
import { BottleneckDetector, PredictionEngine, AgentExecutor } from '@nexflow/ai'
import { LinearClient, GitHubClient } from '@nexflow/integrations'

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

// Queue definitions
export const syncQueue = new Queue('sync', { connection })
export const analysisQueue = new Queue('analysis', { connection })
export const agentQueue = new Queue('agents', { connection })

// Sync worker - handles integration syncs
const syncWorker = new Worker(
  'sync',
  async (job) => {
    const { organizationId, integrationType } = job.data

    console.log(`Processing sync job for ${integrationType} in org ${organizationId}`)

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
    console.log(`Sync complete: ${result.itemsSynced} items synced`)

    return result
  },
  { connection, concurrency: 5 }
)

// Analysis worker - handles bottleneck detection and predictions
const analysisWorker = new Worker(
  'analysis',
  async (job) => {
    const { organizationId, projectId, type } = job.data

    console.log(`Processing analysis job: ${type} for org ${organizationId}`)

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
  },
  { connection, concurrency: 3 }
)

// Agent worker - handles agent evaluations and executions
const agentWorker = new Worker(
  'agents',
  async (job) => {
    const { organizationId, type } = job.data

    console.log(`Processing agent job: ${type} for org ${organizationId}`)

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
  },
  { connection, concurrency: 2 }
)

// Scheduled jobs
async function scheduleRecurringJobs(): Promise<void> {
  // Get all organizations
  const orgs = await prisma.organization.findMany({
    select: { id: true },
  })

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
          removeOnComplete: 100,
          removeOnFail: 50,
        }
      )
    }

    // Schedule bottleneck detection every 30 minutes
    await analysisQueue.add(
      `bottleneck-${org.id}`,
      { organizationId: org.id, type: 'bottleneck_detection' },
      {
        repeat: { every: 30 * 60 * 1000 }, // 30 minutes
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    )

    // Schedule predictions every hour
    await analysisQueue.add(
      `predictions-${org.id}`,
      { organizationId: org.id, type: 'predictions' },
      {
        repeat: { every: 60 * 60 * 1000 }, // 1 hour
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    )

    // Schedule agent runs every 15 minutes
    await agentQueue.add(
      `agents-${org.id}`,
      { organizationId: org.id, type: 'run_agents' },
      {
        repeat: { every: 15 * 60 * 1000 }, // 15 minutes
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    )
  }
}

// Event handlers
syncWorker.on('completed', (job) => {
  console.log(`Sync job ${job.id} completed`)
})

syncWorker.on('failed', (job, err) => {
  console.error(`Sync job ${job?.id} failed:`, err)
})

analysisWorker.on('completed', (job) => {
  console.log(`Analysis job ${job.id} completed`)
})

analysisWorker.on('failed', (job, err) => {
  console.error(`Analysis job ${job?.id} failed:`, err)
})

agentWorker.on('completed', (job) => {
  console.log(`Agent job ${job.id} completed`)
})

agentWorker.on('failed', (job, err) => {
  console.error(`Agent job ${job?.id} failed:`, err)
})

// Graceful shutdown
async function shutdown(): Promise<void> {
  console.log('Shutting down workers...')
  await syncWorker.close()
  await analysisWorker.close()
  await agentWorker.close()
  await connection.quit()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Start
console.log('NexFlow Worker starting...')
scheduleRecurringJobs()
  .then(() => console.log('Recurring jobs scheduled'))
  .catch(console.error)

console.log('Workers running. Press Ctrl+C to stop.')
