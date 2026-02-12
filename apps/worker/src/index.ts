import { Worker, Queue, Job } from 'bullmq'
import Redis from 'ioredis'
import { prisma, NotificationType } from '@nexflow/database'
import { BottleneckDetector, PredictionEngine, AgentExecutor, AgentCore } from '@nexflow/ai'
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
export const progressQueue = new Queue('progress', { connection, defaultJobOptions })
export const heartbeatQueue = new Queue('heartbeat', { connection, defaultJobOptions })

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

    // Schedule daily progress snapshots at midnight
    await progressQueue.add(
      `progress-${org.id}`,
      { organizationId: org.id },
      {
        repeat: { pattern: '0 0 * * *' }, // Daily at midnight
        ...defaultJobOptions,
      }
    )

    // Schedule daily briefing heartbeat
    // Get org's heartbeat config to use their preferred time
    const heartbeatConfig = await prisma.heartbeatConfig.findUnique({
      where: { organizationId: org.id },
    })

    const briefingTime = heartbeatConfig?.dailyBriefingTime ?? '09:00'
    const [briefingHour, briefingMinute] = briefingTime.split(':').map(Number)
    const briefingDays = heartbeatConfig?.dailyBriefingDays ?? ['MON', 'TUE', 'WED', 'THU', 'FRI']

    // Convert days to cron format (0-6, where 0 is Sunday)
    const dayMap: Record<string, number> = {
      SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6
    }
    const cronDays = briefingDays.map(d => dayMap[d]).filter(d => d !== undefined).join(',')

    if (cronDays) {
      await heartbeatQueue.add(
        `briefing-${org.id}`,
        { organizationId: org.id, type: 'daily_briefing' },
        {
          repeat: { pattern: `${briefingMinute} ${briefingHour} * * ${cronDays}` },
          ...defaultJobOptions,
        }
      )
    }

    // Schedule milestone check daily at 10 AM
    await heartbeatQueue.add(
      `milestone-check-${org.id}`,
      { organizationId: org.id, type: 'milestone_check' },
      {
        repeat: { pattern: '0 10 * * *' },
        ...defaultJobOptions,
      }
    )
  }

  logger.info('Recurring jobs scheduled')
}

