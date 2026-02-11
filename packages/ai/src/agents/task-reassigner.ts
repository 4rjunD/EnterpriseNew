import { Agent, AgentContext, AgentDecision, AgentResult } from './agent-base'
import { prisma, TaskStatus } from '@nexflow/database'

// Lazy import to avoid circular dependencies
async function getNotificationService() {
  const { notificationService } = await import('@nexflow/integrations')
  return notificationService
}

interface TaskReassignerThresholds {
  overloadThreshold: number
  skillMatchWeight: number
  availabilityWeight: number
}

export class TaskReassignerAgent extends Agent {
  private thresholds: TaskReassignerThresholds

  constructor(context: AgentContext) {
    super(context)
    this.thresholds = context.thresholds as unknown as TaskReassignerThresholds
  }

  async evaluate(): Promise<AgentDecision[]> {
    const decisions: AgentDecision[] = []

    // Find overloaded users
    const users = await prisma.user.findMany({
      where: { organizationId: this.context.organizationId },
      include: {
        assignedTasks: {
          where: {
            status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW] },
          },
        },
        teamMemberships: { include: { team: true } },
      },
    })

    const overloadedUsers = users.filter(
      (u) => u.assignedTasks.length > this.thresholds.overloadThreshold
    )

    for (const overloadedUser of overloadedUsers) {
      // Find tasks that can be reassigned (not in review, not high priority)
      const reassignableTasks = overloadedUser.assignedTasks.filter(
        (t) => t.status === TaskStatus.TODO && t.priority !== 'URGENT'
      )

      if (reassignableTasks.length === 0) continue

      // Find available users in same teams
      const teamIds = overloadedUser.teamMemberships.map((tm) => tm.teamId)
      const availableUsers = users.filter(
        (u) =>
          u.id !== overloadedUser.id &&
          u.assignedTasks.length < this.thresholds.overloadThreshold &&
          u.teamMemberships.some((tm) => teamIds.includes(tm.teamId))
      )

      if (availableUsers.length === 0) continue

      // Pick task to reassign (oldest TODO)
      const taskToReassign = reassignableTasks.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      )[0]

      // Use AI to analyze the situation and pick the best candidate
      const analysis = await this.analyzeWithAI(
        'Should this task be reassigned to balance workload? Consider the task context, team member workloads, and project alignment. Which candidate would be the best fit?',
        {
          task: {
            title: taskToReassign.title,
            description: taskToReassign.description,
            priority: taskToReassign.priority,
            labels: taskToReassign.labels,
            storyPoints: taskToReassign.storyPoints,
            dueDate: taskToReassign.dueDate,
          },
          currentAssignee: {
            name: overloadedUser.name,
            taskCount: overloadedUser.assignedTasks.length,
            teams: overloadedUser.teamMemberships.map((tm) => tm.team.name),
          },
          availableCandidates: availableUsers.map((u) => ({
            id: u.id,
            name: u.name,
            taskCount: u.assignedTasks.length,
            teams: u.teamMemberships.map((tm) => tm.team.name),
            currentTasks: u.assignedTasks.map((t) => ({ title: t.title, priority: t.priority })),
          })),
          overloadThreshold: this.thresholds.overloadThreshold,
        }
      )

      // Only proceed if AI recommends action with sufficient confidence
      if (!analysis.shouldAct || analysis.confidence < 0.6) {
        continue
      }

      // Pick best candidate (least loaded by default, or AI recommendation)
      const bestCandidate = availableUsers.reduce((best, current) =>
        current.assignedTasks.length < best.assignedTasks.length ? current : best
      )

      // Build task URL
      const taskUrl =
        taskToReassign.externalUrl ||
        `${process.env.NEXTAUTH_URL}/dashboard/tasks/${taskToReassign.id}`

      decisions.push({
        shouldAct: true,
        action: 'reassign_task',
        reasoning: analysis.reasoning,
        suggestion: {
          taskId: taskToReassign.id,
          taskTitle: taskToReassign.title,
          taskUrl,
          fromUserId: overloadedUser.id,
          fromUserName: overloadedUser.name,
          toUserId: bestCandidate.id,
          toUserName: bestCandidate.name,
          aiConfidence: analysis.confidence,
          aiRecommendation: analysis.recommendation,
        },
        targetUserId: bestCandidate.id,
        priority: analysis.priority || 'medium',
      })
    }

    return decisions
  }

  async execute(decision: AgentDecision): Promise<AgentResult> {
    const {
      taskId,
      taskTitle,
      taskUrl,
      toUserId,
      toUserName,
      fromUserId,
      fromUserName,
    } = decision.suggestion as {
      taskId: string
      taskTitle: string
      taskUrl: string
      toUserId: string
      toUserName: string
      fromUserId: string
      fromUserName: string
    }

    try {
      // Update the task assignment
      await prisma.task.update({
        where: { id: taskId },
        data: { assigneeId: toUserId },
      })

      // Send notification to new assignee via all channels
      const notificationService = await getNotificationService()
      const results = await notificationService.sendReassignment({
        userId: toUserId,
        organizationId: this.context.organizationId,
        taskId,
        taskTitle,
        url: taskUrl,
        fromUserId,
        fromUserName,
      })

      // Check if any channel succeeded
      const successfulChannels = results.filter((r: { success: boolean }) => r.success)

      // Also notify the previous assignee (optional, lower priority)
      if (fromUserId) {
        await notificationService.send({
          userId: fromUserId,
          organizationId: this.context.organizationId,
          type: 'AGENT_SUGGESTION',
          title: 'Task reassigned',
          message: `Your task "${taskTitle}" has been reassigned to ${toUserName} by NexFlow Agent to balance workload.`,
          priority: 'low',
          data: { taskId, toUserId, toUserName },
          url: taskUrl,
          channels: ['in_app'], // Only in-app for the previous assignee
        })
      }

      return {
        success: true,
        message: `Task reassigned successfully. Notified via ${successfulChannels.map((r: { channel: string }) => r.channel).join(', ')}`,
        data: {
          ...decision.suggestion,
          channels: successfulChannels.map((r: { channel: string }) => r.channel),
        },
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to reassign task: ${error}`,
      }
    }
  }
}
