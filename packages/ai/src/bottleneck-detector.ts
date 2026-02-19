import {
  prisma,
  BottleneckType,
  BottleneckSeverity,
  BottleneckStatus,
  TaskStatus,
  PRStatus,
  CIStatus,
} from '@nexflow/database'
import { BOTTLENECK_THRESHOLDS } from '@nexflow/config'
import OpenAI from 'openai'

export class BottleneckDetector {
  private organizationId: string
  private openai: OpenAI

  constructor(organizationId: string) {
    this.organizationId = organizationId
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  async runDetection(): Promise<void> {
    await Promise.all([
      this.detectStuckPRs(),
      this.detectStaleTasks(),
      this.detectDependencyBlocks(),
    ])

    // Generate AI insights after detection
    await this.generateAIInsights()

    // Ensure baseline insights exist
    await this.ensureBaselineInsights()
  }

  /**
   * Create baseline insights when there's little to no data
   */
  private async ensureBaselineInsights(): Promise<void> {
    // Check if any bottlenecks exist (include both project-scoped and org-level)
    const existingBottlenecks = await prisma.bottleneck.count({
      where: {
        OR: [
          { project: { organizationId: this.organizationId } },
          { projectId: null },
        ],
        status: BottleneckStatus.ACTIVE,
      },
    })

    if (existingBottlenecks > 0) return

    // Get data state
    const [tasks, prs, integrations, projectContext] = await Promise.all([
      prisma.task.count({
        where: { project: { organizationId: this.organizationId } },
      }),
      prisma.pullRequest.count({
        where: { project: { organizationId: this.organizationId } },
      }),
      prisma.integration.findMany({
        where: { organizationId: this.organizationId, status: 'CONNECTED' },
        select: { type: true },
      }),
      prisma.projectContext.findFirst({
        where: { organizationId: this.organizationId },
      }),
    ])

    // Get or create a default project for insights
    let project = await prisma.project.findFirst({
      where: { organizationId: this.organizationId },
    })

    if (!project) {
      // Create a default project for insights
      project = await prisma.project.create({
        data: {
          name: 'Workspace Overview',
          key: 'WO',
          description: 'Default project for workspace-level insights',
          organizationId: this.organizationId,
          status: 'ACTIVE',
        },
      })
    }

    const suggestions: string[] = []

    // Check for missing integrations
    const connectedTypes = integrations.map((i) => i.type)
    if (!connectedTypes.includes('GITHUB') && !connectedTypes.includes('LINEAR')) {
      suggestions.push('Connect GitHub or Linear to track tasks and pull requests')
    }
    if (!connectedTypes.includes('SLACK') && !connectedTypes.includes('DISCORD')) {
      suggestions.push('Connect Slack or Discord for AI-powered notifications')
    }
    if (!projectContext) {
      suggestions.push('Add project context in onboarding for smarter AI recommendations')
    }

    // Create setup recommendation bottleneck if integrations are missing
    if (suggestions.length > 0) {
      await prisma.bottleneck.upsert({
        where: { id: `setup-${this.organizationId}` },
        create: {
          id: `setup-${this.organizationId}`,
          type: BottleneckType.REVIEW_DELAY,
          severity: BottleneckSeverity.LOW,
          title: 'Complete setup to unlock AI insights',
          description: suggestions.join('. ') + '.',
          impact: 'Limited data available for AI analysis',
          status: BottleneckStatus.ACTIVE,
          projectId: project.id,
        },
        update: {
          description: suggestions.join('. ') + '.',
        },
      })
    }

    // If we have some data, create a positive status bottleneck
    if (tasks > 0 || prs > 0) {
      await prisma.bottleneck.upsert({
        where: { id: `status-${this.organizationId}` },
        create: {
          id: `status-${this.organizationId}`,
          type: BottleneckType.REVIEW_DELAY,
          severity: BottleneckSeverity.LOW,
          title: 'Monitoring active',
          description: `Tracking ${tasks} task(s) and ${prs} PR(s). No critical bottlenecks detected.`,
          impact: 'System is healthy',
          status: BottleneckStatus.ACTIVE,
          projectId: project.id,
        },
        update: {
          description: `Tracking ${tasks} task(s) and ${prs} PR(s). No critical bottlenecks detected.`,
        },
      })
    }
  }

  /**
   * Generate AI-powered insights about detected bottlenecks
   */
  private async generateAIInsights(): Promise<void> {
    // Skip if no API key configured
    if (!process.env.OPENAI_API_KEY) {
      return
    }

    try {
      // Get active bottlenecks and project context
      const [bottlenecks, projectContext] = await Promise.all([
        prisma.bottleneck.findMany({
          where: {
            status: BottleneckStatus.ACTIVE,
            project: { organizationId: this.organizationId },
          },
          include: {
            project: true,
            task: { include: { assignee: true } },
            pullRequest: { include: { author: true } },
          },
          take: 10, // Limit to avoid token overload
        }),
        prisma.projectContext.findFirst({
          where: { organizationId: this.organizationId },
        }),
      ])

      if (bottlenecks.length === 0) {
        return
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an AI engineering manager analyzing bottlenecks.

PROJECT CONTEXT:
${projectContext ? `Building: ${projectContext.buildingDescription}\nGoals: ${projectContext.goals?.join(', ') || 'Not specified'}` : 'No project context available.'}

Analyze the bottlenecks and provide actionable insights. Focus on:
1. Which bottlenecks are most critical to project success
2. Root cause patterns across bottlenecks
3. Specific recommendations for the team

Respond with JSON:
{
  "insights": [
    {
      "title": "string",
      "description": "string",
      "priority": "high" | "medium" | "low",
      "affectedBottlenecks": ["bottleneck_id"],
      "recommendation": "string"
    }
  ],
  "overallRisk": "high" | "medium" | "low",
  "summary": "string"
}`,
          },
          {
            role: 'user',
            content: `Analyze these active bottlenecks:\n${JSON.stringify(
              bottlenecks.map((b) => ({
                id: b.id,
                type: b.type,
                severity: b.severity,
                title: b.title,
                description: b.description,
                impact: b.impact,
                project: b.project?.name,
                task: b.task ? { title: b.task.title, assignee: b.task.assignee?.name } : null,
                pr: b.pullRequest
                  ? { title: b.pullRequest.title, author: b.pullRequest.author?.name }
                  : null,
              })),
              null,
              2
            )}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1000,
        temperature: 0.3,
      })

      const content = response.choices[0]?.message?.content
      if (!content) return

      const analysis = JSON.parse(content) as {
        insights: Array<{
          title: string
          description: string
          priority: string
          recommendation: string
        }>
        overallRisk: string
        summary: string
      }

      // Store insights as predictions of type DEADLINE_RISK (or we could add a new type)
      // For now, update the first active project's prediction or create a new one
      const activeProject = await prisma.project.findFirst({
        where: {
          organizationId: this.organizationId,
          status: 'ACTIVE',
        },
      })

      if (activeProject && analysis.insights.length > 0) {
        await prisma.prediction.upsert({
          where: {
            id: `ai-insights-${this.organizationId}`,
          },
          create: {
            id: `ai-insights-${this.organizationId}`,
            type: 'DEADLINE_RISK',
            confidence: analysis.overallRisk === 'high' ? 0.9 : analysis.overallRisk === 'medium' ? 0.6 : 0.3,
            value: {
              title: 'AI-Generated Bottleneck Insights',
              riskLevel: analysis.overallRisk,
              insights: analysis.insights,
            },
            reasoning: analysis.summary,
            isActive: true,
            projectId: activeProject.id,
          },
          update: {
            confidence: analysis.overallRisk === 'high' ? 0.9 : analysis.overallRisk === 'medium' ? 0.6 : 0.3,
            value: {
              title: 'AI-Generated Bottleneck Insights',
              riskLevel: analysis.overallRisk,
              insights: analysis.insights,
            },
            reasoning: analysis.summary,
            updatedAt: new Date(),
          },
        })
      }
    } catch (error) {
      console.error('Failed to generate AI insights:', error)
    }
  }

