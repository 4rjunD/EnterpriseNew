import { Agent, AgentContext, AgentDecision, AgentResult } from './agent-base'
import { prisma, TaskStatus, TaskPriority } from '@nexflow/database'

interface ScopeAdjusterThresholds {
  scopeCreepThreshold: number
  deferralPriorityThreshold: string
}

export class ScopeAdjusterAgent extends Agent {
  private thresholds: ScopeAdjusterThresholds

  constructor(context: AgentContext) {
    super(context)
    this.thresholds = context.thresholds as ScopeAdjusterThresholds
  }

  async evaluate(): Promise<AgentDecision[]> {
    const decisions: AgentDecision[] = []

    // Get active projects with deadline risk
    const projects = await prisma.project.findMany({
      where: {
        organizationId: this.context.organizationId,
        status: 'ACTIVE',
        targetDate: { not: null },
      },
      include: {
        predictions: {
          where: {
            type: 'DEADLINE_RISK',
            isActive: true,
          },
        },
        tasks: {
          where: {
            status: { in: [TaskStatus.BACKLOG, TaskStatus.TODO] },
          },
        },
      },
    })

    for (const project of projects) {
      const deadlineRisk = project.predictions[0]
      if (!deadlineRisk) continue

      const riskData = deadlineRisk.value as { riskLevel: string }
      if (riskData.riskLevel !== 'high' && riskData.riskLevel !== 'critical') continue

      // Find tasks that could be deferred (lower priority, not blocking others)
      const deferrableTasks = project.tasks.filter((t) => {
        const priorityRank: Record<TaskPriority, number> = {
          [TaskPriority.LOW]: 1,
          [TaskPriority.MEDIUM]: 2,
          [TaskPriority.HIGH]: 3,
          [TaskPriority.URGENT]: 4,
        }

        const thresholdRank =
          priorityRank[this.thresholds.deferralPriorityThreshold as TaskPriority] || 2

        return (
          priorityRank[t.priority] <= thresholdRank && t.blocksIds.length === 0
        )
      })

      if (deferrableTasks.length === 0) continue

      // Calculate how many tasks need to be deferred to meet deadline
      const daysUntilDeadline = Math.ceil(
        (project.targetDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      const remainingTasks = project.tasks.length
      const suggestedDeferrals = Math.min(
        deferrableTasks.length,
        Math.ceil(remainingTasks * 0.2) // Suggest deferring up to 20%
      )

      if (suggestedDeferrals === 0) continue

      const tasksToDefer = deferrableTasks.slice(0, suggestedDeferrals)

      decisions.push({
        shouldAct: true,
        action: 'suggest_scope_adjustment',
        reasoning: `Project "${project.name}" has ${riskData.riskLevel} deadline risk. Suggesting deferral of ${suggestedDeferrals} lower-priority tasks to improve chances of meeting the ${project.targetDate?.toLocaleDateString()} deadline.`,
        suggestion: {
          projectId: project.id,
          projectName: project.name,
          targetDate: project.targetDate,
          riskLevel: riskData.riskLevel,
          deferralCount: suggestedDeferrals,
          tasksToDefer: tasksToDefer.map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
          })),
        },
        priority: riskData.riskLevel === 'critical' ? 'high' : 'medium',
      })
    }

    return decisions
  }

  async execute(decision: AgentDecision): Promise<AgentResult> {
    // Scope adjuster defaults to suggest-first mode
    // This execution is only triggered after manual approval

    const suggestion = decision.suggestion as {
      tasksToDefer: Array<{ id: string; title: string }>
    }

    try {
      // Move tasks to backlog
      for (const task of suggestion.tasksToDefer) {
        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: TaskStatus.BACKLOG,
            labels: { push: 'deferred' },
          },
        })
      }

      return {
        success: true,
        message: `Deferred ${suggestion.tasksToDefer.length} tasks to backlog`,
        data: decision.suggestion,
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to defer tasks: ${error}`,
      }
    }
  }
}
