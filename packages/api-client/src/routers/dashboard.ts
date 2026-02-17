import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma } from '@nexflow/database'
import { BottleneckDetector, PredictionEngine, GuaranteedAnalyzer, ContextBasedAnalyzer, AutonomousAnalyzer } from '@nexflow/ai'
import { GitHubClient, LinearClient, DiscordClient, GitHubRepoAnalyzer } from '@nexflow/integrations'

// Cache for ensureContent to avoid running on every request
const contentEnsureCache = new Map<string, number>()
const CONTENT_ENSURE_INTERVAL = 5 * 60 * 1000 // 5 minutes

// Type for RepoAnalysis from GitHubRepoAnalyzer
interface RepoAnalysisForMilestones {
  repo: {
    name: string
    fullName: string
    language: string | null
  }
  structure: {
    hasTests: boolean
    hasCI: boolean
    hasDocs: boolean
  }
  codeInsights: {
    totalTodos: number
  }
  completeness: {
    score: number
  }
  issues: {
    open: number
    stale: number
    bugCount: number
  }
  prs: {
    open: number
    stale: number
  }
}

// Helper: Generate milestones from repo analysis data
async function generateMilestonesFromRepos(
  organizationId: string,
  repoAnalyses: RepoAnalysisForMilestones[],
  selectedRepos: Array<{ fullName: string; language?: string | null }>
): Promise<number> {
  if (repoAnalyses.length === 0) return 0

  // Generate milestones based on repo analysis
  const milestones: Array<{
    name: string
    description: string
    targetDate: string
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
    progress: number
  }> = []

  // Calculate overall progress
  const avgCompleteness = repoAnalyses.reduce((sum, r) => sum + r.completeness.score, 0) / repoAnalyses.length
  const totalTodos = repoAnalyses.reduce((sum, r) => sum + r.codeInsights.totalTodos, 0)
  const totalOpenIssues = repoAnalyses.reduce((sum, r) => sum + r.issues.open, 0)
  const totalOpenPRs = repoAnalyses.reduce((sum, r) => sum + r.prs.open, 0)

  // Check CI/CD and testing status across repos
  const hasCI = repoAnalyses.some(r => r.structure.hasCI)
  const hasTests = repoAnalyses.some(r => r.structure.hasTests)
  const hasDocs = repoAnalyses.some(r => r.structure.hasDocs)

  // Generate milestone: CI/CD Setup
  if (!hasCI) {
    milestones.push({
      name: 'Set up CI/CD pipeline',
      description: `Implement continuous integration and deployment for ${selectedRepos.length} repositories`,
      targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'NOT_STARTED',
      progress: 0,
    })
  } else {
    milestones.push({
      name: 'CI/CD pipeline',
      description: 'Continuous integration is configured',
      targetDate: new Date().toISOString(),
      status: 'COMPLETED',
      progress: 100,
    })
  }

  // Generate milestone: Test Coverage
  if (!hasTests) {
    milestones.push({
      name: 'Add test coverage',
      description: 'Implement unit and integration tests across the codebase',
      targetDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'NOT_STARTED',
      progress: 0,
    })
  } else {
    milestones.push({
      name: 'Test coverage',
      description: 'Test infrastructure is in place',
      targetDate: new Date().toISOString(),
      status: avgCompleteness >= 80 ? 'COMPLETED' : 'IN_PROGRESS',
      progress: Math.min(100, Math.round(avgCompleteness)),
    })
  }

  // Generate milestone: Documentation
  if (!hasDocs) {
    milestones.push({
      name: 'Create documentation',
      description: 'Add README and documentation for the project',
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'NOT_STARTED',
      progress: 0,
    })
  }

  // Generate milestone: Code Quality
  if (totalTodos > 5) {
    const todoProgress = Math.max(0, 100 - totalTodos * 5)
    milestones.push({
      name: 'Address technical debt',
      description: `Resolve ${totalTodos} TODO/FIXME items across repositories`,
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: todoProgress > 50 ? 'IN_PROGRESS' : 'NOT_STARTED',
      progress: todoProgress,
    })
  }

  // Generate milestone: Issue Resolution
  if (totalOpenIssues > 0) {
    milestones.push({
      name: 'Resolve open issues',
      description: `Address ${totalOpenIssues} open issues across repositories`,
      targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'IN_PROGRESS',
      progress: Math.max(20, 100 - totalOpenIssues * 10),
    })
  }

  // Generate milestone: PR Review
  if (totalOpenPRs > 0) {
    milestones.push({
      name: 'Complete code reviews',
      description: `Review and merge ${totalOpenPRs} pending pull requests`,
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'IN_PROGRESS',
      progress: Math.max(30, 100 - totalOpenPRs * 15),
    })
  }

  // Always add a release milestone
  milestones.push({
    name: 'Next release',
    description: 'Ship the next version with completed features',
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: avgCompleteness >= 70 ? 'IN_PROGRESS' : 'NOT_STARTED',
    progress: Math.round(avgCompleteness * 0.7),
  })

  // Save milestones to ProjectContext
  const existingContext = await prisma.projectContext.findFirst({
    where: { organizationId },
  })

  if (existingContext) {
    await prisma.projectContext.update({
      where: { id: existingContext.id },
      data: { milestones: milestones as object },
    })
  } else {
    await prisma.projectContext.create({
      data: {
        organizationId,
        buildingDescription: `Software project with ${selectedRepos.length} repositories`,
        milestones: milestones as object,
        goals: ['Deliver quality software', 'Maintain development velocity'],
        techStack: selectedRepos.map(r => r.language).filter(Boolean) as string[],
      },
    })
  }

  return milestones.length
}