  private async detectStuckPRs(): Promise<void> {
    const { daysWithoutActivity, unresolvedCommentsThreshold } = BOTTLENECK_THRESHOLDS.stuckPR
    const cutoffDate = new Date(Date.now() - daysWithoutActivity * 24 * 60 * 60 * 1000)

    const prs = await prisma.pullRequest.findMany({
      where: {
        project: { organizationId: this.organizationId },
        status: PRStatus.OPEN,
        OR: [
          { lastActivityAt: { lt: cutoffDate } },
          { unresolvedComments: { gte: unresolvedCommentsThreshold } },
          { ciStatus: CIStatus.FAILING },
        ],
      },
      include: {
        project: true,
        author: true,
      },
    })

    for (const pr of prs) {
      // Calculate severity
      let severity: BottleneckSeverity = BottleneckSeverity.MEDIUM
      const factors: string[] = []

      if (pr.lastActivityAt && pr.lastActivityAt < cutoffDate) {
        const daysSinceActivity = Math.floor(
          (Date.now() - pr.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)
        )
        factors.push(`${daysSinceActivity} days without activity`)
        if (daysSinceActivity > daysWithoutActivity * 2) {
          severity = BottleneckSeverity.CRITICAL
        } else if (daysSinceActivity > daysWithoutActivity * 1.5) {
          severity = BottleneckSeverity.HIGH
        }
      }

      if (pr.unresolvedComments >= unresolvedCommentsThreshold) {
        factors.push(`${pr.unresolvedComments} unresolved comments`)
        if (severity !== BottleneckSeverity.CRITICAL) {
          severity = BottleneckSeverity.HIGH
        }
      }

      if (pr.ciStatus === CIStatus.FAILING) {
        factors.push('CI is failing')
        if (severity !== BottleneckSeverity.CRITICAL) {
          severity = BottleneckSeverity.HIGH
        }
      }

      // Mark PR as stuck
      await prisma.pullRequest.update({
        where: { id: pr.id },
        data: {
          isStuck: true,
          stuckAt: pr.stuckAt || new Date(),
        },
      })

      // Create or update bottleneck
      await prisma.bottleneck.upsert({
        where: {
          id: `stuck-pr-${pr.id}`,
        },
        create: {
          id: `stuck-pr-${pr.id}`,
          type: BottleneckType.STUCK_PR,
          severity,
          title: `PR #${pr.number} is stuck`,
          description: factors.join('. '),
          impact: pr.project ? `Blocking progress on ${pr.project.name}` : undefined,
          status: BottleneckStatus.ACTIVE,
          pullRequestId: pr.id,
          projectId: pr.projectId,
        },
        update: {
          severity,
          description: factors.join('. '),
        },
      })
    }

    // Resolve bottlenecks for PRs that are no longer stuck
    await prisma.bottleneck.updateMany({
      where: {
        type: BottleneckType.STUCK_PR,
        status: BottleneckStatus.ACTIVE,
        pullRequest: {
          OR: [
            { status: { not: PRStatus.OPEN } },
            {
              lastActivityAt: { gte: cutoffDate },
              unresolvedComments: { lt: unresolvedCommentsThreshold },
              ciStatus: { not: CIStatus.FAILING },
            },
          ],
        },
      },
      data: {
        status: BottleneckStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    })
  }

  private async detectStaleTasks(): Promise<void> {
    const { daysInProgress } = BOTTLENECK_THRESHOLDS.staleTask
    const cutoffDate = new Date(Date.now() - daysInProgress * 24 * 60 * 60 * 1000)

    const tasks = await prisma.task.findMany({
      where: {
        project: { organizationId: this.organizationId },
        status: TaskStatus.IN_PROGRESS,
        updatedAt: { lt: cutoffDate },
      },
      include: {
        project: true,
        assignee: true,
      },
    })

    for (const task of tasks) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      let severity: BottleneckSeverity = BottleneckSeverity.MEDIUM
      if (daysSinceUpdate > daysInProgress * 3) {
        severity = BottleneckSeverity.CRITICAL
      } else if (daysSinceUpdate > daysInProgress * 2) {
        severity = BottleneckSeverity.HIGH
      }

      // Mark task as stale
      await prisma.task.update({
        where: { id: task.id },
        data: {
          isStale: true,
          staleAt: task.staleAt || new Date(),
        },
      })

      // Create or update bottleneck
      await prisma.bottleneck.upsert({
        where: {
          id: `stale-task-${task.id}`,
        },
        create: {
          id: `stale-task-${task.id}`,
          type: BottleneckType.STALE_TASK,
          severity,
          title: `Task stale for ${daysSinceUpdate} days`,
          description: `"${task.title}" has been in progress without updates`,
          impact: task.blocksIds.length > 0 ? `Blocking ${task.blocksIds.length} other task(s)` : undefined,
          status: BottleneckStatus.ACTIVE,
          taskId: task.id,
          projectId: task.projectId,
        },
        update: {
          severity,
          title: `Task stale for ${daysSinceUpdate} days`,
        },
      })
    }

    // Resolve bottlenecks for tasks that are no longer stale
    await prisma.bottleneck.updateMany({
      where: {
        type: BottleneckType.STALE_TASK,
        status: BottleneckStatus.ACTIVE,
        task: {
          OR: [
            { status: { not: TaskStatus.IN_PROGRESS } },
            { updatedAt: { gte: cutoffDate } },
          ],
        },
      },
      data: {
        status: BottleneckStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    })
  }

  private async detectDependencyBlocks(): Promise<void> {
    const { blockedTasksThreshold } = BOTTLENECK_THRESHOLDS.dependencyBlock

    // Find tasks that are blocking multiple other tasks
    const tasks = await prisma.task.findMany({
      where: {
        project: { organizationId: this.organizationId },
        status: { not: TaskStatus.DONE },
      },
    })

    // Build dependency graph
    const blockingCounts: Record<string, { task: typeof tasks[0]; count: number }> = {}

    for (const task of tasks) {
      for (const blockedById of task.blockedByIds) {
        if (!blockingCounts[blockedById]) {
          const blockingTask = tasks.find((t) => t.id === blockedById)
          if (blockingTask) {
            blockingCounts[blockedById] = { task: blockingTask, count: 0 }
          }
        }
        if (blockingCounts[blockedById]) {
          blockingCounts[blockedById].count++
        }
      }
    }

    // Create bottlenecks for tasks blocking many others
    for (const [taskId, { task, count }] of Object.entries(blockingCounts)) {
      if (count < blockedTasksThreshold) continue

      let severity: BottleneckSeverity = BottleneckSeverity.MEDIUM
      if (count >= blockedTasksThreshold * 3) {
        severity = BottleneckSeverity.CRITICAL
      } else if (count >= blockedTasksThreshold * 2) {
        severity = BottleneckSeverity.HIGH
      }

      await prisma.bottleneck.upsert({
        where: {
          id: `dep-block-${taskId}`,
        },
        create: {
          id: `dep-block-${taskId}`,
          type: BottleneckType.DEPENDENCY_BLOCK,
          severity,
          title: `Task blocking ${count} other tasks`,
          description: `"${task.title}" is a dependency for multiple tasks`,
          impact: `${count} tasks are waiting on this to complete`,
          status: BottleneckStatus.ACTIVE,
          taskId,
          projectId: task.projectId,
        },
        update: {
          severity,
          title: `Task blocking ${count} other tasks`,
        },
      })
    }

    // Resolve dependency blocks that are no longer blocking
    const blockingTaskIds = Object.keys(blockingCounts).filter(
      (id) => blockingCounts[id].count >= blockedTasksThreshold
    )

    await prisma.bottleneck.updateMany({
      where: {
        type: BottleneckType.DEPENDENCY_BLOCK,
        status: BottleneckStatus.ACTIVE,
        taskId: { notIn: blockingTaskIds },
      },
      data: {
        status: BottleneckStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    })
  }
}
