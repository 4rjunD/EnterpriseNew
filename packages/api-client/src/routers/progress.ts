import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma, TaskStatus } from '@nexflow/database'

export const progressRouter = router({
  // Get burndown data for charts
  getBurndown: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().optional(),
          days: z.number().min(7).max(90).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const days = input?.days || 30

      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get progress snapshots
      const snapshots = await prisma.progressSnapshot.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(input?.projectId && { projectId: input.projectId }),
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'asc' },
      })

      // Get current totals for calculating ideal burndown
      const tasks = await prisma.task.findMany({
        where: {
          project: {
            organizationId: ctx.organizationId,
            ...(input?.projectId && { id: input.projectId }),
          },
        },
        select: {
          status: true,
          storyPoints: true,
          createdAt: true,
        },
      })

      const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
      const completedPoints = tasks
        .filter((t) => t.status === TaskStatus.DONE)
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0)
      const remainingPoints = totalPoints - completedPoints

      // Generate daily data points
      const dataPoints: Array<{
        date: string
        planned: number
        actual: number
        ideal: number
      }> = []

      // Create a map of snapshots by date
      const snapshotsByDate = new Map(
        snapshots.map((s) => [s.date.toISOString().split('T')[0], s])
      )

      // Fill in the data
      let currentDate = new Date(startDate)
      const dailyIdealBurn = totalPoints / days

      for (let i = 0; i <= days; i++) {
        const dateKey = currentDate.toISOString().split('T')[0]
        const snapshot = snapshotsByDate.get(dateKey)

        dataPoints.push({
          date: dateKey,
          planned: snapshot?.plannedPoints || 0,
          actual: snapshot?.completedPoints || 0,
          ideal: Math.max(0, totalPoints - dailyIdealBurn * i),
        })

        currentDate.setDate(currentDate.getDate() + 1)
      }

      return {
        dataPoints,
        summary: {
          totalPoints,
          completedPoints,
          remainingPoints,
          completionPercentage:
            totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
          averageVelocity:
            snapshots.length > 1
              ? Math.round(completedPoints / snapshots.length)
              : completedPoints,
        },
      }
    }),

  // Get milestone progress for tracking
  getMilestoneProgress: protectedProcedure.query(async ({ ctx }) => {
    const context = await prisma.projectContext.findUnique({
      where: { organizationId: ctx.organizationId },
    })

    if (!context || !context.milestones) {
      return { milestones: [], onTrackCount: 0, atRiskCount: 0, completedCount: 0 }
    }

    const milestones = context.milestones as any[]
    const now = new Date()

    const enrichedMilestones = milestones.map((m, index) => {
      const targetDate = new Date(m.targetDate)
      const daysRemaining = Math.ceil(
        (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      const isPast = targetDate < now

      return {
        ...m,
        index,
        targetDate,
        daysRemaining,
        isPast,
        isCompleted: m.status === 'completed',
        isAtRisk: m.status === 'at_risk' || (daysRemaining < 7 && m.status !== 'completed'),
        isOnTrack:
          m.status === 'in_progress' &&
          daysRemaining >= 7 &&
          !isPast &&
          m.status !== 'at_risk',
      }
    })

    return {
      milestones: enrichedMilestones,
      onTrackCount: enrichedMilestones.filter((m) => m.isOnTrack).length,
      atRiskCount: enrichedMilestones.filter((m) => m.isAtRisk).length,
      completedCount: enrichedMilestones.filter((m) => m.isCompleted).length,
    }
  }),

  // Get schedule alerts (behind-schedule warnings)
  getScheduleAlerts: protectedProcedure.query(async ({ ctx }) => {
    const [context, overdueTasks, stuckPRs, projects] = await Promise.all([
      prisma.projectContext.findUnique({
        where: { organizationId: ctx.organizationId },
      }),
      prisma.task.findMany({
        where: {
          project: { organizationId: ctx.organizationId },
          status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW] },
          dueDate: { lt: new Date() },
        },
        include: {
          project: { select: { name: true } },
          assignee: { select: { name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      prisma.pullRequest.findMany({
        where: {
          project: { organizationId: ctx.organizationId },
          status: 'OPEN',
          isStuck: true,
        },
        include: {
          author: { select: { name: true } },
          project: { select: { name: true } },
        },
        take: 5,
      }),
      prisma.project.findMany({
        where: {
          organizationId: ctx.organizationId,
          status: 'ACTIVE',
          targetDate: {
            lt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Within 2 weeks
          },
        },
        select: {
          id: true,
          name: true,
          targetDate: true,
          _count: {
            select: {
              tasks: { where: { status: { not: TaskStatus.DONE } } },
            },
          },
        },
      }),
    ])

    const alerts: Array<{
      type: 'overdue_task' | 'stuck_pr' | 'at_risk_milestone' | 'deadline_approaching'
      severity: 'warning' | 'critical'
      title: string
      description: string
      link?: string
      data?: any
    }> = []

    // Add overdue task alerts
    for (const task of overdueTasks) {
      const daysOverdue = Math.ceil(
        (Date.now() - new Date(task.dueDate!).getTime()) / (1000 * 60 * 60 * 24)
      )
      alerts.push({
        type: 'overdue_task',
        severity: daysOverdue > 3 ? 'critical' : 'warning',
        title: `Task overdue: ${task.title}`,
        description: `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue in ${task.project?.name || 'Unknown'}`,
        data: { taskId: task.id, daysOverdue },
      })
    }

    // Add stuck PR alerts
    for (const pr of stuckPRs) {
      alerts.push({
        type: 'stuck_pr',
        severity: 'warning',
        title: `PR stuck: ${pr.title}`,
        description: `By ${pr.author?.name || 'Unknown'} in ${pr.project?.name || 'Unknown'}`,
        link: pr.url,
        data: { prId: pr.id },
      })
    }

    // Add at-risk milestone alerts
    if (context?.milestones) {
      const milestones = context.milestones as any[]
      for (const m of milestones) {
        if (m.status === 'at_risk' || (m.status !== 'completed' && new Date(m.targetDate) < new Date())) {
          alerts.push({
            type: 'at_risk_milestone',
            severity: 'critical',
            title: `Milestone at risk: ${m.name}`,
            description: new Date(m.targetDate) < new Date()
              ? 'Milestone target date has passed'
              : `Target: ${new Date(m.targetDate).toLocaleDateString()}`,
            data: { milestone: m },
          })
        }
      }
    }

    // Add deadline approaching alerts
    for (const project of projects) {
      const daysUntil = Math.ceil(
        (new Date(project.targetDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      if (daysUntil <= 14 && project._count.tasks > 0) {
        alerts.push({
          type: 'deadline_approaching',
          severity: daysUntil <= 7 ? 'critical' : 'warning',
          title: `Deadline approaching: ${project.name}`,
          description: `${daysUntil} days left, ${project._count.tasks} tasks remaining`,
          data: { projectId: project.id, daysUntil, tasksRemaining: project._count.tasks },
        })
      }
    }

    // Sort by severity
    alerts.sort((a, b) => (a.severity === 'critical' ? -1 : 1))

    return {
      alerts,
      counts: {
        total: alerts.length,
        critical: alerts.filter((a) => a.severity === 'critical').length,
        warning: alerts.filter((a) => a.severity === 'warning').length,
      },
    }
  }),

  // Record daily progress snapshot (called by worker)
  recordSnapshot: protectedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tasks = await prisma.task.findMany({
        where: {
          project: {
            organizationId: ctx.organizationId,
            ...(input?.projectId && { id: input.projectId }),
          },
        },
        select: {
          status: true,
          storyPoints: true,
        },
      })

      const totalTasks = tasks.length
      const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE).length
      const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
      const completedPoints = tasks
        .filter((t) => t.status === TaskStatus.DONE)
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0)

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const projectId = input?.projectId ?? undefined

      // Handle upsert with optional projectId
      const existing = await prisma.progressSnapshot.findFirst({
        where: {
          organizationId: ctx.organizationId,
          projectId: projectId ?? null,
          date: today,
        },
      })

      if (existing) {
        return prisma.progressSnapshot.update({
          where: { id: existing.id },
          data: {
            plannedTasks: totalTasks,
            completedTasks,
            plannedPoints: totalPoints,
            completedPoints,
            totalScope: totalTasks,
          },
        })
      }

      return prisma.progressSnapshot.create({
        data: {
          organizationId: ctx.organizationId,
          projectId: projectId ?? null,
          date: today,
          plannedTasks: totalTasks,
          completedTasks,
          plannedPoints: totalPoints,
          completedPoints,
          totalScope: totalTasks,
        },
      })
    }),

  // Get AI recommendations for schedule recovery
  getAIRecommendations: protectedProcedure.query(async ({ ctx }) => {
    // Get current state
    const [alerts, tasks, context] = await Promise.all([
      prisma.bottleneck.findMany({
        where: {
          project: { organizationId: ctx.organizationId },
          status: 'ACTIVE',
        },
        include: {
          task: { select: { title: true, assignee: { select: { name: true } } } },
          pullRequest: { select: { title: true, author: { select: { name: true } } } },
        },
        orderBy: { severity: 'desc' },
        take: 5,
      }),
      prisma.task.findMany({
        where: {
          project: { organizationId: ctx.organizationId },
          status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
          dueDate: { lt: new Date() },
        },
        select: { id: true, title: true, storyPoints: true },
        take: 5,
      }),
      prisma.projectContext.findUnique({
        where: { organizationId: ctx.organizationId },
      }),
    ])

    const recommendations: Array<{
      type: 'scope_reduction' | 'resource_reallocation' | 'deadline_adjustment' | 'process_improvement'
      priority: 'high' | 'medium' | 'low'
      title: string
      description: string
      impact: string
      action?: string
    }> = []

    // Generate recommendations based on bottlenecks
    if (alerts.length > 0) {
      const criticalBlockers = alerts.filter((a) => a.severity === 'CRITICAL')
      if (criticalBlockers.length > 0) {
        recommendations.push({
          type: 'resource_reallocation',
          priority: 'high',
          title: 'Address critical blockers immediately',
          description: `${criticalBlockers.length} critical blocker(s) are impacting progress. Consider reassigning tasks or pairing up.`,
          impact: 'Could recover 2-3 days of schedule slippage',
          action: 'Review bottlenecks tab for details',
        })
      }

      const reviewDelays = alerts.filter((a) => a.type === 'REVIEW_DELAY')
      if (reviewDelays.length >= 2) {
        recommendations.push({
          type: 'process_improvement',
          priority: 'medium',
          title: 'Optimize code review process',
          description: `${reviewDelays.length} PRs are stuck in review. Consider daily review sessions or rotating reviewers.`,
          impact: 'Could reduce PR cycle time by 30%',
        })
      }
    }

    // Generate recommendations based on overdue tasks
    if (tasks.length > 0) {
      const totalOverduePoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 1), 0)

      if (tasks.length >= 3) {
        recommendations.push({
          type: 'scope_reduction',
          priority: 'high',
          title: 'Consider scope reduction',
          description: `${tasks.length} overdue tasks (${totalOverduePoints} points) may indicate scope creep. Review and reprioritize.`,
          impact: 'Bring schedule back on track',
          action: 'Review tasks marked as overdue',
        })
      }

      recommendations.push({
        type: 'deadline_adjustment',
        priority: 'medium',
        title: 'Realign task deadlines',
        description: 'Set realistic deadlines for overdue tasks to improve visibility and planning.',
        impact: 'Better predictability and team morale',
      })
    }

    // If at-risk milestones exist
    if (context?.milestones) {
      const milestones = context.milestones as any[]
      const atRiskMilestones = milestones.filter((m) => m.status === 'at_risk')

      if (atRiskMilestones.length > 0) {
        recommendations.push({
          type: 'scope_reduction',
          priority: 'high',
          title: 'Revisit milestone scope',
          description: `${atRiskMilestones.length} milestone(s) are at risk. Consider MVP approach - what's the minimum needed?`,
          impact: 'Meet critical deadlines with core features',
          action: 'Update milestones in Context tab',
        })
      }
    }

    // Default recommendation if everything looks good
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'process_improvement',
        priority: 'low',
        title: 'Progress looks healthy!',
        description: 'No immediate actions needed. Consider documenting what\'s working well.',
        impact: 'Maintain current velocity',
      })
    }

    return {
      recommendations,
      generatedAt: new Date(),
    }
  }),
})

export type ProgressRouter = typeof progressRouter
