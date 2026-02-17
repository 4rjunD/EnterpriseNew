import { prisma, TaskStatus, TaskPriority, TaskSource, BottleneckType, BottleneckSeverity, PredictionType } from '@nexflow/database'
import Anthropic from '@anthropic-ai/sdk'
import { ContextBasedAnalyzer } from './context-analyzer'

interface ContentStats {
  taskCount: number
  bottleneckCount: number
  predictionCount: number
  selectedRepoCount: number
}

interface AnalysisResult extends ContentStats {
  tasksCreated: number
  bottlenecksCreated: number
  predictionsCreated: number
  contextAnalysisRan: boolean
}

/**
 * GuaranteedAnalyzer ensures the dashboard is NEVER empty after GitHub connection.
 * It provides baseline content when repos haven't been analyzed yet, and generates
 * real insights once repo analysis is available.
 *
 * For new accounts, it uses ContextBasedAnalyzer to generate AI-powered insights
 * from company context (industry, stage, methodology, etc.).
 */
export class GuaranteedAnalyzer {
  private organizationId: string
  private anthropic: Anthropic | null = null

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  private getAnthropicClient(): Anthropic {
    if (!this.anthropic) {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not set')
      }
      this.anthropic = new Anthropic({ apiKey })
    }
    return this.anthropic
  }

  /**
   * Get or create a default project for this org.
   * Predictions and bottlenecks require a projectId to be queryable.
   */
  private async getOrCreateDefaultProject(): Promise<string> {
    const existing = await prisma.project.findFirst({
      where: { organizationId: this.organizationId },
    })
    if (existing) return existing.id

    const org = await prisma.organization.findUnique({
      where: { id: this.organizationId },
    })
    const project = await prisma.project.create({
      data: {
        organizationId: this.organizationId,
        name: org?.name || 'General',
        key: 'GEN',
        description: 'Default project for organization-wide insights',
      },
    })
    return project.id
  }

  /**
   * Main entry point: ensures dashboard has content after GitHub connection.
   * Call this after: OAuth, repo selection, sync, or dashboard load (with caching).
   */
  async ensureContent(): Promise<AnalysisResult> {
    let tasksCreated = 0
    let bottlenecksCreated = 0
    let predictionsCreated = 0
    let contextAnalysisRan = false

    // 0. Ensure a default project exists (predictions/bottlenecks need projectId to be queryable)
    const projectId = await this.getOrCreateDefaultProject()

    // 1. Get selected repos
    const selectedRepos = await prisma.selectedRepository.findMany({
      where: { organizationId: this.organizationId, syncEnabled: true },
    })

    // 2. Get current content stats
    const stats = await this.getContentStats()

    // 3. Check if we should run context-based analysis
    // Run if: no repos selected AND (no tasks OR no predictions OR no bottlenecks)
    const needsContextAnalysis =
      selectedRepos.length === 0 &&
      (stats.taskCount === 0 || stats.bottleneckCount === 0 || stats.predictionCount === 0)

    if (needsContextAnalysis) {
      // Try context-based AI analysis first
      try {
        const contextAnalyzer = new ContextBasedAnalyzer(this.organizationId)
        const contextResults = await contextAnalyzer.run()

        // ContextBasedAnalyzer doesn't create tasks, only predictions/bottlenecks/risks/recommendations
        bottlenecksCreated += contextResults.bottlenecksCreated
        predictionsCreated += contextResults.predictionsCreated
        contextAnalysisRan = true

        // Return early if context analysis generated content
        if (bottlenecksCreated > 0 || predictionsCreated > 0) {
          return {
            ...stats,
            selectedRepoCount: selectedRepos.length,
            tasksCreated,
            bottlenecksCreated,
            predictionsCreated,
            contextAnalysisRan,
          }
        }
      } catch (error) {
        console.error('Context-based analysis failed:', error)
        // Fall through to baseline generation
      }
    }

    // 4. Ensure minimum tasks
    if (stats.taskCount === 0 && tasksCreated === 0) {
      if (selectedRepos.length > 0) {
        tasksCreated = await this.generateTasksFromRepos(selectedRepos)
      }
      // Always ensure baseline tasks exist
      if (tasksCreated === 0) {
        tasksCreated = await this.createBaselineTasks()
      }
    }

    // 5. Ensure minimum bottlenecks (risks)
    if (stats.bottleneckCount === 0 && bottlenecksCreated === 0) {
      if (selectedRepos.length > 0) {
        bottlenecksCreated = await this.generateBottlenecksFromRepos(selectedRepos, projectId)
      }
      if (bottlenecksCreated === 0) {
        bottlenecksCreated = await this.createBaselineBottlenecks(projectId)
      }
    }

    // 6. Ensure minimum predictions
    if (stats.predictionCount === 0 && predictionsCreated === 0) {
      if (selectedRepos.length > 0) {
        predictionsCreated = await this.generatePredictionsFromRepos(selectedRepos, projectId)
      }
      if (predictionsCreated === 0) {
        predictionsCreated = await this.createBaselinePredictions(projectId)
      }
    }

    return {
      ...stats,
      selectedRepoCount: selectedRepos.length,
      tasksCreated,
      bottlenecksCreated,
      predictionsCreated,
      contextAnalysisRan,
    }
  }

  async getContentStats(): Promise<ContentStats> {
    const [taskCount, bottleneckCount, predictionCount, selectedRepoCount] = await Promise.all([
      prisma.task.count({
        where: { organizationId: this.organizationId },
      }),
      prisma.bottleneck.count({
        where: {
          status: 'ACTIVE',
          OR: [
            { project: { organizationId: this.organizationId } },
            { projectId: null },
          ],
        },
      }),
      prisma.prediction.count({
        where: {
          isActive: true,
          OR: [
            { project: { organizationId: this.organizationId } },
            { projectId: null },
          ],
        },
      }),
      prisma.selectedRepository.count({
        where: { organizationId: this.organizationId },
      }),
    ])

    return { taskCount, bottleneckCount, predictionCount, selectedRepoCount }
  }

  /**
   * Generate tasks from selected repositories using AI analysis.
   */
  private async generateTasksFromRepos(repos: Array<{ fullName: string; todoCount: number; openIssueCount: number; openPRCount: number }>): Promise<number> {
    let created = 0

    // Get any cached analysis
    const caches = await prisma.repoAnalysisCache.findMany({
      where: {
        organizationId: this.organizationId,
        repoFullName: { in: repos.map(r => r.fullName) },
      },
    })

    // Create tasks from cached TODOs/FIXMEs
    for (const cache of caches) {
      const insights = cache.codeInsights as { todos?: Array<{ text: string; file: string; line: number }> } | null
      if (insights?.todos) {
        for (const todo of insights.todos.slice(0, 5)) { // Limit to 5 per repo
          await prisma.task.create({
            data: {
              title: `[${cache.repoFullName}] ${todo.text.slice(0, 100)}`,
              description: `Found in ${todo.file}:${todo.line}`,
              status: TaskStatus.TODO,
              priority: todo.text.toLowerCase().includes('fixme') ? TaskPriority.HIGH : TaskPriority.MEDIUM,
              source: TaskSource.INTERNAL,
              organizationId: this.organizationId,
              labels: ['from-code', 'auto-detected'],
            },
          })
          created++
        }
      }
    }

    // Create tasks from open PRs
    const openPRs = await prisma.pullRequest.findMany({
      where: {
        organizationId: this.organizationId,
        status: 'OPEN',
        repository: { in: repos.map(r => r.fullName) },
      },
      take: 10,
    })

    for (const pr of openPRs) {
      const existingTask = await prisma.task.findFirst({
        where: {
          organizationId: this.organizationId,
          title: { contains: `Review PR #${pr.number}` },
        },
      })

      if (!existingTask) {
        await prisma.task.create({
          data: {
            title: `Review PR #${pr.number}: ${pr.title.slice(0, 80)}`,
            description: `Pull request needs review: ${pr.url}`,
            status: TaskStatus.TODO,
            priority: pr.isDraft ? TaskPriority.LOW : TaskPriority.HIGH,
            source: TaskSource.INTERNAL,
            organizationId: this.organizationId,
            externalUrl: pr.url,
            labels: ['pr-review', 'auto-detected'],
          },
        })
        created++
      }
    }

    return created
  }

  /**
   * Create baseline tasks when no repo-specific tasks are available.
   */
  private async createBaselineTasks(): Promise<number> {
    const baseTasks = [
      {
        title: 'Set up continuous integration (CI)',
        description: 'Configure GitHub Actions, CircleCI, or similar for automated builds and tests',
        priority: TaskPriority.HIGH,
        labels: ['infrastructure', 'ci-cd'],
      },
      {
        title: 'Add automated testing',
        description: 'Implement unit tests and integration tests for critical paths',
        priority: TaskPriority.HIGH,
        labels: ['testing', 'quality'],
      },
      {
        title: 'Create project documentation',
        description: 'Add README, contributing guidelines, and architecture documentation',
        priority: TaskPriority.MEDIUM,
        labels: ['documentation'],
      },
      {
        title: 'Configure error monitoring',
        description: 'Set up Sentry, LogRocket, or similar for production error tracking',
        priority: TaskPriority.MEDIUM,
        labels: ['infrastructure', 'monitoring'],
      },
      {
        title: 'Review and merge open pull requests',
        description: 'Go through pending PRs to unblock teammates and maintain velocity',
        priority: TaskPriority.HIGH,
        labels: ['pr-review'],
      },
    ]

    let created = 0
    for (const task of baseTasks) {
      // Check if similar task already exists
      const existing = await prisma.task.findFirst({
        where: {
          organizationId: this.organizationId,
          title: { contains: task.title.split(' ').slice(0, 3).join(' ') },
        },
      })

      if (!existing) {
        await prisma.task.create({
          data: {
            title: task.title,
            description: task.description,
            status: TaskStatus.TODO,
            priority: task.priority,
            source: TaskSource.INTERNAL,
            organizationId: this.organizationId,
            labels: [...task.labels, 'baseline', 'auto-generated'],
          },
        })
        created++
      }
    }

    return created
  }

  /**
   * Generate bottlenecks from repository analysis.
   */
  private async generateBottlenecksFromRepos(repos: Array<{ fullName: string; openPRCount: number; completenessScore: number | null }>, projectId: string): Promise<number> {
    let created = 0

    // Check for repos with many open PRs
    const highPRRepos = repos.filter(r => r.openPRCount > 5)
    for (const repo of highPRRepos) {
      const existing = await prisma.bottleneck.findFirst({
        where: {
          project: { organizationId: this.organizationId },
          title: { contains: repo.fullName },
          status: 'ACTIVE',
        },
      })

      if (!existing) {
        await prisma.bottleneck.create({
          data: {
            projectId,
            type: BottleneckType.REVIEW_DELAY,
            severity: repo.openPRCount > 10 ? BottleneckSeverity.HIGH : BottleneckSeverity.MEDIUM,
            title: `High PR backlog in ${repo.fullName}`,
            description: `${repo.openPRCount} open pull requests waiting for review. This may slow down delivery velocity.`,
            impact: 'Delayed feature releases and potential merge conflicts',
            status: 'ACTIVE',
          },
        })
        created++
      }
    }

    // Check for repos with low completeness
    const lowCompletenessRepos = repos.filter(r => r.completenessScore !== null && r.completenessScore < 50)
    for (const repo of lowCompletenessRepos.slice(0, 3)) {
      const existing = await prisma.bottleneck.findFirst({
        where: {
          project: { organizationId: this.organizationId },
          title: { contains: `Technical debt in ${repo.fullName}` },
          status: 'ACTIVE',
        },
      })

      if (!existing) {
        await prisma.bottleneck.create({
          data: {
            projectId,
            type: BottleneckType.DEPENDENCY_BLOCK,
            severity: BottleneckSeverity.MEDIUM,
            title: `Technical debt in ${repo.fullName}`,
            description: `Repository completeness score is ${repo.completenessScore}%. Missing tests, CI, or documentation may increase risk.`,
            impact: 'Increased bug risk and slower onboarding for new contributors',
            status: 'ACTIVE',
          },
        })
        created++
      }
    }

    return created
  }

  /**
   * Create baseline bottlenecks when no repo-specific ones exist.
   */
  private async createBaselineBottlenecks(projectId: string): Promise<number> {
    const baselineBottlenecks = [
      {
        type: BottleneckType.REVIEW_DELAY,
        severity: BottleneckSeverity.MEDIUM,
        title: 'Pull request review process needs attention',
        description: 'Ensure PRs are being reviewed promptly to maintain development velocity.',
        impact: 'Delayed merges and potential context switching',
      },
      {
        type: BottleneckType.DEPENDENCY_BLOCK,
        severity: BottleneckSeverity.LOW,
        title: 'Consider adding integration tests',
        description: 'Integration tests help catch issues before they reach production.',
        impact: 'Reduced confidence in deployments',
      },
    ]

    let created = 0
    for (const bottleneck of baselineBottlenecks) {
      const existing = await prisma.bottleneck.findFirst({
        where: {
          project: { organizationId: this.organizationId },
          title: bottleneck.title,
          status: 'ACTIVE',
        },
      })

      if (!existing) {
        await prisma.bottleneck.create({
          data: {
            ...bottleneck,
            projectId,
            status: 'ACTIVE',
          },
        })
        created++
      }
    }

    return created
  }

  /**
   * Generate predictions from repository analysis.
   */
  private async generatePredictionsFromRepos(repos: Array<{ fullName: string; openPRCount: number; todoCount: number }>, projectId: string): Promise<number> {
    let created = 0

    // Calculate aggregate metrics
    const totalOpenPRs = repos.reduce((sum, r) => sum + r.openPRCount, 0)
    const totalTodos = repos.reduce((sum, r) => sum + r.todoCount, 0)

    // Velocity prediction based on PR count
    if (totalOpenPRs > 0) {
      const existing = await prisma.prediction.findFirst({
        where: {
          project: { organizationId: this.organizationId },
          type: PredictionType.VELOCITY_FORECAST,
          isActive: true,
        },
      })

      if (!existing) {
        await prisma.prediction.create({
          data: {
            projectId,
            type: PredictionType.VELOCITY_FORECAST,
            confidence: 0.7,
            value: {
              forecastedVelocity: Math.max(10, 30 - totalOpenPRs),
              trend: totalOpenPRs > 10 ? 'decreasing' : 'stable',
              blockers: totalOpenPRs,
            },
            reasoning: `Based on ${totalOpenPRs} open PRs across ${repos.length} repositories. High PR backlog typically correlates with slower delivery.`,
            isActive: true,
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        })
        created++
      }
    }

    // Technical debt prediction based on TODOs
    if (totalTodos > 10) {
      const existing = await prisma.prediction.findFirst({
        where: {
          project: { organizationId: this.organizationId },
          type: PredictionType.SCOPE_CREEP,
          isActive: true,
        },
      })

      if (!existing) {
        await prisma.prediction.create({
          data: {
            projectId,
            type: PredictionType.SCOPE_CREEP,
            confidence: 0.6,
            value: {
              technicalDebt: totalTodos,
              estimatedHours: Math.round(totalTodos * 0.5),
              risk: totalTodos > 50 ? 'high' : totalTodos > 20 ? 'medium' : 'low',
            },
            reasoning: `Found ${totalTodos} TODO/FIXME comments across the codebase. Each represents potential technical debt that may impact future velocity.`,
            isActive: true,
            validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
          },
        })
        created++
      }
    }

    return created
  }

  /**
   * Create baseline predictions when no repo-specific ones exist.
   */
  private async createBaselinePredictions(projectId: string): Promise<number> {
    const baselinePredictions = [
      {
        type: PredictionType.VELOCITY_FORECAST,
        confidence: 0.5,
        value: {
          status: 'gathering_data',
          message: 'Connect more integrations for accurate velocity predictions',
          forecastedVelocity: null,
        },
        reasoning: 'Velocity predictions require historical data from connected integrations. More data will improve accuracy.',
      },
      {
        type: PredictionType.DEADLINE_RISK,
        confidence: 0.4,
        value: {
          status: 'monitoring',
          riskLevel: 'unknown',
          message: 'Tracking project progress to detect deadline risks',
        },
        reasoning: 'Deadline risk analysis requires project milestones and task completion data. Add milestones for better predictions.',
      },
    ]

    let created = 0
    for (const prediction of baselinePredictions) {
      const existing = await prisma.prediction.findFirst({
        where: {
          project: { organizationId: this.organizationId },
          type: prediction.type,
          isActive: true,
        },
      })

      if (!existing) {
        await prisma.prediction.create({
          data: {
            ...prediction,
            projectId,
            isActive: true,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        })
        created++
      }
    }

    return created
  }

  /**
   * Use AI to generate context-aware insights.
   * Called when we have repo analysis data but want smarter recommendations.
   */
  async generateAIInsights(repoAnalyses: Array<{ fullName: string; structure: unknown; metrics: unknown }>): Promise<void> {
    try {
      const client = this.getAnthropicClient()

      const analysisContext = repoAnalyses.map(r => ({
        repo: r.fullName,
        structure: r.structure,
        metrics: r.metrics,
      }))

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Analyze these repositories and provide 2-3 specific, actionable recommendations:

${JSON.stringify(analysisContext, null, 2)}

Return JSON array with format: [{ "title": "...", "description": "...", "priority": "HIGH|MEDIUM|LOW", "category": "testing|ci|docs|security|performance" }]`,
          },
        ],
      })

      // Parse and create tasks from AI recommendations
      const content = response.content[0]
      if (content.type === 'text') {
        try {
          const jsonMatch = content.text.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            const recommendations = JSON.parse(jsonMatch[0]) as Array<{
              title: string
              description: string
              priority: string
              category: string
            }>

            for (const rec of recommendations) {
              await prisma.task.create({
                data: {
                  title: rec.title,
                  description: rec.description,
                  status: TaskStatus.TODO,
                  priority: rec.priority === 'HIGH' ? TaskPriority.HIGH : rec.priority === 'LOW' ? TaskPriority.LOW : TaskPriority.MEDIUM,
                  source: TaskSource.INTERNAL,
                  organizationId: this.organizationId,
                  labels: ['ai-generated', rec.category],
                },
              })
            }
          }
        } catch (parseError) {
          console.error('Failed to parse AI recommendations:', parseError)
        }
      }
    } catch (error) {
      console.error('AI insights generation failed:', error)
      // Don't throw - fall back to baseline content
    }
  }
}