// Helper: Generate default milestones for accounts without repos
function generateDefaultMilestones(repoCount: number): Array<{
  name: string
  description: string
  targetDate: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  progress: number
}> {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  const milestones = [
    {
      name: 'Team onboarding',
      description: 'Complete team setup and invite members',
      targetDate: new Date(now + 3 * day).toISOString(),
      status: 'IN_PROGRESS' as const,
      progress: 60,
    },
    {
      name: 'Connect integrations',
      description: 'Connect GitHub, Linear, Slack and other tools',
      targetDate: new Date(now + 7 * day).toISOString(),
      status: repoCount > 0 ? 'COMPLETED' as const : 'IN_PROGRESS' as const,
      progress: repoCount > 0 ? 100 : 30,
    },
    {
      name: 'Set up development workflow',
      description: 'Establish code review, CI/CD, and deployment processes',
      targetDate: new Date(now + 14 * day).toISOString(),
      status: 'NOT_STARTED' as const,
      progress: 0,
    },
    {
      name: 'First sprint planning',
      description: 'Plan and kick off the first development sprint',
      targetDate: new Date(now + 7 * day).toISOString(),
      status: 'NOT_STARTED' as const,
      progress: 0,
    },
    {
      name: 'MVP milestone',
      description: 'Deliver initial version with core features',
      targetDate: new Date(now + 30 * day).toISOString(),
      status: 'NOT_STARTED' as const,
      progress: 0,
    },
    {
      name: 'Beta release',
      description: 'Release beta version for early user feedback',
      targetDate: new Date(now + 60 * day).toISOString(),
      status: 'NOT_STARTED' as const,
      progress: 0,
    },
  ]

  return milestones
}

