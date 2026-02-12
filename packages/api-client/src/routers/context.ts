import { z } from 'zod'
import { router, protectedProcedure, managerProcedure } from '../trpc'
import { prisma, TaskStatus } from '@nexflow/database'

const milestoneSchema = z.object({
  name: z.string(),
  targetDate: z.string(),
  description: z.string().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'at_risk']).optional(),
})

export const contextRouter = router({
  // Get project context for the organization
  get: protectedProcedure.query(async ({ ctx }) => {
    const context = await prisma.projectContext.findUnique({
      where: { organizationId: ctx.organizationId },
      include: {
        milestoneProgress: {
          orderBy: [{ milestoneIndex: 'asc' }, { date: 'desc' }],
        },
      },
    })

    return context
  }),

  // Get context with computed analytics
  getWithAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const [context, tasks, projects] = await Promise.all([
      prisma.projectContext.findUnique({
        where: { organizationId: ctx.organizationId },
        include: {
          milestoneProgress: {
            orderBy: [{ milestoneIndex: 'asc' }, { date: 'desc' }],
          },
        },
      }),
      prisma.task.findMany({
        where: {
          project: { organizationId: ctx.organizationId },
        },
        select: {
          id: true,
          status: true,
          storyPoints: true,
          dueDate: true,
        },
      }),
      prisma.project.findMany({
        where: { organizationId: ctx.organizationId },
        select: {
          id: true,
          name: true,
          targetDate: true,
          status: true,
        },
      }),
    ])

    if (!context) {
      return null
    }

    // Compute task stats
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE).length
    const inProgressTasks = tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length

    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
    const completedPoints = tasks
      .filter((t) => t.status === TaskStatus.DONE)
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0)

    // Parse milestones
    const milestones = (context.milestones as any[]) || []
    const now = new Date()

    // Compute milestone stats
    const milestoneStats = milestones.map((m, index) => {
      const targetDate = new Date(m.targetDate)
      const daysRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const isPast = targetDate < now

      // Get latest progress for this milestone
      const latestProgress = context.milestoneProgress.find((p) => p.milestoneIndex === index)

      return {
        ...m,
        index,
        daysRemaining,
        isPast,
        isAtRisk: daysRemaining < 7 && m.status !== 'completed',
        progress: latestProgress
          ? {
              tasksCompleted: latestProgress.tasksCompleted,
              tasksTotal: latestProgress.tasksTotal,
              pointsCompleted: latestProgress.pointsCompleted,
              pointsTotal: latestProgress.pointsTotal,
              percentage:
                latestProgress.tasksTotal > 0
                  ? Math.round((latestProgress.tasksCompleted / latestProgress.tasksTotal) * 100)
                  : 0,
            }
          : null,
      }
    })

    // Find next upcoming milestone
    const nextMilestone = milestoneStats.find((m) => !m.isPast && m.status !== 'completed')

    // Calculate overall on-track percentage
    const completedMilestones = milestoneStats.filter((m) => m.status === 'completed').length
    const onTrackPercentage =
      milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0

    return {
      ...context,
      analytics: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        totalPoints,
        completedPoints,
        pointsCompletionRate: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
        milestoneStats,
        nextMilestone,
        onTrackPercentage,
        projectCount: projects.length,
        activeProjects: projects.filter((p) => p.status === 'ACTIVE').length,
      },
    }
  }),

  // Create or update project context
  upsert: managerProcedure
    .input(
      z.object({
        buildingDescription: z.string().min(1),
        milestones: z.array(milestoneSchema).optional(),
        goals: z.array(z.string()).optional(),
        techStack: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existingContext = await prisma.projectContext.findUnique({
        where: { organizationId: ctx.organizationId },
      })

      if (existingContext) {
        return prisma.projectContext.update({
          where: { id: existingContext.id },
          data: {
            buildingDescription: input.buildingDescription,
            milestones: input.milestones || [],
            goals: input.goals || [],
            techStack: input.techStack || [],
          },
        })
      }

      return prisma.projectContext.create({
        data: {
          organizationId: ctx.organizationId,
          buildingDescription: input.buildingDescription,
          milestones: input.milestones || [],
          goals: input.goals || [],
          techStack: input.techStack || [],
        },
      })
    }),

  // Update a specific milestone status
  updateMilestone: managerProcedure
    .input(
      z.object({
        milestoneIndex: z.number(),
        status: z.enum(['not_started', 'in_progress', 'completed', 'at_risk']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const context = await prisma.projectContext.findUnique({
        where: { organizationId: ctx.organizationId },
      })

      if (!context) {
        throw new Error('Project context not found')
      }

      const milestones = (context.milestones as any[]) || []
      if (input.milestoneIndex >= milestones.length) {
        throw new Error('Milestone index out of bounds')
      }

      milestones[input.milestoneIndex] = {
        ...milestones[input.milestoneIndex],
        status: input.status,
      }

      return prisma.projectContext.update({
        where: { id: context.id },
        data: { milestones },
      })
    }),

  // Add a new milestone
  addMilestone: managerProcedure
    .input(milestoneSchema)
    .mutation(async ({ ctx, input }) => {
      const context = await prisma.projectContext.findUnique({
        where: { organizationId: ctx.organizationId },
      })

      if (!context) {
        throw new Error('Project context not found')
      }

      const milestones = (context.milestones as any[]) || []
      milestones.push({
        ...input,
        status: input.status || 'not_started',
      })

      return prisma.projectContext.update({
        where: { id: context.id },
        data: { milestones },
      })
    }),

  // Remove a milestone
  removeMilestone: managerProcedure
    .input(z.object({ milestoneIndex: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const context = await prisma.projectContext.findUnique({
        where: { organizationId: ctx.organizationId },
      })

      if (!context) {
        throw new Error('Project context not found')
      }

      const milestones = (context.milestones as any[]) || []
      if (input.milestoneIndex >= milestones.length) {
        throw new Error('Milestone index out of bounds')
      }

      milestones.splice(input.milestoneIndex, 1)

      return prisma.projectContext.update({
        where: { id: context.id },
        data: { milestones },
      })
    }),

  // Record milestone progress snapshot
  recordProgress: protectedProcedure
    .input(
      z.object({
        milestoneIndex: z.number(),
        tasksCompleted: z.number(),
        tasksTotal: z.number(),
        pointsCompleted: z.number(),
        pointsTotal: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const context = await prisma.projectContext.findUnique({
        where: { organizationId: ctx.organizationId },
      })

      if (!context) {
        throw new Error('Project context not found')
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      return prisma.milestoneProgress.upsert({
        where: {
          projectContextId_milestoneIndex_date: {
            projectContextId: context.id,
            milestoneIndex: input.milestoneIndex,
            date: today,
          },
        },
        update: {
          tasksCompleted: input.tasksCompleted,
          tasksTotal: input.tasksTotal,
          pointsCompleted: input.pointsCompleted,
          pointsTotal: input.pointsTotal,
        },
        create: {
          projectContextId: context.id,
          milestoneIndex: input.milestoneIndex,
          date: today,
          tasksCompleted: input.tasksCompleted,
          tasksTotal: input.tasksTotal,
          pointsCompleted: input.pointsCompleted,
          pointsTotal: input.pointsTotal,
        },
      })
    }),

  // Get timeline data for visualization
  getTimeline: protectedProcedure.query(async ({ ctx }) => {
    const context = await prisma.projectContext.findUnique({
      where: { organizationId: ctx.organizationId },
    })

    if (!context || !context.milestones) {
      return { milestones: [], timeRange: null }
    }

    const milestones = context.milestones as any[]
    if (milestones.length === 0) {
      return { milestones: [], timeRange: null }
    }

    const dates = milestones
      .map((m) => new Date(m.targetDate))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())

    if (dates.length === 0) {
      return { milestones: [], timeRange: null }
    }

    const now = new Date()
    const startDate = new Date(Math.min(now.getTime(), dates[0].getTime()))
    startDate.setDate(startDate.getDate() - 7) // Start a week before

    const endDate = new Date(dates[dates.length - 1])
    endDate.setDate(endDate.getDate() + 14) // End two weeks after

    return {
      milestones: milestones.map((m, index) => ({
        ...m,
        index,
        targetDate: new Date(m.targetDate),
      })),
      timeRange: {
        start: startDate,
        end: endDate,
        totalDays: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      },
    }
  }),
})

export type ContextRouter = typeof contextRouter
