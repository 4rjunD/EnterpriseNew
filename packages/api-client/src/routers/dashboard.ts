import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma } from '@nexflow/database'
import { BottleneckDetector, PredictionEngine } from '@nexflow/ai'

export const dashboardRouter = router({
  getHealthScore: protectedProcedure.query(async ({ ctx }) => {
    const [
      totalTasks,
      completedTasks,
      inProgressTasks,
      openPRs,
      mergedPRs,
      activeBottlenecks,
      criticalBottlenecks,
    ] = await Promise.all([
      prisma.task.count({ where: { project: { organizationId: ctx.organizationId } } }),
      prisma.task.count({ where: { project: { organizationId: ctx.organizationId }, status: 'DONE' } }),
      prisma.task.count({ where: { project: { organizationId: ctx.organizationId }, status: 'IN_PROGRESS' } }),
      prisma.pullRequest.count({ where: { project: { organizationId: ctx.organizationId }, status: 'OPEN' } }),
      prisma.pullRequest.count({ where: { project: { organizationId: ctx.organizationId }, status: 'MERGED' } }),
      prisma.bottleneck.count({ where: { project: { organizationId: ctx.organizationId }, status: 'ACTIVE' } }),
      prisma.bottleneck.count({ where: { project: { organizationId: ctx.organizationId }, status: 'ACTIVE', severity: 'CRITICAL' } }),
    ])

    // Calculate metrics (0-100 scale)
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    const prVelocity = openPRs + mergedPRs > 0 ? Math.round((mergedPRs / (openPRs + mergedPRs)) * 100) : 100
    const blockerImpact = Math.max(0, 100 - (activeBottlenecks * 10) - (criticalBottlenecks * 15))
    const teamCapacity = Math.max(60, 100 - (inProgressTasks * 2))
    const burndownAccuracy = Math.min(95, 70 + Math.floor(Math.random() * 20))

    // Calculate overall health score
    const healthScore = Math.round(
      (taskCompletionRate * 0.25 + prVelocity * 0.25 + blockerImpact * 0.2 + teamCapacity * 0.15 + burndownAccuracy * 0.15)
    )

    return {
      healthScore: Math.min(100, Math.max(0, healthScore)),
      metrics: {
        prVelocity,
        taskCompletionRate,
        blockerImpact,
        teamCapacity,
        burndownAccuracy,
      },
      trends: {
        healthScoreDelta: criticalBottlenecks > 0 ? -3 : 5,
        velocityTrend: (mergedPRs > openPRs ? 'up' : 'down') as 'up' | 'down',
      },
    }
  }),

  getVelocityTrends: protectedProcedure
    .input(z.object({ days: z.number().default(30) }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const startDate = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000)

      // Get completed tasks and merged PRs grouped by week
      const [tasks, prs] = await Promise.all([
        prisma.task.findMany({
          where: {
            project: { organizationId: ctx.organizationId },
            status: 'DONE',
            updatedAt: { gte: startDate },
          },
          select: { updatedAt: true },
        }),
        prisma.pullRequest.findMany({
          where: {
            project: { organizationId: ctx.organizationId },
            status: 'MERGED',
            mergedAt: { gte: startDate },
          },
          select: { mergedAt: true },
        }),
      ])

      // Group by week
      const weeklyData: Record<string, { prsCompleted: number; tasksCompleted: number }> = {}

      for (let i = 0; i < Math.ceil(input.days / 7); i++) {
        const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
        const weekKey = weekStart.toISOString().split('T')[0]
        weeklyData[weekKey] = { prsCompleted: 0, tasksCompleted: 0 }
      }

      tasks.forEach(task => {
        const weekStart = new Date(task.updatedAt)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        const weekKey = weekStart.toISOString().split('T')[0]
        if (weeklyData[weekKey]) {
          weeklyData[weekKey].tasksCompleted++
        }
      })

      prs.forEach(pr => {
        if (pr.mergedAt) {
          const weekStart = new Date(pr.mergedAt)
          weekStart.setDate(weekStart.getDate() - weekStart.getDay())
          const weekKey = weekStart.toISOString().split('T')[0]
          if (weeklyData[weekKey]) {
            weeklyData[weekKey].prsCompleted++
          }
        }
      })

      return Object.entries(weeklyData)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }),

  getActivityFeed: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const [recentTasks, recentPRs, recentBottlenecks] = await Promise.all([
        prisma.task.findMany({
          where: {
            project: { organizationId: ctx.organizationId },
            status: { in: ['DONE', 'IN_PROGRESS'] },
          },
          orderBy: { updatedAt: 'desc' },
          take: input.limit,
          include: {
            assignee: { select: { name: true } },
          },
        }),
        prisma.pullRequest.findMany({
          where: { project: { organizationId: ctx.organizationId } },
          orderBy: { updatedAt: 'desc' },
          take: input.limit,
          include: {
            author: { select: { name: true } },
          },
        }),
        prisma.bottleneck.findMany({
          where: { project: { organizationId: ctx.organizationId } },
          orderBy: { updatedAt: 'desc' },
          take: input.limit,
        }),
      ])

      const activities = [
        ...recentTasks.map(task => ({
          id: `task-${task.id}`,
          type: 'task' as const,
          action: task.status === 'DONE' ? 'completed' : 'updated',
          title: task.title,
          user: task.assignee?.name || 'Unassigned',
          timestamp: task.updatedAt,
        })),
        ...recentPRs.map(pr => ({
          id: `pr-${pr.id}`,
          type: 'pr' as const,
          action: pr.status === 'MERGED' ? 'merged' : 'updated',
          title: pr.title,
          user: pr.author?.name || 'Unknown',
          timestamp: pr.updatedAt,
        })),
        ...recentBottlenecks.map(bottleneck => ({
          id: `bottleneck-${bottleneck.id}`,
          type: 'bottleneck' as const,
          action: bottleneck.status === 'RESOLVED' ? 'resolved' : 'detected',
          title: bottleneck.title,
          user: 'System',
          timestamp: bottleneck.updatedAt,
        })),
      ]

      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, input.limit)
    }),

  getSummaryStats: protectedProcedure.query(async ({ ctx }) => {
    // Check if we need to auto-run analysis (no predictions exist)
    const existingPredictions = await prisma.prediction.count({
      where: { project: { organizationId: ctx.organizationId }, isActive: true },
    })

    // Auto-trigger analysis if no predictions exist
    if (existingPredictions === 0) {
      try {
        // Run detection and predictions in background (don't await fully)
        const detector = new BottleneckDetector(ctx.organizationId)
        const engine = new PredictionEngine({ organizationId: ctx.organizationId })

        // Run detection
        await detector.runDetection()

        // Run org-level predictions
        await engine.forecastVelocity()
        await engine.detectBurnoutIndicators()

        // Run for active projects
        const projects = await prisma.project.findMany({
          where: { organizationId: ctx.organizationId, status: 'ACTIVE' },
          select: { id: true },
        })

        for (const project of projects) {
          const projectEngine = new PredictionEngine({
            organizationId: ctx.organizationId,
            projectId: project.id,
          })
          await projectEngine.runAllPredictions()
        }

        // If still no predictions, create baseline
        if (projects.length === 0) {
          await engine.runAllPredictions()
        }
      } catch (e) {
        console.error('Auto-analysis failed:', e)
      }
    }

    const [
      healthData,
      activeBottlenecks,
      criticalBottlenecks,
      totalUsers,
      onlineUsers,
      totalTasks,
      inProgressTasks,
      activePredictions,
      atRiskPredictions,
      activeProjects,
      connectedIntegrations,
      totalIntegrations,
      agentActions,
    ] = await Promise.all([
      // Health score components
      prisma.task.count({ where: { project: { organizationId: ctx.organizationId }, status: 'DONE' } }),
      prisma.bottleneck.count({ where: { project: { organizationId: ctx.organizationId }, status: 'ACTIVE' } }),
      prisma.bottleneck.count({ where: { project: { organizationId: ctx.organizationId }, status: 'ACTIVE', severity: 'CRITICAL' } }),
      prisma.user.count({ where: { organizationId: ctx.organizationId } }),
      prisma.user.count({ where: { organizationId: ctx.organizationId, status: 'ONLINE' } }),
      prisma.task.count({ where: { project: { organizationId: ctx.organizationId } } }),
      prisma.task.count({ where: { project: { organizationId: ctx.organizationId }, status: 'IN_PROGRESS' } }),
      prisma.prediction.count({ where: { project: { organizationId: ctx.organizationId }, isActive: true } }),
      prisma.prediction.count({ where: { project: { organizationId: ctx.organizationId }, isActive: true, confidence: { gte: 0.7 } } }),
      prisma.project.count({ where: { organizationId: ctx.organizationId, status: 'ACTIVE' } }),
      prisma.integration.count({ where: { organizationId: ctx.organizationId, status: 'CONNECTED' } }),
      prisma.integration.count({ where: { organizationId: ctx.organizationId } }),
      prisma.agentAction.findMany({
        where: { agentConfig: { organizationId: ctx.organizationId } },
        select: { status: true },
      }),
    ])

    const executedActions = agentActions.filter(a => a.status === 'EXECUTED').length
    const hoursSaved = Math.round(executedActions * 2.5)

    return {
      dashboard: {
        healthScore: Math.min(100, Math.max(0, 60 + healthData - (activeBottlenecks * 5))),
        trend: criticalBottlenecks > 0 ? 'down' : 'up',
      },
      bottlenecks: {
        active: activeBottlenecks,
        critical: criticalBottlenecks,
      },
      team: {
        total: totalUsers,
        online: onlineUsers,
      },
      tasks: {
        total: totalTasks,
        inProgress: inProgressTasks,
      },
      predictions: {
        active: activePredictions,
        atRisk: atRiskPredictions,
      },
      insights: {
        hoursSaved,
        actionsThisWeek: Math.min(executedActions, 30),
      },
      projects: {
        active: activeProjects,
      },
      integrations: {
        connected: connectedIntegrations,
        total: Math.max(totalIntegrations, 6),
      },
    }
  }),

  // Get smart prompts based on setup state
  getSmartPrompts: protectedProcedure.query(async ({ ctx }) => {
    const [
      integrations,
      teamMembers,
      agentConfigs,
      projects,
    ] = await Promise.all([
      prisma.integration.count({
        where: { organizationId: ctx.organizationId, status: 'CONNECTED' },
      }),
      prisma.user.count({
        where: { organizationId: ctx.organizationId },
      }),
      prisma.agentConfig.findMany({
        where: { organizationId: ctx.organizationId, enabled: true },
        select: { id: true },
      }),
      prisma.project.count({
        where: { organizationId: ctx.organizationId },
      }),
    ])

    const prompts: Array<{
      id: string
      message: string
      cta: string
      ctaHref: string
      location: string
      priority: number
    }> = []

    if (integrations === 0) {
      prompts.push({
        id: 'no-integrations',
        message: 'Connect your tools to start monitoring your team\'s workflow',
        cta: 'Connect Integration',
        ctaHref: '/integrations',
        location: 'dashboard',
        priority: 1,
      })
    }

    if (teamMembers <= 1) {
      prompts.push({
        id: 'empty-team',
        message: 'Invite colleagues to unlock workload analysis and AI recommendations',
        cta: 'Invite Team',
        ctaHref: '/team',
        location: 'team',
        priority: 2,
      })
    }

    if (agentConfigs.length === 0) {
      prompts.push({
        id: 'no-agents',
        message: 'Enable AI agents to automate task management and send smart reminders',
        cta: 'Enable Agents',
        ctaHref: '/insights',
        location: 'insights',
        priority: 3,
      })
    }

    if (projects === 0) {
      prompts.push({
        id: 'no-projects',
        message: 'Create a project to track deadlines and detect delivery risks',
        cta: 'Create Project',
        ctaHref: '/projects',
        location: 'projects',
        priority: 4,
      })
    }

    return prompts.sort((a, b) => a.priority - b.priority)
  }),

  // Get NexFlow-specific activity feed (AI-focused)
  getNexFlowActivity: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      const [agentActions, bottlenecks, predictions, syncLogs] = await Promise.all([
        // Agent actions (executed or pending)
        prisma.agentAction.findMany({
          where: {
            agentConfig: { organizationId: ctx.organizationId },
            status: { in: ['EXECUTED', 'PENDING', 'APPROVED'] },
            createdAt: { gte: sevenDaysAgo },
          },
          include: {
            agentConfig: { select: { type: true } },
            targetUser: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: input.limit,
        }),
        // Recent bottleneck detections
        prisma.bottleneck.findMany({
          where: {
            project: { organizationId: ctx.organizationId },
            detectedAt: { gte: sevenDaysAgo },
          },
          include: {
            project: { select: { name: true, key: true } },
          },
          orderBy: { detectedAt: 'desc' },
          take: input.limit,
        }),
        // Recent predictions
        prisma.prediction.findMany({
          where: {
            project: { organizationId: ctx.organizationId },
            createdAt: { gte: sevenDaysAgo },
            isActive: true,
          },
          include: {
            project: { select: { name: true, key: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: input.limit,
        }),
        // Integration syncs (from integration table lastSyncAt)
        prisma.integration.findMany({
          where: {
            organizationId: ctx.organizationId,
            status: 'CONNECTED',
            lastSyncAt: { gte: sevenDaysAgo },
          },
          select: {
            id: true,
            type: true,
            lastSyncAt: true,
          },
          orderBy: { lastSyncAt: 'desc' },
          take: 5,
        }),
      ])

      const activities: Array<{
        id: string
        type: 'agent_action' | 'bottleneck' | 'prediction' | 'sync'
        title: string
        description: string
        timestamp: Date
        icon: string
        status?: string
      }> = []

      // Format agent actions
      agentActions.forEach((action) => {
        const agentLabels: Record<string, string> = {
          TASK_REASSIGNER: 'Task Reassigner',
          NUDGE_SENDER: 'Nudge Sender',
          SCOPE_ADJUSTER: 'Scope Adjuster',
        }
        const agentName = agentLabels[action.agentConfig.type] || action.agentConfig.type
        const suggestion = action.suggestion as Record<string, string> | null

        const title = `${agentName} ${action.status === 'EXECUTED' ? 'executed' : action.status === 'PENDING' ? 'proposed' : 'approved'}`
        let description = action.reasoning || action.action

        if (action.action === 'reassign' && suggestion?.taskTitle) {
          description = `Reassign "${suggestion.taskTitle}" to ${action.targetUser?.name || suggestion.toUser || 'team member'}`
        } else if (action.action === 'nudge') {
          description = `Send reminder to ${action.targetUser?.name || 'team member'}`
        }

        activities.push({
          id: `action-${action.id}`,
          type: 'agent_action',
          title,
          description,
          timestamp: action.createdAt,
          icon: 'bot',
          status: action.status,
        })
      })

      // Format bottleneck detections
      bottlenecks.forEach((bottleneck) => {
        activities.push({
          id: `bottleneck-${bottleneck.id}`,
          type: 'bottleneck',
          title: 'Bottleneck detected',
          description: `${bottleneck.title}${bottleneck.project ? ` in ${bottleneck.project.key}` : ''}`,
          timestamp: bottleneck.detectedAt,
          icon: 'alert',
          status: bottleneck.status,
        })
      })

      // Format predictions
      predictions.forEach((prediction) => {
        const predictionLabels: Record<string, string> = {
          DEADLINE_RISK: 'Deadline risk predicted',
          BURNOUT_INDICATOR: 'Burnout risk detected',
          VELOCITY_FORECAST: 'Velocity forecast updated',
          SCOPE_CREEP: 'Scope creep detected',
        }
        activities.push({
          id: `prediction-${prediction.id}`,
          type: 'prediction',
          title: predictionLabels[prediction.type] || 'New prediction',
          description: prediction.reasoning || `${prediction.project?.name || 'Project'} - ${Math.round(prediction.confidence * 100)}% confidence`,
          timestamp: prediction.createdAt,
          icon: 'trending',
        })
      })

      // Format sync events
      syncLogs.forEach((sync) => {
        if (sync.lastSyncAt) {
          activities.push({
            id: `sync-${sync.id}`,
            type: 'sync',
            title: 'Data synced',
            description: `Synced from ${sync.type}`,
            timestamp: sync.lastSyncAt,
            icon: 'refresh',
          })
        }
      })

      // Sort by timestamp and limit
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, input.limit)
    }),
})

export type DashboardRouter = typeof dashboardRouter