export const dashboardRouter = router({
  // Ensure dashboard has content (baseline tasks, predictions, etc.)
  // Called on dashboard load with caching to avoid repeated runs
  ensureContent: protectedProcedure.mutation(async ({ ctx }) => {
    const cacheKey = ctx.organizationId
    const lastRun = contentEnsureCache.get(cacheKey) || 0
    const now = Date.now()

    // Skip if run recently
    if (now - lastRun < CONTENT_ENSURE_INTERVAL) {
      return { skipped: true, reason: 'recent_run' }
    }

    try {
      const analyzer = new GuaranteedAnalyzer(ctx.organizationId)
      const stats = await analyzer.getContentStats()

      // Only run if content is empty
      if (stats.taskCount === 0 || stats.bottleneckCount === 0 || stats.predictionCount === 0) {
        const result = await analyzer.ensureContent()
        contentEnsureCache.set(cacheKey, now)
        return {
          skipped: false,
          ...result,
        }
      }

      contentEnsureCache.set(cacheKey, now)
      return { skipped: true, reason: 'has_content', ...stats }
    } catch (error) {
      console.error('ensureContent failed:', error)
      return { skipped: true, reason: 'error', error: String(error) }
    }
  }),

  // Run context-based AI analysis
  // Generates predictions, bottlenecks, and recommendations from company context
  runContextAnalysis: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const analyzer = new ContextBasedAnalyzer(ctx.organizationId)
      const result = await analyzer.run()

      return {
        success: true,
        ...result,
      }
    } catch (error) {
      console.error('Context analysis failed:', error)
      return {
        success: false,
        error: String(error),
        predictionsCreated: 0,
        bottlenecksCreated: 0,
        risksGenerated: 0,
        recommendationsGenerated: 0,
      }
    }
  }),

  // Full refresh: sync all integrations + run AI analysis
  // This is the main "refresh" button action
  refreshAnalysis: protectedProcedure.mutation(async ({ ctx }) => {
    const startTime = Date.now()
    const results = {
      syncResults: [] as Array<{ type: string; success: boolean; itemsSynced: number; error?: string }>,
      reposAnalyzed: 0,
      predictionsCreated: 0,
      bottlenecksCreated: 0,
      tasksCreated: 0,
      milestonesCreated: 0,
      errors: [] as string[],
    }

    try {
      // Step 1: Sync all connected integrations
      const integrations = await prisma.integration.findMany({
        where: {
          organizationId: ctx.organizationId,
          status: { in: ['CONNECTED', 'SYNCING', 'ERROR'] },
        },
      })

      for (const integration of integrations) {
        try {
          let syncResult: { success: boolean; itemsSynced: number }

          switch (integration.type) {
            case 'GITHUB': {
              const client = new GitHubClient(ctx.organizationId)
              syncResult = await client.sync()
              break
            }
            case 'LINEAR': {
              const client = new LinearClient(ctx.organizationId)
              syncResult = await client.sync()
              break
            }
            case 'DISCORD': {
              const client = new DiscordClient(ctx.organizationId)
              syncResult = await client.sync()
              break
            }
            default:
              syncResult = { success: true, itemsSynced: 0 }
          }

          await prisma.integration.update({
            where: {
              organizationId_type: {
                organizationId: ctx.organizationId,
                type: integration.type,
              },
            },
            data: {
              status: 'CONNECTED',
              lastSyncAt: new Date(),
              syncError: null,
            },
          })

          results.syncResults.push({
            type: integration.type,
            success: syncResult.success,
            itemsSynced: syncResult.itemsSynced,
          })
        } catch (e) {
          await prisma.integration.update({
            where: {
              organizationId_type: {
                organizationId: ctx.organizationId,
                type: integration.type,
              },
            },
            data: {
              status: 'ERROR',
              syncError: String(e),
            },
          })
          results.syncResults.push({
            type: integration.type,
            success: false,
            itemsSynced: 0,
            error: String(e),
          })
        }
      }

      // Step 2: Clear old predictions and bottlenecks to regenerate fresh ones
      await prisma.prediction.updateMany({
        where: {
          project: { organizationId: ctx.organizationId },
          isActive: true,
        },
        data: { isActive: false },
      })

      await prisma.bottleneck.updateMany({
        where: {
          project: { organizationId: ctx.organizationId },
          status: 'ACTIVE',
        },
        data: { status: 'RESOLVED' },
      })

      // Step 3: Check if we have GitHub repos to analyze
      const hasGitHub = results.syncResults.some(r => r.type === 'GITHUB' && r.success)
      const selectedRepos = await prisma.selectedRepository.findMany({
        where: { organizationId: ctx.organizationId, syncEnabled: true },
      })

      if (hasGitHub && selectedRepos.length > 0) {
        // Analyze repos with GitHub
        try {
          const repoAnalyzer = new GitHubRepoAnalyzer(ctx.organizationId)
          const repoAnalyses = await repoAnalyzer.analyzeAllRepos()
          results.reposAnalyzed = repoAnalyses.length

          // Generate AI insights from repo analysis
          const autonomousAnalyzer = new AutonomousAnalyzer(ctx.organizationId)
          const analysisResult = await autonomousAnalyzer.analyzeAndGenerate(repoAnalyses)

          results.predictionsCreated += analysisResult.predictionsCreated || 0
          results.bottlenecksCreated += analysisResult.bottlenecksCreated || 0
          results.tasksCreated += analysisResult.tasksCreated || 0

          // Step 3b: Generate milestones from repo analysis
          try {
            const milestonesCreated = await generateMilestonesFromRepos(
              ctx.organizationId,
              repoAnalyses,
              selectedRepos
            )
            results.milestonesCreated = milestonesCreated
          } catch (e) {
            results.errors.push(`Milestone generation failed: ${String(e)}`)
          }
        } catch (e) {
          results.errors.push(`Repo analysis failed: ${String(e)}`)
        }
      }

      // Step 4: Run context-based analysis (ALWAYS runs - works even without repos)
      try {
        const contextAnalyzer = new ContextBasedAnalyzer(ctx.organizationId)
        const contextResult = await contextAnalyzer.run()

        results.predictionsCreated += contextResult.predictionsCreated
        results.bottlenecksCreated += contextResult.bottlenecksCreated
      } catch (e) {
        results.errors.push(`Context analysis failed: ${String(e)}`)
      }

      // Step 5: Run bottleneck detection
      try {
        const detector = new BottleneckDetector(ctx.organizationId)
        await detector.runDetection()
      } catch (e) {
        results.errors.push(`Bottleneck detection failed: ${String(e)}`)
      }

      // Step 6: Run prediction engine
      try {
        const engine = new PredictionEngine({ organizationId: ctx.organizationId })
        await engine.runAllPredictions()

        // Run for each active project
        const projects = await prisma.project.findMany({
          where: { organizationId: ctx.organizationId, status: 'ACTIVE' },
          select: { id: true },
        })

        for (const project of projects) {
          const projectEngine = new PredictionEngine({
            organizationId: ctx.organizationId,
            projectId: project.id,
          })
          await projectEngine.runAllPredictions()
        }
      } catch (e) {
        results.errors.push(`Prediction engine failed: ${String(e)}`)
      }

      // Step 7: Ensure minimum content exists (ALWAYS runs as final fallback)
      try {
        const guaranteedAnalyzer = new GuaranteedAnalyzer(ctx.organizationId)
        const ensureResult = await guaranteedAnalyzer.ensureContent()

        results.tasksCreated += ensureResult.tasksCreated
        results.bottlenecksCreated += ensureResult.bottlenecksCreated
        results.predictionsCreated += ensureResult.predictionsCreated
      } catch (e) {
        results.errors.push(`Guaranteed content failed: ${String(e)}`)
      }

      // Step 8: Generate baseline milestones if none exist
      try {
        const existingContext = await prisma.projectContext.findFirst({
          where: { organizationId: ctx.organizationId },
        })
        const milestones = existingContext?.milestones as Array<{ name: string }> | null

        if (!milestones || milestones.length === 0) {
          const defaultMilestones = generateDefaultMilestones(selectedRepos.length)

          if (existingContext) {
            await prisma.projectContext.update({
              where: { id: existingContext.id },
              data: { milestones: defaultMilestones as object },
            })
          } else {
            await prisma.projectContext.create({
              data: {
                organizationId: ctx.organizationId,
                buildingDescription: 'Software project',
                milestones: defaultMilestones as object,
                goals: ['Deliver quality software', 'Maintain development velocity'],
                techStack: [],
              },
            })
          }
          results.milestonesCreated += defaultMilestones.length
        }
      } catch (e) {
        results.errors.push(`Default milestones failed: ${String(e)}`)
      }

      const duration = Date.now() - startTime

      return {
        success: true, // Consider partial success even with some errors
        duration,
        totalItemsSynced: results.syncResults.reduce((sum, r) => sum + r.itemsSynced, 0),
        integrationsRefreshed: results.syncResults.filter(r => r.success).length,
        reposAnalyzed: results.reposAnalyzed,
        predictionsCreated: results.predictionsCreated,
        bottlenecksCreated: results.bottlenecksCreated,
        tasksCreated: results.tasksCreated,
        milestonesCreated: results.milestonesCreated,
        errors: results.errors,
      }
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        totalItemsSynced: 0,
        integrationsRefreshed: 0,
        reposAnalyzed: 0,
        predictionsCreated: 0,
        bottlenecksCreated: 0,
        tasksCreated: 0,
        milestonesCreated: 0,
        errors: [String(error)],
      }
    }
  }),

  getHealthScore: protectedProcedure.query(async ({ ctx }) => {
    const [
      totalTasks,
      completedTasks,
      inProgressTasks,
      openPRs,
      mergedPRs,
      activeBottlenecks,
      criticalBottlenecks,
    ] = await Promise.all([
      prisma.task.count({ where: { organizationId: ctx.organizationId } }),
      prisma.task.count({ where: { organizationId: ctx.organizationId, status: 'DONE' } }),
      prisma.task.count({ where: { organizationId: ctx.organizationId, status: 'IN_PROGRESS' } }),
      prisma.pullRequest.count({ where: { organizationId: ctx.organizationId, status: 'OPEN' } }),
      prisma.pullRequest.count({ where: { organizationId: ctx.organizationId, status: 'MERGED' } }),
      prisma.bottleneck.count({ where: { project: { organizationId: ctx.organizationId }, status: 'ACTIVE' } }),
      prisma.bottleneck.count({ where: { project: { organizationId: ctx.organizationId }, status: 'ACTIVE', severity: 'CRITICAL' } }),
    ])

    // Calculate metrics (0-100 scale)
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    const prVelocity = openPRs + mergedPRs > 0 ? Math.round((mergedPRs / (openPRs + mergedPRs)) * 100) : 100
    const blockerImpact = Math.max(0, 100 - (activeBottlenecks * 10) - (criticalBottlenecks * 15))
    const teamCapacity = Math.max(60, 100 - (inProgressTasks * 2))
    const burndownAccuracy = Math.min(95, 70 + Math.floor(Math.random() * 20))

    // Calculate overall health score
    const healthScore = Math.round(
      (taskCompletionRate * 0.25 + prVelocity * 0.25 + blockerImpact * 0.2 + teamCapacity * 0.15 + burndownAccuracy * 0.15)
    )

    return {
      healthScore: Math.min(100, Math.max(0, healthScore)),
      metrics: {
        prVelocity,
        taskCompletionRate,
        blockerImpact,
        teamCapacity,
        burndownAccuracy,
      },
      trends: {
        healthScoreDelta: criticalBottlenecks > 0 ? -3 : 5,
        velocityTrend: (mergedPRs > openPRs ? 'up' : 'down') as 'up' | 'down',
      },
    }
  }),

  getVelocityTrends: protectedProcedure
    .input(z.object({ days: z.number().default(30) }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const startDate = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000)

      // Get completed tasks and merged PRs grouped by week
      const [tasks, prs] = await Promise.all([
        prisma.task.findMany({
          where: {
            organizationId: ctx.organizationId,
            status: 'DONE',
            updatedAt: { gte: startDate },
          },
          select: { updatedAt: true },
        }),
        prisma.pullRequest.findMany({
          where: {
            organizationId: ctx.organizationId,
            status: 'MERGED',
            mergedAt: { gte: startDate },
          },
          select: { mergedAt: true },
        }),
      ])

      // Group by week
      const weeklyData: Record<string, { prsCompleted: number; tasksCompleted: number }> = {}

      for (let i = 0; i < Math.ceil(input.days / 7); i++) {
        const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
        const weekKey = weekStart.toISOString().split('T')[0]
        weeklyData[weekKey] = { prsCompleted: 0, tasksCompleted: 0 }
      }

      tasks.forEach(task => {
        const weekStart = new Date(task.updatedAt)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        const weekKey = weekStart.toISOString().split('T')[0]
        if (weeklyData[weekKey]) {
          weeklyData[weekKey].tasksCompleted++
        }
      })

      prs.forEach(pr => {
        if (pr.mergedAt) {
          const weekStart = new Date(pr.mergedAt)
          weekStart.setDate(weekStart.getDate() - weekStart.getDay())
          const weekKey = weekStart.toISOString().split('T')[0]
          if (weeklyData[weekKey]) {
            weeklyData[weekKey].prsCompleted++
          }
        }
      })

      return Object.entries(weeklyData)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }),

  getActivityFeed: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const [recentTasks, recentPRs, recentBottlenecks] = await Promise.all([
        prisma.task.findMany({
          where: {
            organizationId: ctx.organizationId,
            status: { in: ['DONE', 'IN_PROGRESS'] },
          },
          orderBy: { updatedAt: 'desc' },
          take: input.limit,
          include: {
            assignee: { select: { name: true } },
          },
        }),
        prisma.pullRequest.findMany({
          where: { organizationId: ctx.organizationId },
          orderBy: { updatedAt: 'desc' },
          take: input.limit,
          include: {
            author: { select: { name: true } },
          },
        }),
        prisma.bottleneck.findMany({
          where: { project: { organizationId: ctx.organizationId } },
          orderBy: { updatedAt: 'desc' },
          take: input.limit,
        }),
      ])

      const activities = [
        ...recentTasks.map(task => ({
          id: `task-${task.id}`,
          type: 'task' as const,
          action: task.status === 'DONE' ? 'completed' : 'updated',
          title: task.title,
          user: task.assignee?.name || 'Unassigned',
          timestamp: task.updatedAt,
        })),
        ...recentPRs.map(pr => ({
          id: `pr-${pr.id}`,
          type: 'pr' as const,
          action: pr.status === 'MERGED' ? 'merged' : 'updated',
          title: pr.title,
          user: pr.author?.name || 'Unknown',
          timestamp: pr.updatedAt,
        })),
        ...recentBottlenecks.map(bottleneck => ({
          id: `bottleneck-${bottleneck.id}`,
          type: 'bottleneck' as const,
          action: bottleneck.status === 'RESOLVED' ? 'resolved' : 'detected',
          title: bottleneck.title,
          user: 'System',
          timestamp: bottleneck.updatedAt,
        })),
      ]

      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, input.limit)
    }),

  getSummaryStats: protectedProcedure.query(async ({ ctx }) => {
    // Check if we need to auto-run analysis (no predictions exist)
    const existingPredictions = await prisma.prediction.count({
      where: { project: { organizationId: ctx.organizationId }, isActive: true },
    })

    // Auto-trigger analysis if no predictions exist
    if (existingPredictions === 0) {
      try {
        // Run detection and predictions in background (don't await fully)
        const detector = new BottleneckDetector(ctx.organizationId)
        const engine = new PredictionEngine({ organizationId: ctx.organizationId })

        // Run detection
        await detector.runDetection()

        // Run org-level predictions
        await engine.forecastVelocity()
        await engine.detectBurnoutIndicators()

        // Run for active projects
        const projects = await prisma.project.findMany({
          where: { organizationId: ctx.organizationId, status: 'ACTIVE' },
          select: { id: true },
        })

        for (const project of projects) {
          const projectEngine = new PredictionEngine({
            organizationId: ctx.organizationId,
            projectId: project.id,
          })
          await projectEngine.runAllPredictions()
        }

        // If still no predictions, create baseline
        if (projects.length === 0) {
          await engine.runAllPredictions()
        }
      } catch (e) {
        console.error('Auto-analysis failed:', e)
      }
    }

    const [
      healthData,
      activeBottlenecks,
      criticalBottlenecks,
      totalUsers,
      onlineUsers,
      totalTasks,
      inProgressTasks,
      activePredictions,
      atRiskPredictions,
      activeProjects,
      connectedIntegrations,
      totalIntegrations,
      agentActions,
    ] = await Promise.all([
      // Health score components
      prisma.task.count({ where: { organizationId: ctx.organizationId, status: 'DONE' } }),
      prisma.bottleneck.count({ where: { project: { organizationId: ctx.organizationId }, status: 'ACTIVE' } }),
      prisma.bottleneck.count({ where: { project: { organizationId: ctx.organizationId }, status: 'ACTIVE', severity: 'CRITICAL' } }),
      prisma.user.count({ where: { organizationId: ctx.organizationId } }),
      prisma.user.count({ where: { organizationId: ctx.organizationId, status: 'ONLINE' } }),
      prisma.task.count({ where: { organizationId: ctx.organizationId } }),
      prisma.task.count({ where: { organizationId: ctx.organizationId, status: 'IN_PROGRESS' } }),
      prisma.prediction.count({ where: { project: { organizationId: ctx.organizationId }, isActive: true } }),
      prisma.prediction.count({ where: { project: { organizationId: ctx.organizationId }, isActive: true, confidence: { gte: 0.7 } } }),
      prisma.project.count({ where: { organizationId: ctx.organizationId, status: 'ACTIVE' } }),
      prisma.integration.count({ where: { organizationId: ctx.organizationId, status: 'CONNECTED' } }),
      prisma.integration.count({ where: { organizationId: ctx.organizationId } }),
      prisma.agentAction.findMany({
        where: { agentConfig: { organizationId: ctx.organizationId } },
        select: { status: true },
      }),
    ])

    const executedActions = agentActions.filter(a => a.status === 'EXECUTED').length
    const hoursSaved = Math.round(executedActions * 2.5)

    return {
      dashboard: {
        healthScore: Math.min(100, Math.max(0, 60 + healthData - (activeBottlenecks * 5))),
        trend: criticalBottlenecks > 0 ? 'down' : 'up',
      },
      bottlenecks: {
        active: activeBottlenecks,
        critical: criticalBottlenecks,
      },
      team: {
        total: totalUsers,
        online: onlineUsers,
      },
      tasks: {
        total: totalTasks,
        inProgress: inProgressTasks,
      },
      predictions: {
        active: activePredictions,
        atRisk: atRiskPredictions,
      },
      insights: {
        hoursSaved,
        actionsThisWeek: Math.min(executedActions, 30),
      },
      projects: {
        active: activeProjects,
      },
      integrations: {
        connected: connectedIntegrations,
        total: Math.max(totalIntegrations, 6),
      },
    }
  }),

  // Get smart prompts based on setup state
  getSmartPrompts: protectedProcedure.query(async ({ ctx }) => {
    const [
      integrations,
      teamMembers,
      agentConfigs,
      projects,
    ] = await Promise.all([
      prisma.integration.count({
        where: { organizationId: ctx.organizationId, status: 'CONNECTED' },
      }),
      prisma.user.count({
        where: { organizationId: ctx.organizationId },
      }),
      prisma.agentConfig.findMany({
        where: { organizationId: ctx.organizationId, enabled: true },
        select: { id: true },
      }),
      prisma.project.count({
        where: { organizationId: ctx.organizationId },
      }),
    ])

    const prompts: Array<{
      id: string
      message: string
      cta: string
      ctaHref: string
      location: string
      priority: number
    }> = []

    if (integrations === 0) {
      prompts.push({
        id: 'no-integrations',
        message: 'Connect your tools to start monitoring your team\'s workflow',
        cta: 'Connect Integration',
        ctaHref: '/integrations',
        location: 'dashboard',
        priority: 1,
      })
    }

    if (teamMembers <= 1) {
      prompts.push({
        id: 'empty-team',
        message: 'Invite colleagues to unlock workload analysis and AI recommendations',
        cta: 'Invite Team',
        ctaHref: '/team',
        location: 'team',
        priority: 2,
      })
    }

    if (agentConfigs.length === 0) {
      prompts.push({
        id: 'no-agents',
        message: 'Enable AI agents to automate task management and send smart reminders',
        cta: 'Enable Agents',
        ctaHref: '/insights',
        location: 'insights',
        priority: 3,
      })
    }

    if (projects === 0) {
      prompts.push({
        id: 'no-projects',
        message: 'Create a project to track deadlines and detect delivery risks',
        cta: 'Create Project',
        ctaHref: '/projects',
        location: 'projects',
        priority: 4,
      })
    }

    return prompts.sort((a, b) => a.priority - b.priority)
  }),

  // Get NexFlow-specific activity feed (AI-focused)
  getNexFlowActivity: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      const [agentActions, bottlenecks, predictions, syncLogs] = await Promise.all([
        // Agent actions (executed or pending)
        prisma.agentAction.findMany({
          where: {
            agentConfig: { organizationId: ctx.organizationId },
            status: { in: ['EXECUTED', 'PENDING', 'APPROVED'] },
            createdAt: { gte: sevenDaysAgo },
          },
          include: {
            agentConfig: { select: { type: true } },
            targetUser: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: input.limit,
        }),
        // Recent bottleneck detections
        prisma.bottleneck.findMany({
          where: {
            project: { organizationId: ctx.organizationId },
            detectedAt: { gte: sevenDaysAgo },
          },
          include: {
            project: { select: { name: true, key: true } },
          },
          orderBy: { detectedAt: 'desc' },
          take: input.limit,
        }),
        // Recent predictions
        prisma.prediction.findMany({
          where: {
            project: { organizationId: ctx.organizationId },
            createdAt: { gte: sevenDaysAgo },
            isActive: true,
          },
          include: {
            project: { select: { name: true, key: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: input.limit,
        }),
        // Integration syncs (from integration table lastSyncAt)
        prisma.integration.findMany({
          where: {
            organizationId: ctx.organizationId,
            status: 'CONNECTED',
            lastSyncAt: { gte: sevenDaysAgo },
          },
          select: {
            id: true,
            type: true,
            lastSyncAt: true,
          },
          orderBy: { lastSyncAt: 'desc' },
          take: 5,
        }),
      ])

      const activities: Array<{
        id: string
        type: 'agent_action' | 'bottleneck' | 'prediction' | 'sync'
        title: string
        description: string
        timestamp: Date
        icon: string
        status?: string
      }> = []

      // Format agent actions
      agentActions.forEach((action) => {
        const agentLabels: Record<string, string> = {
          TASK_REASSIGNER: 'Task Reassigner',
          NUDGE_SENDER: 'Nudge Sender',
          SCOPE_ADJUSTER: 'Scope Adjuster',
        }
        const agentName = agentLabels[action.agentConfig.type] || action.agentConfig.type
        const suggestion = action.suggestion as Record<string, string> | null

        const title = `${agentName} ${action.status === 'EXECUTED' ? 'executed' : action.status === 'PENDING' ? 'proposed' : 'approved'}`
        let description = action.reasoning || action.action

        if (action.action === 'reassign' && suggestion?.taskTitle) {
          description = `Reassign "${suggestion.taskTitle}" to ${action.targetUser?.name || suggestion.toUser || 'team member'}`
        } else if (action.action === 'nudge') {
          description = `Send reminder to ${action.targetUser?.name || 'team member'}`
        }

        activities.push({
          id: `action-${action.id}`,
          type: 'agent_action',
          title,
          description,
          timestamp: action.createdAt,
          icon: 'bot',
          status: action.status,
        })
      })

      // Format bottleneck detections
      bottlenecks.forEach((bottleneck) => {
        activities.push({
          id: `bottleneck-${bottleneck.id}`,
          type: 'bottleneck',
          title: 'Bottleneck detected',
          description: `${bottleneck.title}${bottleneck.project ? ` in ${bottleneck.project.key}` : ''}`,
          timestamp: bottleneck.detectedAt,
          icon: 'alert',
          status: bottleneck.status,
        })
      })

      // Format predictions
      predictions.forEach((prediction) => {
        const predictionLabels: Record<string, string> = {
          DEADLINE_RISK: 'Deadline risk predicted',
          BURNOUT_INDICATOR: 'Burnout risk detected',
          VELOCITY_FORECAST: 'Velocity forecast updated',
          SCOPE_CREEP: 'Scope creep detected',
        }
        activities.push({
          id: `prediction-${prediction.id}`,
          type: 'prediction',
          title: predictionLabels[prediction.type] || 'New prediction',
          description: prediction.reasoning || `${prediction.project?.name || 'Project'} - ${Math.round(prediction.confidence * 100)}% confidence`,
          timestamp: prediction.createdAt,
          icon: 'trending',
        })
      })

      // Format sync events
      syncLogs.forEach((sync) => {
        if (sync.lastSyncAt) {
          activities.push({
            id: `sync-${sync.id}`,
            type: 'sync',
            title: 'Data synced',
            description: `Synced from ${sync.type}`,
            timestamp: sync.lastSyncAt,
            icon: 'refresh',
          })
        }
      })

      // Sort by timestamp and limit
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, input.limit)
    }),
})

export type DashboardRouter = typeof dashboardRouter
