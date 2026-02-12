import { z } from 'zod'
import { router, protectedProcedure, managerProcedure } from '../trpc'
import { prisma, BottleneckType, BottleneckSeverity, BottleneckStatus } from '@nexflow/database'

export const bottlenecksRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      type: z.string().optional(),
      severity: z.string().optional(),
      projectId: z.string().optional(),
      limit: z.number().default(50),
    }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const bottlenecks = await prisma.bottleneck.findMany({
        where: {
          project: { organizationId: ctx.organizationId },
          ...(input.status && { status: input.status as BottleneckStatus }),
          ...(input.type && { type: input.type as BottleneckType }),
          ...(input.severity && { severity: input.severity as BottleneckSeverity }),
          ...(input.projectId && { projectId: input.projectId }),
        },
        include: {
          project: { select: { id: true, name: true, key: true } },
          task: {
            include: {
              assignee: { select: { name: true } },
            },
          },
          pullRequest: {
            include: {
              author: { select: { name: true } },
            },
          },
        },
        orderBy: [
          { severity: 'desc' },
          { detectedAt: 'desc' },
        ],
        take: input.limit,
      })

      return bottlenecks.map(b => ({
        id: b.id,
        type: b.type,
        severity: b.severity,
        status: b.status,
        title: b.title,
        description: b.description,
        impact: b.impact,
        detectedAt: b.detectedAt,
        project: b.project,
        task: b.task ? {
          id: b.task.id,
          title: b.task.title,
          assignee: b.task.assignee,
        } : undefined,
        pullRequest: b.pullRequest ? {
          id: b.pullRequest.id,
          title: b.pullRequest.title,
          number: b.pullRequest.number,
          author: b.pullRequest.author,
        } : undefined,
        impactScore: calculateImpactScore(b.severity, b.type),
      }))
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [byType, bySeverity, resolved24h, total] = await Promise.all([
      prisma.bottleneck.groupBy({
        by: ['type'],
        where: { project: { organizationId: ctx.organizationId }, status: 'ACTIVE' },
        _count: { type: true },
      }),
      prisma.bottleneck.groupBy({
        by: ['severity'],
        where: { project: { organizationId: ctx.organizationId }, status: 'ACTIVE' },
        _count: { severity: true },
      }),
      prisma.bottleneck.count({
        where: {
          project: { organizationId: ctx.organizationId },
          status: 'RESOLVED',
          resolvedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.bottleneck.count({
        where: { project: { organizationId: ctx.organizationId }, status: 'ACTIVE' },
      }),
    ])

    return {
      byType: Object.fromEntries(byType.map(t => [t.type, t._count.type])),
      bySeverity: Object.fromEntries(bySeverity.map(s => [s.severity, s._count.severity])),
      resolved24h,
      total,
    }
  }),

  resolve: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.bottleneck.update({
        where: { id: input.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      })
      return { success: true }
    }),

  ignore: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.bottleneck.update({
        where: { id: input.id },
        data: { status: 'IGNORED' },
      })
      return { success: true }
    }),

  triggerAction: managerProcedure
    .input(z.object({
      bottleneckId: z.string(),
      action: z.enum(['reassign', 'nudge', 'escalate']),
      targetUserId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const bottleneck = await prisma.bottleneck.findUnique({
        where: { id: input.bottleneckId },
        include: { project: true },
      })

      if (!bottleneck) {
        throw new Error('Bottleneck not found')
      }

      // Find the appropriate agent config
      const agentType = input.action === 'reassign' ? 'TASK_REASSIGNER' : 'NUDGE_SENDER'
      const agentConfig = await prisma.agentConfig.findFirst({
        where: {
          organizationId: bottleneck.project?.organizationId,
          type: agentType,
        },
      })

      if (agentConfig) {
        await prisma.agentAction.create({
          data: {
            agentConfigId: agentConfig.id,
            action: input.action,
            reasoning: `Manual action triggered for bottleneck: ${bottleneck.title}`,
            bottleneckId: input.bottleneckId,
            targetUserId: input.targetUserId,
            status: 'PENDING',
          },
        })
      }

      return { success: true }
    }),
})

function calculateImpactScore(severity: BottleneckSeverity, type: BottleneckType): number {
  const severityScores = {
    CRITICAL: 90,
    HIGH: 70,
    MEDIUM: 45,
    LOW: 20,
  }

  const typeModifiers = {
    DEPENDENCY_BLOCK: 1.1,
    STUCK_PR: 1.0,
    CI_FAILURE: 0.95,
    STALE_TASK: 0.85,
    REVIEW_DELAY: 0.8,
  }

  return Math.round(severityScores[severity] * (typeModifiers[type] || 1))
}

export type BottlenecksRouter = typeof bottlenecksRouter
