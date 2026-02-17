import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../trpc'
import { prisma } from '@nexflow/database'
import { KnowledgeBaseBuilder } from '@nexflow/ai'

export const knowledgeBaseRouter = router({
  // Get the organization's knowledge base
  get: protectedProcedure.query(async ({ ctx }) => {
    const kb = await prisma.organizationKnowledgeBase.findUnique({
      where: { organizationId: ctx.organizationId },
    })

    if (!kb) {
      return null
    }

    return {
      techStackSummary: kb.techStackSummary,
      architectureSummary: kb.architectureSummary,
      recommendations: kb.recommendations as Array<{
        title: string
        description: string
        priority: 'HIGH' | 'MEDIUM' | 'LOW'
        category: string
      }> | null,
      goalProgress: kb.goalProgress as {
        alignmentScore: number
        missingCapabilities: string[]
        suggestions: string[]
      } | null,
      metrics: {
        totalRepos: kb.totalRepos,
        avgCompleteness: kb.avgCompleteness,
        totalTodos: kb.totalTodos,
        totalOpenPRs: kb.totalOpenPRs,
      },
      lastAnalyzedAt: kb.lastAnalyzedAt,
    }
  }),

  // Rebuild the knowledge base
  rebuild: adminProcedure.mutation(async ({ ctx }) => {
    const builder = new KnowledgeBaseBuilder(ctx.organizationId)
    await builder.build()

    const kb = await builder.get()
    return {
      success: true,
      metrics: {
        totalRepos: kb?.totalRepos || 0,
        avgCompleteness: kb?.avgCompleteness || 0,
        totalTodos: kb?.totalTodos || 0,
        totalOpenPRs: kb?.totalOpenPRs || 0,
      },
    }
  }),

  // Get quick summary for dashboard widgets
  getSummary: protectedProcedure.query(async ({ ctx }) => {
    // Check if we need to rebuild
    const builder = new KnowledgeBaseBuilder(ctx.organizationId)
    await builder.rebuildIfStale(12) // Rebuild if older than 12 hours

    const kb = await prisma.organizationKnowledgeBase.findUnique({
      where: { organizationId: ctx.organizationId },
    })

    if (!kb) {
      return {
        hasData: false,
        metrics: {
          totalRepos: 0,
          avgCompleteness: 0,
          totalTodos: 0,
          totalOpenPRs: 0,
        },
        topRecommendation: null,
      }
    }

    const recommendations = kb.recommendations as Array<{
      title: string
      description: string
      priority: 'HIGH' | 'MEDIUM' | 'LOW'
      category: string
    }> | null

    const highPriorityRec = recommendations?.find(r => r.priority === 'HIGH')

    return {
      hasData: true,
      metrics: {
        totalRepos: kb.totalRepos,
        avgCompleteness: kb.avgCompleteness,
        totalTodos: kb.totalTodos,
        totalOpenPRs: kb.totalOpenPRs,
      },
      topRecommendation: highPriorityRec || recommendations?.[0] || null,
      techStackSummary: kb.techStackSummary,
    }
  }),

  // Get recommendations with filtering
  getRecommendations: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
    }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const kb = await prisma.organizationKnowledgeBase.findUnique({
        where: { organizationId: ctx.organizationId },
      })

      if (!kb || !kb.recommendations) {
        return []
      }

      let recommendations = kb.recommendations as Array<{
        title: string
        description: string
        priority: 'HIGH' | 'MEDIUM' | 'LOW'
        category: string
      }>

      if (input.category) {
        recommendations = recommendations.filter(r => r.category === input.category)
      }

      if (input.priority) {
        recommendations = recommendations.filter(r => r.priority === input.priority)
      }

      return recommendations
    }),
})

export type KnowledgeBaseRouter = typeof knowledgeBaseRouter
