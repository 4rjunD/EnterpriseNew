import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../trpc'
import { prisma } from '@nexflow/database'

const repoInputSchema = z.object({
  owner: z.string(),
  name: z.string(),
  fullName: z.string(),
  description: z.string().nullable().optional(),
  url: z.string(),
  language: z.string().nullable().optional(),
  defaultBranch: z.string().optional().default('main'),
  isPrivate: z.boolean().optional().default(false),
})

export const repositoriesRouter = router({
  // Get selected repos for this org
  listSelected: protectedProcedure.query(async ({ ctx }) => {
    return prisma.selectedRepository.findMany({
      where: { organizationId: ctx.organizationId },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    })
  }),

  // Select repos to track (add to selection)
  selectRepos: adminProcedure
    .input(
      z.object({
        repos: z.array(repoInputSchema),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results = []

      for (const repo of input.repos) {
        const existing = await prisma.selectedRepository.findFirst({
          where: {
            organizationId: ctx.organizationId,
            fullName: repo.fullName,
          },
        })

        if (existing) {
          // Update existing
          const updated = await prisma.selectedRepository.update({
            where: { id: existing.id },
            data: {
              description: repo.description,
              url: repo.url,
              language: repo.language,
              defaultBranch: repo.defaultBranch,
              isPrivate: repo.isPrivate,
              updatedAt: new Date(),
            },
          })
          results.push({ action: 'updated', repo: updated })
        } else {
          // Create new
          const created = await prisma.selectedRepository.create({
            data: {
              organizationId: ctx.organizationId,
              owner: repo.owner,
              name: repo.name,
              fullName: repo.fullName,
              description: repo.description,
              url: repo.url,
              language: repo.language,
              defaultBranch: repo.defaultBranch || 'main',
              isPrivate: repo.isPrivate || false,
            },
          })
          results.push({ action: 'created', repo: created })
        }
      }

      return {
        selected: input.repos.length,
        results,
      }
    }),

  // Link repo to project
  linkToProject: adminProcedure
    .input(
      z.object({
        repoId: z.string(),
        projectId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify repo belongs to org
      const repo = await prisma.selectedRepository.findFirst({
        where: {
          id: input.repoId,
          organizationId: ctx.organizationId,
        },
      })

      if (!repo) {
        throw new Error('Repository not found')
      }

      return prisma.selectedRepository.update({
        where: { id: input.repoId },
        data: { projectId: input.projectId },
        include: { project: { select: { id: true, name: true } } },
      })
    }),

  // Toggle sync for a repo
  toggleSync: adminProcedure
    .input(
      z.object({
        repoId: z.string(),
        syncEnabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const repo = await prisma.selectedRepository.findFirst({
        where: {
          id: input.repoId,
          organizationId: ctx.organizationId,
        },
      })

      if (!repo) {
        throw new Error('Repository not found')
      }

      return prisma.selectedRepository.update({
        where: { id: input.repoId },
        data: { syncEnabled: input.syncEnabled },
      })
    }),

  // Remove repo from tracking
  unselect: adminProcedure
    .input(z.object({ repoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const repo = await prisma.selectedRepository.findFirst({
        where: {
          id: input.repoId,
          organizationId: ctx.organizationId,
        },
      })

      if (!repo) {
        throw new Error('Repository not found')
      }

      await prisma.selectedRepository.delete({
        where: { id: input.repoId },
      })

      return { success: true }
    }),

  // Update cached metrics for a repo
  updateMetrics: protectedProcedure
    .input(
      z.object({
        repoId: z.string(),
        completenessScore: z.number().optional(),
        openPRCount: z.number().optional(),
        openIssueCount: z.number().optional(),
        todoCount: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const repo = await prisma.selectedRepository.findFirst({
        where: {
          id: input.repoId,
          organizationId: ctx.organizationId,
        },
      })

      if (!repo) {
        throw new Error('Repository not found')
      }

      return prisma.selectedRepository.update({
        where: { id: input.repoId },
        data: {
          completenessScore: input.completenessScore,
          openPRCount: input.openPRCount,
          openIssueCount: input.openIssueCount,
          todoCount: input.todoCount,
          lastAnalyzedAt: new Date(),
        },
      })
    }),

  // Get repo analysis cache
  getAnalysisCache: protectedProcedure
    .input(z.object({ repoFullName: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.repoAnalysisCache.findUnique({
        where: {
          organizationId_repoFullName: {
            organizationId: ctx.organizationId,
            repoFullName: input.repoFullName,
          },
        },
      })
    }),

  // Store repo analysis cache
  storeAnalysisCache: protectedProcedure
    .input(
      z.object({
        repoFullName: z.string(),
        structure: z.record(z.unknown()),
        codeInsights: z.record(z.unknown()),
        metrics: z.record(z.unknown()),
        expiresInHours: z.number().optional().default(24),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + input.expiresInHours)

      const existing = await prisma.repoAnalysisCache.findFirst({
        where: {
          organizationId: ctx.organizationId,
          repoFullName: input.repoFullName,
        },
      })

      if (existing) {
        return prisma.repoAnalysisCache.update({
          where: { id: existing.id },
          data: {
            structure: input.structure as object,
            codeInsights: input.codeInsights as object,
            metrics: input.metrics as object,
            analyzedAt: new Date(),
            expiresAt,
          },
        })
      }

      return prisma.repoAnalysisCache.create({
        data: {
          organizationId: ctx.organizationId,
          repoFullName: input.repoFullName,
          structure: input.structure as object,
          codeInsights: input.codeInsights as object,
          metrics: input.metrics as object,
          analyzedAt: new Date(),
          expiresAt,
        },
      })
    }),

  // Get organization-level stats across all repos
  getOrgStats: protectedProcedure.query(async ({ ctx }) => {
    const repos = await prisma.selectedRepository.findMany({
      where: { organizationId: ctx.organizationId, syncEnabled: true },
    })

    const totalRepos = repos.length
    const totalTodos = repos.reduce((sum, r) => sum + r.todoCount, 0)
    const totalOpenPRs = repos.reduce((sum, r) => sum + r.openPRCount, 0)
    const totalOpenIssues = repos.reduce((sum, r) => sum + r.openIssueCount, 0)

    const reposWithScore = repos.filter((r) => r.completenessScore !== null)
    const avgCompleteness =
      reposWithScore.length > 0
        ? reposWithScore.reduce((sum, r) => sum + (r.completenessScore || 0), 0) /
          reposWithScore.length
        : 0

    return {
      totalRepos,
      totalTodos,
      totalOpenPRs,
      totalOpenIssues,
      avgCompleteness: Math.round(avgCompleteness),
    }
  }),
})

export type RepositoriesRouter = typeof repositoriesRouter
