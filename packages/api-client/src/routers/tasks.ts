import { z } from 'zod'
import { router, protectedProcedure, managerProcedure } from '../trpc'
import { prisma, TaskStatus, TaskPriority, TaskSource } from '@nexflow/database'

export const tasksRouter = router({
  list: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      teamId: z.string().optional(),
      assigneeId: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      source: z.string().optional(),
      isStale: z.boolean().optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
      cursor: z.string().optional(),
    }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const tasks = await prisma.task.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(input.projectId && { projectId: input.projectId }),
          ...(input.teamId && { teamId: input.teamId }),
          ...(input.assigneeId && { assigneeId: input.assigneeId }),
          ...(input.status && { status: input.status as TaskStatus }),
          ...(input.priority && { priority: input.priority as TaskPriority }),
          ...(input.source && { source: input.source as TaskSource }),
          ...(input.isStale !== undefined && { isStale: input.isStale }),
          ...(input.search && {
            OR: [
              { title: { contains: input.search, mode: 'insensitive' } },
              { description: { contains: input.search, mode: 'insensitive' } },
            ],
          }),
        },
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          project: { select: { id: true, name: true, key: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
      })

      let nextCursor: string | undefined = undefined
      if (tasks.length > input.limit) {
        const nextItem = tasks.pop()
        nextCursor = nextItem?.id
      }

      return { tasks, nextCursor }
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.task.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          project: { select: { id: true, name: true, key: true } },
          creator: { select: { id: true, name: true } },
        },
      })
    }),

  create: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      storyPoints: z.number().optional(),
      dueDate: z.date().optional(),
      labels: z.array(z.string()).optional(),
      projectId: z.string().optional(),
      teamId: z.string().optional(),
      assigneeId: z.string().optional(),
      blockedByIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.task.create({
        data: {
          title: input.title,
          description: input.description,
          status: (input.status as TaskStatus) || TaskStatus.BACKLOG,
          priority: (input.priority as TaskPriority) || TaskPriority.MEDIUM,
          storyPoints: input.storyPoints,
          dueDate: input.dueDate,
          labels: input.labels || [],
          projectId: input.projectId,
          teamId: input.teamId,
          assigneeId: input.assigneeId,
          creatorId: ctx.userId,
          blockedByIds: input.blockedByIds || [],
          source: TaskSource.INTERNAL,
          organizationId: ctx.organizationId, // Link to organization
        },
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          project: { select: { id: true, name: true, key: true } },
        },
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      storyPoints: z.number().optional(),
      dueDate: z.date().optional(),
      labels: z.array(z.string()).optional(),
      assigneeId: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return prisma.task.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.status && { status: data.status as TaskStatus }),
          ...(data.priority && { priority: data.priority as TaskPriority }),
          ...(data.storyPoints !== undefined && { storyPoints: data.storyPoints }),
          ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
          ...(data.labels && { labels: data.labels }),
          ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        },
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          project: { select: { id: true, name: true, key: true } },
        },
      })
    }),

  delete: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.task.delete({ where: { id: input.id } })
      return { success: true }
    }),

  bulkUpdate: managerProcedure
    .input(z.object({
      ids: z.array(z.string()),
      data: z.object({
        status: z.string().optional(),
        priority: z.string().optional(),
        assigneeId: z.string().nullable().optional(),
        labels: z.array(z.string()).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const result = await prisma.task.updateMany({
        where: { id: { in: input.ids } },
        data: {
          ...(input.data.status && { status: input.data.status as TaskStatus }),
          ...(input.data.priority && { priority: input.data.priority as TaskPriority }),
          ...(input.data.assigneeId !== undefined && { assigneeId: input.data.assigneeId }),
          ...(input.data.labels && { labels: input.data.labels }),
        },
      })
      return { success: true, count: result.count }
    }),

  getStats: protectedProcedure
    .input(z.object({ projectId: z.string().optional() }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const where = {
        project: { organizationId: ctx.organizationId },
        ...(input.projectId && { projectId: input.projectId }),
      }

      const [byStatus, byPriority, staleCount] = await Promise.all([
        prisma.task.groupBy({
          by: ['status'],
          where,
          _count: { status: true },
        }),
        prisma.task.groupBy({
          by: ['priority'],
          where,
          _count: { priority: true },
        }),
        prisma.task.count({
          where: { ...where, isStale: true },
        }),
      ])

      return {
        byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count.status])),
        byPriority: Object.fromEntries(byPriority.map(p => [p.priority, p._count.priority])),
        staleCount,
      }
    }),
})

export type TasksRouter = typeof tasksRouter
