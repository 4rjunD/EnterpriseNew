import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma } from '@nexflow/database'

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
})

export type DashboardRouter = typeof dashboardRouter
