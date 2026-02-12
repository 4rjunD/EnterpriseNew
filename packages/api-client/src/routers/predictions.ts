import { z } from 'zod'
import { router, protectedProcedure, managerProcedure } from '../trpc'
import { prisma, PredictionType } from '@nexflow/database'

export const predictionsRouter = router({
  list: protectedProcedure
    .input(z.object({
      type: z.string().optional(),
      projectId: z.string().optional(),
      minConfidence: z.number().optional(),
      limit: z.number().default(50),
    }).optional().default({}))
    .query(async ({ ctx, input }) => {
      return prisma.prediction.findMany({
        where: {
          project: { organizationId: ctx.organizationId },
          isActive: true,
          ...(input.type && { type: input.type as PredictionType }),
          ...(input.projectId && { projectId: input.projectId }),
          ...(input.minConfidence && { confidence: { gte: input.minConfidence } }),
        },
        include: {
          project: { select: { id: true, name: true, key: true } },
        },
        orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
        take: input.limit,
      })
    }),

  getForProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const predictions = await prisma.prediction.findMany({
        where: {
          projectId: input.projectId,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      return {
        deadlineRisk: predictions.find(p => p.type === 'DEADLINE_RISK'),
        burnoutIndicators: predictions.filter(p => p.type === 'BURNOUT_INDICATOR'),
        velocityForecast: predictions.find(p => p.type === 'VELOCITY_FORECAST'),
        scopeCreep: predictions.find(p => p.type === 'SCOPE_CREEP'),
      }
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const predictions = await prisma.prediction.findMany({
      where: {
        project: { organizationId: ctx.organizationId },
        isActive: true,
      },
      select: { type: true, confidence: true },
    })

    const byType = predictions.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const highConfidence = predictions.filter(p => p.confidence >= 0.8).length
    const atRisk = predictions.filter(p =>
      p.confidence >= 0.7 &&
      (p.type === 'DEADLINE_RISK' || p.type === 'BURNOUT_INDICATOR' || p.type === 'SCOPE_CREEP')
    ).length
    const avgConfidence = predictions.length > 0
      ? predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
      : 0

    return {
      total: predictions.length,
      byType,
      highConfidence,
      atRisk,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
    }
  }),

  dismiss: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.prediction.update({
        where: { id: input.id },
        data: { isActive: false },
      })
      return { success: true }
    }),
})

export type PredictionsRouter = typeof predictionsRouter
