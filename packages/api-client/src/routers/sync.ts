import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma, IntegrationType, SyncStatus, TaskStatus } from '@nexflow/database'

export const syncRouter = router({
  // Get sync status for all integrations
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const [integrations, recentLogs] = await Promise.all([
      prisma.integration.findMany({
        where: { organizationId: ctx.organizationId },
        select: {
          id: true,
          type: true,
          status: true,
          lastSyncAt: true,
          syncError: true,
        },
      }),
      prisma.syncLog.findMany({
        where: { organizationId: ctx.organizationId },
        orderBy: { startedAt: 'desc' },
        take: 20,
      }),
    ])

    // Get last sync for each integration type
    const lastSyncByType = new Map<string, typeof recentLogs[0]>()
    for (const log of recentLogs) {
      if (!lastSyncByType.has(log.integrationType) && log.status === 'COMPLETED') {
        lastSyncByType.set(log.integrationType, log)
      }
    }

    // Check if any sync is in progress
    const inProgressSync = recentLogs.find((log) => log.status === 'IN_PROGRESS')

    return {
      integrations: integrations.map((int) => ({
        ...int,
        lastSync: lastSyncByType.get(int.type) || null,
      })),
      inProgress: inProgressSync || null,
      recentLogs: recentLogs.slice(0, 5),
    }
  }),

  // Get unified todos across all integrations
  getUnifiedTodos: protectedProcedure
    .input(
      z
        .object({
          filter: z.enum(['all', 'due_today', 'due_this_week', 'overdue']).optional(),
          limit: z.number().min(1).max(100).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const filter = input?.filter || 'all'
      const limit = input?.limit || 50

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
      const endOfWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

      let dateFilter = {}
      if (filter === 'due_today') {
        dateFilter = {
          dueDate: {
            gte: today,
            lte: endOfToday,
          },
        }
      } else if (filter === 'due_this_week') {
        dateFilter = {
          dueDate: {
            gte: today,
            lte: endOfWeek,
          },
        }
      } else if (filter === 'overdue') {
        dateFilter = {
          dueDate: {
            lt: today,
          },
        }
      }

      // Get tasks from projects in this organization
      const tasks = await prisma.task.findMany({
        where: {
          project: {
            organizationId: ctx.organizationId,
          },
          status: {
            in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW],
          },
          ...dateFilter,
        },
        include: {
          project: { select: { id: true, name: true, key: true } },
          assignee: { select: { id: true, name: true, image: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { updatedAt: 'desc' }],
        take: limit,
      })

      // Group by due date category
      const overdue: typeof tasks = []
      const dueToday: typeof tasks = []
      const dueThisWeek: typeof tasks = []
      const later: typeof tasks = []
      const noDueDate: typeof tasks = []

      for (const task of tasks) {
        if (!task.dueDate) {
          noDueDate.push(task)
        } else {
          const dueDate = new Date(task.dueDate)
          if (dueDate < today) {
            overdue.push(task)
          } else if (dueDate <= endOfToday) {
            dueToday.push(task)
          } else if (dueDate <= endOfWeek) {
            dueThisWeek.push(task)
          } else {
            later.push(task)
          }
        }
      }

      return {
        tasks,
        grouped: {
          overdue,
          dueToday,
          dueThisWeek,
          later,
          noDueDate,
        },
        counts: {
          total: tasks.length,
          overdue: overdue.length,
          dueToday: dueToday.length,
          dueThisWeek: dueThisWeek.length,
        },
      }
    }),

  // Start a new sync log (called by integrations)
  startSync: protectedProcedure
    .input(
      z.object({
        integrationType: z.nativeEnum(IntegrationType),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.syncLog.create({
        data: {
          organizationId: ctx.organizationId,
          integrationType: input.integrationType,
          status: SyncStatus.IN_PROGRESS,
        },
      })
    }),

  // Complete a sync log
  completeSync: protectedProcedure
    .input(
      z.object({
        syncLogId: z.string(),
        itemsSynced: z.number(),
        itemsCreated: z.number(),
        itemsUpdated: z.number(),
        error: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const startedLog = await prisma.syncLog.findUnique({
        where: { id: input.syncLogId },
      })

      const duration = startedLog
        ? Math.round((Date.now() - startedLog.startedAt.getTime()) / 1000)
        : null

      return prisma.syncLog.update({
        where: { id: input.syncLogId },
        data: {
          status: input.error ? SyncStatus.FAILED : SyncStatus.COMPLETED,
          itemsSynced: input.itemsSynced,
          itemsCreated: input.itemsCreated,
          itemsUpdated: input.itemsUpdated,
          error: input.error,
          completedAt: new Date(),
          duration,
        },
      })
    }),

  // Get sync history
  getHistory: protectedProcedure
    .input(
      z
        .object({
          integrationType: z.nativeEnum(IntegrationType).optional(),
          limit: z.number().min(1).max(100).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return prisma.syncLog.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(input?.integrationType && { integrationType: input.integrationType }),
        },
        orderBy: { startedAt: 'desc' },
        take: input?.limit || 20,
      })
    }),
})

export type SyncRouter = typeof syncRouter
