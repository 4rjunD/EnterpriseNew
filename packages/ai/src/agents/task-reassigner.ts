import { Agent, AgentContext, AgentDecision, AgentResult } from './agent-base'
import { prisma, TaskStatus, AgentType } from '@nexflow/database'

interface TaskReassignerThresholds {
  overloadThreshold: number
  skillMatchWeight: number
  availabilityWeight: number
}

export class TaskReassignerAgent extends Agent {
  private thresholds: TaskReassignerThresholds

  constructor(context: AgentContext) {
    super(context)
    this.thresholds = context.thresholds as TaskReassignerThresholds
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

      // Pick best candidate (least loaded)
      const bestCandidate = availableUsers.reduce((best, current) =>
        current.assignedTasks.length < best.assignedTasks.length ? current : best
      )

      // Pick task to reassign (oldest TODO)
      const taskToReassign = reassignableTasks.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      )[0]

      decisions.push({
        shouldAct: true,
        action: 'reassign_task',
        reasoning: `${overloadedUser.name} has ${overloadedUser.assignedTasks.length} active tasks (threshold: ${this.thresholds.overloadThreshold}). Suggesting reassignment to ${bestCandidate.name} who has ${bestCandidate.assignedTasks.length} tasks.`,
        suggestion: {
          taskId: taskToReassign.id,
          taskTitle: taskToReassign.title,
          fromUserId: overloadedUser.id,
          fromUserName: overloadedUser.name,
          toUserId: bestCandidate.id,
          toUserName: bestCandidate.name,
        },
        targetUserId: bestCandidate.id,
        priority: 'medium',
      })
    }

    return decisions
  }

  async execute(decision: AgentDecision): Promise<AgentResult> {
    const { taskId, toUserId } = decision.suggestion as {
      taskId: string
      toUserId: string
    }

    try {
      await prisma.task.update({
        where: { id: taskId },
        data: { assigneeId: toUserId },
      })

      // Create notification for new assignee
      await prisma.notification.create({
        data: {
          userId: toUserId,
          type: 'TASK_ASSIGNED',
          title: 'Task assigned to you',
          message: `A task has been reassigned to you by NexFlow Agent`,
          data: { taskId },
        },
      })

      return {
        success: true,
        message: 'Task reassigned successfully',
        data: decision.suggestion,
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to reassign task: ${error}`,
      }
    }
  }
}
