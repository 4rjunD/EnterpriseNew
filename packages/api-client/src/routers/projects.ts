import { z } from 'zod'
import { router, protectedProcedure, managerProcedure, adminProcedure } from '../trpc'
import { prisma, ProjectStatus } from '@nexflow/database'

export const projectsRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      teamId: z.string().optional(),
      search: z.string().optional(),
    }).optional().default({}))
    .query(async ({ ctx, input }) => {
      return prisma.project.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(input.status && { status: input.status as ProjectStatus }),
          ...(input.teamId && { teamId: input.teamId }),
          ...(input.search && {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { key: { contains: input.search, mode: 'insensitive' } },
              { description: { contains: input.search, mode: 'insensitive' } },
            ],
          }),
        },
        include: {
          team: { select: { id: true, name: true } },
          _count: {
            select: {
              tasks: true,
              pullRequests: true,
              bottlenecks: { where: { status: 'ACTIVE' } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.project.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
        include: {
          team: { select: { id: true, name: true } },
          tasks: {
            take: 10,
            orderBy: { updatedAt: 'desc' },
            include: {
              assignee: { select: { id: true, name: true, image: true } },
            },
          },
          pullRequests: {
            take: 5,
            orderBy: { updatedAt: 'desc' },
            include: {
              author: { select: { id: true, name: true } },
            },
          },
          predictions: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
          },
          bottlenecks: {
            where: { status: 'ACTIVE' },
            orderBy: { severity: 'desc' },
          },
          _count: {
            select: {
              tasks: true,
              pullRequests: true,
              bottlenecks: { where: { status: 'ACTIVE' } },
            },
          },
        },
      })
    }),

  create: managerProcedure
    .input(z.object({
      name: z.string(),
      key: z.string(),
      description: z.string().optional(),
      teamId: z.string().optional(),
      startDate: z.date().optional(),
      targetDate: z.date().optional(),
      scope: z.string().optional(),
      dependencies: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.project.create({
        data: {
          name: input.name,
          key: input.key.toUpperCase(),
          description: input.description,
          teamId: input.teamId,
          startDate: input.startDate,
          targetDate: input.targetDate,
          scope: input.scope,
          dependencies: input.dependencies || [],
          organizationId: ctx.organizationId,
        },
        include: {
          team: { select: { id: true, name: true } },
        },
      })
    }),

  update: managerProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      teamId: z.string().nullable().optional(),
      startDate: z.date().nullable().optional(),
      targetDate: z.date().nullable().optional(),
      scope: z.string().optional(),
      dependencies: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      return prisma.project.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.status && { status: data.status as ProjectStatus }),
          ...(data.teamId !== undefined && { teamId: data.teamId }),
          ...(data.startDate !== undefined && { startDate: data.startDate }),
          ...(data.targetDate !== undefined && { targetDate: data.targetDate }),
          ...(data.scope !== undefined && { scope: data.scope }),
          ...(data.dependencies && { dependencies: data.dependencies }),
        },
        include: {
          team: { select: { id: true, name: true } },
        },
      })
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.project.delete({ where: { id: input.id } })
      return { success: true }
    }),

  getStats: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const [tasksByStatus, prsByStatus, activeBottlenecks] = await Promise.all([
        prisma.task.groupBy({
          by: ['status'],
          where: { projectId: input.id },
          _count: { status: true },
        }),
        prisma.pullRequest.groupBy({
          by: ['status'],
          where: { projectId: input.id },
          _count: { status: true },
        }),
        prisma.bottleneck.count({
          where: { projectId: input.id, status: 'ACTIVE' },
        }),
      ])

      return {
        tasks: Object.fromEntries(tasksByStatus.map(s => [s.status, s._count.status])),
        prs: Object.fromEntries(prsByStatus.map(s => [s.status, s._count.status])),
        activeBottlenecks,
      }
    }),
})

export type ProjectsRouter = typeof projectsRouter
