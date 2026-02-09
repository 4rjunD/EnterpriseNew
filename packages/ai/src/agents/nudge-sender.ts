import { Agent, AgentContext, AgentDecision, AgentResult } from './agent-base'
import { prisma, TaskStatus, PRStatus, BottleneckStatus } from '@nexflow/database'
import { BOTTLENECK_THRESHOLDS } from '@nexflow/config'

// Lazy import to avoid circular dependencies
async function getNotificationService() {
  const { notificationService } = await import('@nexflow/integrations')
  return notificationService
}

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
        project: true,
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
          prUrl: pr.url,
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
      include: {
        assignee: true,
        project: true,
      },
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

      // Build task URL
      const taskUrl = task.externalUrl || `${process.env.NEXTAUTH_URL}/dashboard/tasks/${task.id}`

      decisions.push({
        shouldAct: true,
        action: 'nudge_task',
        reasoning: `Task "${task.title}" has been in progress for over ${BOTTLENECK_THRESHOLDS.staleTask.daysInProgress} days. Sending reminder to assignee.`,
        suggestion: {
          taskId: task.id,
          taskTitle: task.title,
          taskUrl,
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

      // Send notifications via the unified notification service
      const notificationService = await getNotificationService()
      const results = await notificationService.sendNudge({
        userId: targetUserId,
        organizationId: this.context.organizationId,
        type: isTaskNudge ? 'task' : 'pr',
        title: (isTaskNudge ? suggestion.taskTitle : suggestion.prTitle) as string,
        itemId: (isTaskNudge ? suggestion.taskId : suggestion.prId) as string,
        url: (isTaskNudge ? suggestion.taskUrl : suggestion.prUrl) as string,
        reminderCount: suggestion.reminderCount as number,
      })

      // Check if any channel succeeded
      const successfulChannels = results.filter((r: { success: boolean }) => r.success)
      const failedChannels = results.filter((r: { success: boolean; channel: string; error?: string }) => !r.success)

      if (successfulChannels.length === 0) {
        return {
          success: false,
          message: `Failed to send nudge via any channel: ${failedChannels.map((r: { channel: string; error?: string }) => `${r.channel}: ${r.error}`).join(', ')}`,
        }
      }

      return {
        success: true,
        message: `Nudge sent for ${isTaskNudge ? 'task' : 'PR'} via ${successfulChannels.map((r: { channel: string }) => r.channel).join(', ')}`,
        data: {
          ...decision.suggestion,
          channels: successfulChannels.map((r: { channel: string }) => r.channel),
        },
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to send nudge: ${error}`,
      }
    }
  }
}