// Queue metrics getter for health checks
async function getQueueMetrics() {
  const [syncCounts, analysisCounts, agentCounts, progressCounts, heartbeatCounts] = await Promise.all([
    syncQueue.getJobCounts(),
    analysisQueue.getJobCounts(),
    agentQueue.getJobCounts(),
    progressQueue.getJobCounts(),
    heartbeatQueue.getJobCounts(),
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
    progress: {
      waiting: progressCounts.waiting,
      active: progressCounts.active,
      completed: progressCounts.completed,
      failed: progressCounts.failed,
    },
    heartbeat: {
      waiting: heartbeatCounts.waiting,
      active: heartbeatCounts.active,
      completed: heartbeatCounts.completed,
      failed: heartbeatCounts.failed,
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

// Progress worker - handles daily progress snapshots
const progressWorker = new Worker(
  'progress',
  withJobTiming('progress', async (job) => {
    const { organizationId, projectId } = job.data

    // Calculate daily progress snapshot
    const tasks = await prisma.task.findMany({
      where: {
        project: {
          organizationId,
          ...(projectId && { id: projectId }),
        },
      },
      select: {
        status: true,
        storyPoints: true,
      },
    })

    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.status === 'DONE').length
    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
    const completedPoints = tasks
      .filter((t) => t.status === 'DONE')
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.progressSnapshot.upsert({
      where: {
        organizationId_projectId_date: {
          organizationId,
          projectId: projectId || null,
          date: today,
        },
      },
      update: {
        plannedTasks: totalTasks,
        completedTasks,
        plannedPoints: totalPoints,
        completedPoints,
        totalScope: totalTasks,
      },
      create: {
        organizationId,
        projectId: projectId || null,
        date: today,
        plannedTasks: totalTasks,
        completedTasks,
        plannedPoints: totalPoints,
        completedPoints,
        totalScope: totalTasks,
      },
    })

    logger.job.progress('progress', job.id || 'unknown', `Recorded progress snapshot`, {
      organizationId,
      totalTasks,
      completedTasks,
    })

    return { success: true }
  }),
  { connection, concurrency: 2 }
)

progressWorker.on('completed', (job) => {
  logger.debug(`Progress job ${job.id} completed`)
})

progressWorker.on('failed', (job, err) => {
  logger.error(`Progress job ${job?.id} failed`, { error: err, attempt: job?.attemptsMade })
})

progressWorker.on('stalled', (jobId) => {
  logger.warn(`Progress job ${jobId} stalled`)
})

// Heartbeat worker - handles daily briefings and proactive alerts
const heartbeatWorker = new Worker(
  'heartbeat',
  withJobTiming('heartbeat', async (job) => {
    const { organizationId, type, configOverride } = job.data

    // Get heartbeat config
    const config = await prisma.heartbeatConfig.findUnique({
      where: { organizationId },
    })

    // Use defaults if no config
    const effectiveConfig = {
      enabled: config?.enabled ?? true,
      dailyBriefingEnabled: config?.dailyBriefingEnabled ?? true,
      alertOnBlockers: config?.alertOnBlockers ?? true,
      alertOnRisks: config?.alertOnRisks ?? true,
      alertOnMilestones: config?.alertOnMilestones ?? true,
      webNotifications: config?.webNotifications ?? true,
      slackChannelId: config?.slackChannelId,
      discordChannelId: config?.discordChannelId,
      quietHoursStart: config?.quietHoursStart,
      quietHoursEnd: config?.quietHoursEnd,
      timezone: config?.timezone ?? 'UTC',
      ...configOverride,
    }

    if (!effectiveConfig.enabled) {
      logger.info(`Heartbeat disabled for org ${organizationId}`)
      return { success: true, skipped: true }
    }

    // Check quiet hours
    if (effectiveConfig.quietHoursStart && effectiveConfig.quietHoursEnd) {
      const isQuietTime = checkQuietHours(
        effectiveConfig.quietHoursStart,
        effectiveConfig.quietHoursEnd,
        effectiveConfig.timezone
      )
      if (isQuietTime && type !== 'force_briefing') {
        logger.info(`In quiet hours for org ${organizationId}, skipping heartbeat`)
        return { success: true, skipped: true }
      }
    }

    switch (type) {
      case 'daily_briefing':
      case 'force_briefing':
        if (!effectiveConfig.dailyBriefingEnabled && type !== 'force_briefing') {
          return { success: true, skipped: true }
        }
        await sendDailyBriefing(organizationId, effectiveConfig)
        break

      case 'blocker_alert':
        if (!effectiveConfig.alertOnBlockers) {
          return { success: true, skipped: true }
        }
        await sendBlockerAlert(organizationId, job.data.bottleneckId, effectiveConfig)
        break

      case 'risk_alert':
        if (!effectiveConfig.alertOnRisks) {
          return { success: true, skipped: true }
        }
        await sendRiskAlert(organizationId, job.data.predictionId, effectiveConfig)
        break

      case 'milestone_alert':
        if (!effectiveConfig.alertOnMilestones) {
          return { success: true, skipped: true }
        }
        await sendMilestoneAlert(organizationId, job.data.milestoneName, effectiveConfig)
        break

      default:
        throw new Error(`Unknown heartbeat type: ${type}`)
    }

    return { success: true }
  }),
  { connection, concurrency: 2 }
)

heartbeatWorker.on('completed', (job) => {
  logger.debug(`Heartbeat job ${job.id} completed`)
})

heartbeatWorker.on('failed', (job, err) => {
  logger.error(`Heartbeat job ${job?.id} failed`, { error: err, attempt: job?.attemptsMade })
})

heartbeatWorker.on('stalled', (jobId) => {
  logger.warn(`Heartbeat job ${jobId} stalled`)
})

// Helper to check if current time is within quiet hours
function checkQuietHours(start: string, end: string, timezone: string): boolean {
  try {
    // Simple hour-based check (in production, use proper timezone library)
    const now = new Date()
    const [startHour] = start.split(':').map(Number)
    const [endHour] = end.split(':').map(Number)
    const currentHour = now.getHours()

    if (startHour < endHour) {
      return currentHour >= startHour && currentHour < endHour
    } else {
      // Overnight range (e.g., 22:00 - 08:00)
      return currentHour >= startHour || currentHour < endHour
    }
  } catch {
    return false
  }
}

// Send daily briefing
async function sendDailyBriefing(
  organizationId: string,
  config: { webNotifications: boolean; slackChannelId?: string | null; discordChannelId?: string | null }
) {
  const agent = new AgentCore({
    organizationId,
    channel: 'API',
  })

  const briefing = await agent.generateBriefing()

  // Send to web notifications (all admins/managers)
  if (config.webNotifications) {
    const managers = await prisma.user.findMany({
      where: {
        organizationId,
        role: { in: ['ADMIN', 'MANAGER'] },
      },
      select: { id: true },
    })

    await prisma.notification.createMany({
      data: managers.map((m) => ({
        userId: m.id,
        type: NotificationType.AGENT_SUGGESTION,
        title: 'Daily Briefing',
        message: briefing.length > 200 ? briefing.slice(0, 200) + '...' : briefing,
        data: { fullBriefing: briefing, type: 'daily_briefing' },
      })),
    })
  }

  // Send to Slack
  if (config.slackChannelId) {
    await postToSlackChannel(config.slackChannelId, briefing)
  }

  // Send to Discord
  if (config.discordChannelId) {
    await postToDiscordChannel(config.discordChannelId, briefing)
  }

  logger.info(`Sent daily briefing for org ${organizationId}`)
}

// Send blocker alert
async function sendBlockerAlert(
  organizationId: string,
  bottleneckId: string,
  config: { webNotifications: boolean; slackChannelId?: string | null; discordChannelId?: string | null }
) {
  const bottleneck = await prisma.bottleneck.findUnique({
    where: { id: bottleneckId },
    include: {
      task: { include: { assignee: true } },
      pullRequest: { include: { author: true } },
    },
  })

  if (!bottleneck || bottleneck.status !== 'ACTIVE') {
    return
  }

  const message = formatBlockerAlert(bottleneck)

  // Notify relevant users
  const usersToNotify: string[] = []
  if (bottleneck.task?.assigneeId) {
    usersToNotify.push(bottleneck.task.assigneeId)
  }
  if (bottleneck.pullRequest?.authorId) {
    usersToNotify.push(bottleneck.pullRequest.authorId)
  }

  // Also notify managers
  const managers = await prisma.user.findMany({
    where: { organizationId, role: { in: ['ADMIN', 'MANAGER'] } },
    select: { id: true },
  })
  usersToNotify.push(...managers.map((m) => m.id))

  // Dedupe
  const uniqueUsers = [...new Set(usersToNotify)]

  if (config.webNotifications) {
    await prisma.notification.createMany({
      data: uniqueUsers.map((userId) => ({
        userId,
        type: NotificationType.BOTTLENECK_DETECTED,
        title: `Blocker: ${bottleneck.title}`,
        message: message.slice(0, 200),
        data: { bottleneckId, severity: bottleneck.severity },
      })),
    })
  }

  // Send to Slack/Discord
  if (config.slackChannelId) {
    await postToSlackChannel(config.slackChannelId, message)
  }
  if (config.discordChannelId) {
    await postToDiscordChannel(config.discordChannelId, message)
  }
}

// Send risk alert
async function sendRiskAlert(
  organizationId: string,
  predictionId: string,
  config: { webNotifications: boolean; slackChannelId?: string | null; discordChannelId?: string | null }
) {
  const prediction = await prisma.prediction.findUnique({
    where: { id: predictionId },
  })

  if (!prediction || !prediction.isActive) {
    return
  }

  const message = formatRiskAlert(prediction)

  // Notify managers
  if (config.webNotifications) {
    const managers = await prisma.user.findMany({
      where: { organizationId, role: { in: ['ADMIN', 'MANAGER'] } },
      select: { id: true },
    })

    await prisma.notification.createMany({
      data: managers.map((m) => ({
        userId: m.id,
        type: NotificationType.PREDICTION_ALERT,
        title: `Risk Alert: ${prediction.type}`,
        message: message.slice(0, 200),
        data: { predictionId, type: prediction.type, confidence: prediction.confidence },
      })),
    })
  }

  if (config.slackChannelId) {
    await postToSlackChannel(config.slackChannelId, message)
  }
  if (config.discordChannelId) {
    await postToDiscordChannel(config.discordChannelId, message)
  }
}

// Send milestone alert
async function sendMilestoneAlert(
  organizationId: string,
  milestoneName: string,
  config: { webNotifications: boolean; slackChannelId?: string | null; discordChannelId?: string | null }
) {
  const ctx = await prisma.projectContext.findFirst({
    where: { organizationId },
  })

  if (!ctx?.milestones) return

  const milestones = ctx.milestones as Array<{ name: string; targetDate: string; status?: string }>
  const milestone = milestones.find((m) => m.name === milestoneName)

  if (!milestone) return

  const targetDate = new Date(milestone.targetDate)
  const daysRemaining = Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  let message: string
  if (daysRemaining < 0) {
    message = `Milestone "${milestoneName}" is ${Math.abs(daysRemaining)} day(s) overdue!`
  } else if (daysRemaining === 0) {
    message = `Milestone "${milestoneName}" is due today!`
  } else if (daysRemaining <= 3) {
    message = `Milestone "${milestoneName}" is due in ${daysRemaining} day(s).`
  } else if (daysRemaining <= 7) {
    message = `Milestone "${milestoneName}" is approaching (${daysRemaining} days remaining).`
  } else {
    return // Don't alert for milestones > 7 days out
  }

  if (config.webNotifications) {
    const managers = await prisma.user.findMany({
      where: { organizationId, role: { in: ['ADMIN', 'MANAGER'] } },
      select: { id: true },
    })

    await prisma.notification.createMany({
      data: managers.map((m) => ({
        userId: m.id,
        type: NotificationType.DEADLINE_APPROACHING,
        title: 'Milestone Alert',
        message,
        data: { milestoneName, daysRemaining },
      })),
    })
  }

  if (config.slackChannelId) {
    await postToSlackChannel(config.slackChannelId, message)
  }
  if (config.discordChannelId) {
    await postToDiscordChannel(config.discordChannelId, message)
  }
}

function formatBlockerAlert(bottleneck: {
  title: string
  description: string | null
  severity: string
  type: string
  task?: { title: string; assignee?: { name: string | null } | null } | null
  pullRequest?: { number: number; title: string; author?: { name: string | null } | null } | null
}): string {
  const parts: string[] = []
  parts.push(`[${bottleneck.severity}] ${bottleneck.title}`)

  if (bottleneck.description) {
    parts.push(bottleneck.description)
  }

  if (bottleneck.task) {
    parts.push(`Related task: "${bottleneck.task.title}" (${bottleneck.task.assignee?.name ?? 'unassigned'})`)
  }

  if (bottleneck.pullRequest) {
    parts.push(`Related PR: #${bottleneck.pullRequest.number} by ${bottleneck.pullRequest.author?.name ?? 'unknown'}`)
  }

  return parts.join('\n')
}

function formatRiskAlert(prediction: {
  type: string
  confidence: number
  value: unknown
  reasoning: string | null
}): string {
  const parts: string[] = []
  parts.push(`Risk Type: ${prediction.type}`)
  parts.push(`Confidence: ${Math.round(prediction.confidence * 100)}%`)

  if (prediction.reasoning) {
    parts.push(prediction.reasoning)
  }

  return parts.join('\n')
}

// Slack posting helper
async function postToSlackChannel(channelId: string, message: string) {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) {
    logger.warn('SLACK_BOT_TOKEN not configured, skipping Slack notification')
    return
  }

  try {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        text: message,
      }),
    })
  } catch (error) {
    logger.error('Failed to post to Slack', { error })
  }
}

// Discord posting helper
async function postToDiscordChannel(channelId: string, message: string) {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) {
    logger.warn('DISCORD_BOT_TOKEN not configured, skipping Discord notification')
    return
  }

  try {
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
      }),
    })
  } catch (error) {
    logger.error('Failed to post to Discord', { error })
  }
}

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
    progressWorker.close(),
    heartbeatWorker.close(),
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
