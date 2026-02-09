import { Agent, AgentContext, AgentDecision, AgentResult } from './agent-base'
import { prisma, TaskStatus, PRStatus, BottleneckType, BottleneckStatus } from '@nexflow/database'
import { BOTTLENECK_THRESHOLDS } from '@nexflow/config'

interface NudgeSenderThresholds {
  reminderIntervalHours: number
  maxReminders: number
}

export class NudgeSenderAgent extends Agent {
  private thresholds: NudgeSenderThresholds

  constructor(context: AgentContext) {
    super(context)
    this.thresholds = context.thresholds as NudgeSenderThresholds
  }

  async evaluate(): Promise<AgentDecision[]> {
    const decisions: AgentDecision[] = []

    // Find stuck PRs
    const stuckPRs = await prisma.pullRequest.findMany({
      where: {
        project: { organizationId: this.context.organizationId },
        status: PRStatus.OPEN,
        isStuck: true,
      },
      include: {
        author: true,
        bottlenecks: { where: { status: BottleneckStatus.ACTIVE } },
      },
    })

    for (const pr of stuckPRs) {
      if (!pr.author) continue

      // Check if we've already sent max reminders
      const existingNudges = await prisma.agentAction.count({
        where: {
          agentConfigId: this.context.agentConfigId,
          action: 'nudge_pr',
          suggestion: { path: ['prId'], equals: pr.id },
          status: 'EXECUTED',
        },
      })

      if (existingNudges >= this.thresholds.maxReminders) continue

      // Check if enough time has passed since last nudge
      const lastNudge = await prisma.agentAction.findFirst({
        where: {
          agentConfigId: this.context.agentConfigId,
          action: 'nudge_pr',
          suggestion: { path: ['prId'], equals: pr.id },
          status: 'EXECUTED',
        },
        orderBy: { executedAt: 'desc' },
      })

      if (lastNudge?.executedAt) {
        const hoursSinceLastNudge =
          (Date.now() - lastNudge.executedAt.getTime()) / (1000 * 60 * 60)
        if (hoursSinceLastNudge < this.thresholds.reminderIntervalHours) continue
      }

      decisions.push({
        shouldAct: true,
        action: 'nudge_pr',
        reasoning: `PR #${pr.number} "${pr.title}" has been stuck for ${Math.floor((Date.now() - (pr.stuckAt?.getTime() || Date.now())) / (1000 * 60 * 60 * 24))} days. Sending reminder to author.`,
        suggestion: {
          prId: pr.id,
          prNumber: pr.number,
          prTitle: pr.title,
          authorId: pr.author.id,
          authorName: pr.author.name,
          reminderCount: existingNudges + 1,
        },
        targetUserId: pr.author.id,
        bottleneckId: pr.bottlenecks[0]?.id,
        priority: existingNudges >= 2 ? 'high' : 'medium',
      })
    }

    // Find stale tasks
    const staleTasks = await prisma.task.findMany({
      where: {
        project: { organizationId: this.context.organizationId },
        isStale: true,
        status: TaskStatus.IN_PROGRESS,
      },
      include: { assignee: true },
    })

    for (const task of staleTasks) {
      if (!task.assignee) continue

      const existingNudges = await prisma.agentAction.count({
        where: {
          agentConfigId: this.context.agentConfigId,
          action: 'nudge_task',
          suggestion: { path: ['taskId'], equals: task.id },
          status: 'EXECUTED',
        },
      })

      if (existingNudges >= this.thresholds.maxReminders) continue

      decisions.push({
        shouldAct: true,
        action: 'nudge_task',
        reasoning: `Task "${task.title}" has been in progress for over ${BOTTLENECK_THRESHOLDS.staleTask.daysInProgress} days. Sending reminder to assignee.`,
        suggestion: {
          taskId: task.id,
          taskTitle: task.title,
          assigneeId: task.assignee.id,
          assigneeName: task.assignee.name,
          reminderCount: existingNudges + 1,
        },
        targetUserId: task.assignee.id,
        priority: 'medium',
      })
    }

    return decisions
  }

  async execute(decision: AgentDecision): Promise<AgentResult> {
    const { targetUserId } = decision

    if (!targetUserId) {
      return { success: false, message: 'No target user specified' }
    }

    try {
      const isTaskNudge = decision.action === 'nudge_task'
      const suggestion = decision.suggestion as Record<string, unknown>

      // Create notification
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          type: isTaskNudge ? 'BOTTLENECK_DETECTED' : 'PR_REVIEW_REQUESTED',
          title: isTaskNudge
            ? 'Task needs attention'
            : 'Pull request needs attention',
          message: isTaskNudge
            ? `Your task "${suggestion.taskTitle}" has been in progress for a while. Please update its status or let us know if you're blocked.`
            : `Your PR #${suggestion.prNumber} "${suggestion.prTitle}" has been waiting for review. Please follow up or request additional reviewers.`,
          data: isTaskNudge
            ? { taskId: suggestion.taskId }
            : { prId: suggestion.prId },
        },
      })

      // TODO: Also send Slack/Discord message if integration is connected

      return {
        success: true,
        message: `Nudge sent for ${isTaskNudge ? 'task' : 'PR'}`,
        data: decision.suggestion,
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to send nudge: ${error}`,
      }
    }
  }
}
