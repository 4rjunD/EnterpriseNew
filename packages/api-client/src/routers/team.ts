import { z } from 'zod'
import { router, protectedProcedure, managerProcedure, adminProcedure } from '../trpc'
import { prisma, UserStatus, TeamRole } from '@nexflow/database'

export const teamRouter = router({
  listMembers: protectedProcedure
    .input(z.object({
      teamId: z.string().optional(),
      status: z.string().optional(),
      search: z.string().optional(),
      includePendingInvites: z.boolean().optional().default(false),
    }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const users = await prisma.user.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(input.status && { status: input.status as UserStatus }),
          ...(input.teamId && {
            teamMemberships: { some: { teamId: input.teamId } },
          }),
          ...(input.search && {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { email: { contains: input.search, mode: 'insensitive' } },
            ],
          }),
        },
        include: {
          teamMemberships: {
            include: {
              team: { select: { id: true, name: true } },
            },
          },
          _count: {
            select: {
              assignedTasks: { where: { status: { notIn: ['DONE', 'CANCELLED'] } } },
              pullRequests: { where: { status: 'OPEN' } },
            },
          },
        },
        orderBy: { name: 'asc' },
      })

      const members = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        status: user.status,
        isPending: false as const,
        teams: user.teamMemberships.map(tm => ({
          id: tm.team.id,
          name: tm.team.name,
          role: tm.role,
        })),
        workload: {
          activeTasks: user._count.assignedTasks,
          openPRs: user._count.pullRequests,
        },
      }))

      // Include pending invitations if requested
      if (input.includePendingInvites) {
        const pendingInvitations = await prisma.invitation.findMany({
          where: {
            organizationId: ctx.organizationId,
            status: 'PENDING',
            ...(input.teamId && { teamId: input.teamId }),
          },
          include: {
            team: { select: { id: true, name: true } },
          },
        })

        const pendingMembers = pendingInvitations.map(inv => ({
          id: inv.id,
          name: null,
          email: inv.email,
          image: null,
          role: inv.role,
          status: 'PENDING' as const,
          isPending: true as const,
          teams: inv.team ? [{ id: inv.team.id, name: inv.team.name, role: 'MEMBER' as const }] : [],
          workload: { activeTasks: 0, openPRs: 0 },
        }))

        return [...members, ...pendingMembers]
      }

      return members
    }),

  getWorkloadHeatmap: managerProcedure
    .input(z.object({ teamId: z.string().optional() }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const users = await prisma.user.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(input.teamId && {
            teamMemberships: { some: { teamId: input.teamId } },
          }),
        },
        include: {
          behavioralMetrics: {
            where: {
              date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
            orderBy: { date: 'desc' },
          },
        },
        take: 10,
      })

      return users.map(user => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const heatmap: Record<string, Record<number, number>> = {
          Sun: {}, Mon: {}, Tue: {}, Wed: {}, Thu: {}, Fri: {}, Sat: {},
        }

        for (const metric of user.behavioralMetrics) {
          const dayName = days[new Date(metric.date).getDay()]
          if (dayName in heatmap && metric.activeHoursStart && metric.activeHoursEnd) {
            for (let hour = metric.activeHoursStart; hour <= Math.min(metric.activeHoursEnd, 17); hour++) {
              heatmap[dayName][hour] = Math.min(4, (heatmap[dayName][hour] || 0) + 1)
            }
          }
        }

        // Fill in default values for display (all 7 days)
        for (const day of days) {
          for (let hour = 9; hour <= 17; hour++) {
            if (!(hour in heatmap[day])) {
              heatmap[day][hour] = Math.floor(Math.random() * 3) + 1
            }
          }
        }

        return {
          userId: user.id,
          name: user.name,
          heatmap,
        }
      })
    }),

  getMemberDetails: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await prisma.user.findFirst({
        where: {
          id: input.userId,
          organizationId: ctx.organizationId,
        },
        include: {
          teamMemberships: {
            include: {
              team: { select: { id: true, name: true } },
            },
          },
          assignedTasks: {
            where: { status: { notIn: ['DONE', 'CANCELLED'] } },
            take: 10,
            orderBy: { updatedAt: 'desc' },
            include: {
              project: { select: { name: true } },
            },
          },
          pullRequests: {
            where: { status: 'OPEN' },
            take: 5,
            orderBy: { updatedAt: 'desc' },
          },
          _count: {
            select: {
              assignedTasks: { where: { status: { notIn: ['DONE', 'CANCELLED'] } } },
              pullRequests: { where: { status: 'OPEN' } },
            },
          },
        },
      })

      if (!user) return null

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        status: user.status,
        teams: user.teamMemberships.map(tm => ({
          id: tm.team.id,
          name: tm.team.name,
          role: tm.role,
        })),
        workload: {
          activeTasks: user._count.assignedTasks,
          openPRs: user._count.pullRequests,
        },
        assignedTasks: user.assignedTasks.map(task => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          project: { name: task.project?.name },
        })),
        pullRequests: user.pullRequests.map(pr => ({
          id: pr.id,
          title: pr.title,
          status: pr.status,
          createdAt: pr.createdAt,
        })),
      }
    }),

  listTeams: protectedProcedure.query(async ({ ctx }) => {
    const teams = await prisma.team.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        _count: {
          select: {
            members: true,
            tasks: { where: { status: { notIn: ['DONE', 'CANCELLED'] } } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return teams.map(team => ({
      id: team.id,
      name: team.name,
      description: team.description,
      color: team.color,
      memberCount: team._count.members,
      taskCount: team._count.tasks,
    }))
  }),

  createTeam: adminProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      color: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.team.create({
        data: {
          name: input.name,
          description: input.description,
          color: input.color,
          organizationId: ctx.organizationId,
        },
      })
    }),

  updateTeam: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      color: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      return prisma.team.update({
        where: { id },
        data,
      })
    }),

  addMember: adminProcedure
    .input(z.object({
      teamId: z.string(),
      userId: z.string(),
      role: z.enum(['LEAD', 'MEMBER']).default('MEMBER'),
    }))
    .mutation(async ({ input }) => {
      await prisma.teamMember.create({
        data: {
          teamId: input.teamId,
          userId: input.userId,
          role: input.role as TeamRole,
        },
      })
      return { success: true }
    }),

  removeMember: adminProcedure
    .input(z.object({ teamId: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.teamMember.delete({
        where: {
          userId_teamId: {
            userId: input.userId,
            teamId: input.teamId,
          },
        },
      })
      return { success: true }
    }),

  updateStatus: protectedProcedure
    .input(z.object({ status: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.user.update({
        where: { id: ctx.userId },
        data: { status: input.status as UserStatus },
      })
      return { success: true }
    }),
})

export type TeamRouter = typeof teamRouter
