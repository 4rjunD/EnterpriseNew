import { z } from 'zod'
import { router, adminProcedure, managerProcedure } from '../trpc'
import { prisma, AgentType, AgentActionStatus } from '@nexflow/database'
import { BottleneckDetector, PredictionEngine, AgentExecutor } from '@nexflow/ai'
import { GitHubClient, LinearClient, DiscordClient } from '@nexflow/integrations'

const agentNames: Record<string, { name: string; description: string }> = {
  TASK_REASSIGNER: {
    name: 'Task Reassigner',
    description: 'Automatically reassigns tasks from overloaded team members',
  },
  NUDGE_SENDER: {
    name: 'Nudge Sender',
    description: 'Sends reminders for stuck PRs and stale tasks',
  },
  SCOPE_ADJUSTER: {
    name: 'Scope Adjuster',
    description: 'Suggests scope changes when deadlines are at risk',
  },
}

export const agentsRouter = router({
  listConfigs: managerProcedure.query(async ({ ctx }) => {
    const configs = await prisma.agentConfig.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        _count: {
          select: {
            actions: { where: { status: 'PENDING' } },
          },
        },
      },
      orderBy: { type: 'asc' },
    })

    return configs.map(config => ({
      id: config.id,
      type: config.type,
      name: agentNames[config.type]?.name || config.type,
      description: agentNames[config.type]?.description || '',
      enabled: config.enabled,
      autoApprove: config.autoApprove,
      thresholds: config.thresholds as Record<string, number> | null,
      quietHours: config.quietHours as { start: number; end: number } | null,
      pendingActions: config._count.actions,
    }))
  }),

  updateConfig: adminProcedure
    .input(z.object({
      type: z.string(),
      enabled: z.boolean().optional(),
      autoApprove: z.boolean().optional(),
      thresholds: z.record(z.unknown()).optional(),
      quietHours: z.object({ start: z.number(), end: z.number() }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { type, ...data } = input
      return prisma.agentConfig.update({
        where: {
          organizationId_type: {
            organizationId: ctx.organizationId,
            type: type as AgentType,
          },
        },
        data: {
          ...(data.enabled !== undefined && { enabled: data.enabled }),
          ...(data.autoApprove !== undefined && { autoApprove: data.autoApprove }),
          ...(data.thresholds && { thresholds: data.thresholds as object }),
          ...(data.quietHours && { quietHours: data.quietHours as object }),
        },
      })
    }),

  getPendingActions: managerProcedure.query(async ({ ctx }) => {
    const actions = await prisma.agentAction.findMany({
      where: {
        agentConfig: { organizationId: ctx.organizationId },
        status: 'PENDING',
      },
      include: {
        agentConfig: { select: { type: true } },
        targetUser: { select: { id: true, name: true } },
        bottleneck: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return actions.map(action => ({
      id: action.id,
      agentType: action.agentConfig.type,
      action: action.action,
      status: action.status,
      description: formatActionDescription(action),
      reason: action.reasoning,
      impact: formatImpact(action),
      createdAt: action.createdAt,
      targetUser: action.targetUser,
    }))
  }),

  getRecentActions: managerProcedure
    .input(z.object({ limit: z.number().default(20) }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const actions = await prisma.agentAction.findMany({
        where: {
          agentConfig: { organizationId: ctx.organizationId },
          status: { in: ['EXECUTED', 'APPROVED', 'REJECTED'] },
        },
        include: {
          agentConfig: { select: { type: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: input.limit,
      })

      return actions.map(action => ({
        id: action.id,
        agentType: action.agentConfig.type,
        action: action.action,
        status: action.status,
        description: formatActionDescription(action),
        executedAt: action.executedAt || action.approvedAt || action.updatedAt,
      }))
    }),

  approveAction: managerProcedure
    .input(z.object({ actionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.agentAction.update({
        where: { id: input.actionId },
        data: {
          status: 'APPROVED',
          approvedBy: ctx.userId,
          approvedAt: new Date(),
        },
      })
      return { success: true }
    }),

  rejectAction: managerProcedure
    .input(z.object({ actionId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      await prisma.agentAction.update({
        where: { id: input.actionId },
        data: {
          status: 'REJECTED',
          result: input.reason ? { rejectionReason: input.reason } : undefined,
        },
      })
      return { success: true }
    }),

  // Get activity feed for AI activity widget
  getActivityFeed: managerProcedure
    .input(z.object({ limit: z.number().default(10) }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const actions = await prisma.agentAction.findMany({
        where: {
          agentConfig: { organizationId: ctx.organizationId },
        },
        include: {
          agentConfig: { select: { type: true } },
          targetUser: { select: { name: true } },
          bottleneck: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      })

      return actions.map((action) => {
        const suggestion = action.suggestion as Record<string, string> | null
        let description = action.reasoning || action.action

        if (action.action === 'reassign' && suggestion?.taskTitle) {
          description = `Reassigned "${suggestion.taskTitle}"`
        } else if (action.action === 'nudge') {
          description = `Sent reminder for ${action.bottleneck?.title || 'blocked item'}`
        } else if (action.action === 'scope_adjust') {
          description = `Suggested scope adjustment`
        }

        return {
          id: action.id,
          agentType: action.agentConfig.type,
          action: action.action,
          status: action.status,
          description,
          targetUser: action.targetUser?.name,
          createdAt: action.createdAt,
          executedAt: action.executedAt,
        }
      })
    }),

  getStats: managerProcedure.query(async ({ ctx }) => {
    const [allActions, executedActions, byAgent] = await Promise.all([
      prisma.agentAction.count({
        where: { agentConfig: { organizationId: ctx.organizationId } },
      }),
      prisma.agentAction.count({
        where: {
          agentConfig: { organizationId: ctx.organizationId },
          status: 'EXECUTED',
        },
      }),
      prisma.agentAction.groupBy({
        by: ['agentConfigId'],
        where: {
          agentConfig: { organizationId: ctx.organizationId },
          status: 'EXECUTED',
        },
        _count: { id: true },
      }),
    ])

    // Get agent types for the groupBy results
    const agentConfigs = await prisma.agentConfig.findMany({
      where: { organizationId: ctx.organizationId },
      select: { id: true, type: true },
    })

    const configTypeMap = Object.fromEntries(agentConfigs.map(c => [c.id, c.type]))
    const byAgentType = byAgent.reduce((acc, a) => {
      const type = configTypeMap[a.agentConfigId]
      if (type) {
        acc[type] = a._count.id
      }
      return acc
    }, {} as Record<string, number>)

    const acceptanceRate = allActions > 0 ? Math.round((executedActions / allActions) * 100) : 0
    const hoursSaved = Math.round(executedActions * 2.5)

    // Count actions from last 7 days
    const actionsThisWeek = await prisma.agentAction.count({
      where: {
        agentConfig: { organizationId: ctx.organizationId },
        status: 'EXECUTED',
        executedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    })

    return {
      totalActions: allActions,
      acceptanceRate,
      hoursSaved,
      actionsThisWeek,
      byAgent: byAgentType,
    }
  }),

  runAnalysis: managerProcedure.mutation(async ({ ctx }) => {
    const steps: Array<{ step: string; status: 'success' | 'error'; detail: string }> = []

    // Step 1: Sync all connected integrations
    try {
      const integrations = await prisma.integration.findMany({
        where: { organizationId: ctx.organizationId, status: 'CONNECTED' },
      })

      let totalSynced = 0
      for (const integration of integrations) {
        try {
          let result: { itemsSynced: number }
          switch (integration.type) {
            case 'GITHUB':
              result = await new GitHubClient(ctx.organizationId).sync()
              break
            case 'LINEAR':
              result = await new LinearClient(ctx.organizationId).sync()
              break
            case 'DISCORD':
              result = await new DiscordClient(ctx.organizationId).sync()
              break
            default:
              continue
          }
          totalSynced += result.itemsSynced
        } catch (e) {
          console.error(`Sync failed for ${integration.type}:`, e)
        }
      }
      steps.push({ step: 'sync', status: 'success', detail: `Synced ${totalSynced} items from ${integrations.length} integration(s)` })
    } catch (e) {
      steps.push({ step: 'sync', status: 'error', detail: String(e) })
    }

    // Step 2: Detect bottlenecks
    try {
      const detector = new BottleneckDetector(ctx.organizationId)
      await detector.runDetection()
      const activeCount = await prisma.bottleneck.count({
        where: { project: { organizationId: ctx.organizationId }, status: 'ACTIVE' },
      })
      steps.push({ step: 'bottlenecks', status: 'success', detail: `${activeCount} active bottleneck(s) detected` })
    } catch (e) {
      steps.push({ step: 'bottlenecks', status: 'error', detail: String(e) })
    }

    // Step 3: Run predictions
    try {
      // Org-level predictions (velocity, burnout)
      const orgEngine = new PredictionEngine({ organizationId: ctx.organizationId })
      await orgEngine.forecastVelocity()
      await orgEngine.detectBurnoutIndicators()

      // Per-project predictions
      const projects = await prisma.project.findMany({
        where: { organizationId: ctx.organizationId, status: 'ACTIVE' },
        select: { id: true },
      })

      for (const project of projects) {
        const engine = new PredictionEngine({ organizationId: ctx.organizationId, projectId: project.id })
        await engine.runAllPredictions()
      }

      const predictionCount = await prisma.prediction.count({
        where: { project: { organizationId: ctx.organizationId }, isActive: true },
      })
      steps.push({ step: 'predictions', status: 'success', detail: `${predictionCount} active prediction(s) generated` })
    } catch (e) {
      steps.push({ step: 'predictions', status: 'error', detail: String(e) })
    }

    // Step 4: Run agents
    try {
      const executor = new AgentExecutor()
      await executor.runAllAgents(ctx.organizationId)
      const pendingActions = await prisma.agentAction.count({
        where: { agentConfig: { organizationId: ctx.organizationId }, status: 'PENDING' },
      })
      steps.push({ step: 'agents', status: 'success', detail: `${pendingActions} pending action(s) created` })
    } catch (e) {
      steps.push({ step: 'agents', status: 'error', detail: String(e) })
    }

    return {
      success: steps.every(s => s.status === 'success'),
      steps,
      completedAt: new Date(),
    }
  }),
})

function formatActionDescription(action: {
  action: string
  suggestion?: unknown
  reasoning?: string | null
}): string {
  const suggestion = action.suggestion as Record<string, string> | null
  if (suggestion?.taskTitle && suggestion?.fromUser && suggestion?.toUser) {
    return `Reassign "${suggestion.taskTitle}" from ${suggestion.fromUser} to ${suggestion.toUser}`
  }
  return action.reasoning || action.action
}

function formatImpact(action: { action: string; suggestion?: unknown }): string {
  if (action.action === 'reassign') {
    return 'Estimated improvement in delivery time'
  }
  if (action.action === 'nudge') {
    return 'Reminder to unblock progress'
  }
  return 'Potential improvement'
}

export type AgentsRouter = typeof agentsRouter
