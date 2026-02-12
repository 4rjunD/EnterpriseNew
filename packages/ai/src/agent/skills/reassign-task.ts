// Reassign Task Skill - Move task to different team member
// ============================================================================

import { prisma, NotificationType } from '@nexflow/database'
import type { Skill, SkillResult } from './types'
import type { AgentContext } from '../types'

export const reassignTaskSkill: Skill = {
  name: 'reassign_task',
  description: 'Reassign a task from one team member to another. Useful for load balancing or when the original assignee is blocked/unavailable. Requires approval.',
  parameters: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'ID of the task to reassign',
      },
      toUserId: {
        type: 'string',
        description: 'ID of the user to assign the task to',
      },
      reason: {
        type: 'string',
        description: 'Reason for reassignment (will be shared with both users)',
      },
      notifyUsers: {
        type: 'boolean',
        description: 'Whether to notify both old and new assignees (default: true)',
      },
    },
    required: ['taskId', 'toUserId'],
  },
  requiresApproval: true,

  async execute(params: Record<string, unknown>, context: AgentContext): Promise<SkillResult> {
    const { taskId, toUserId, reason, notifyUsers = true } = params as {
      taskId: string
      toUserId: string
      reason?: string
      notifyUsers?: boolean
    }

    try {
      // Get task details
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignee: { select: { id: true, name: true, email: true, organizationId: true } },
          project: { select: { id: true, name: true, organizationId: true } },
        },
      })

      if (!task) {
        return { success: false, error: `Task not found: ${taskId}` }
      }

      // Verify task belongs to the organization
      if (task.project?.organizationId !== context.organizationId) {
        return { success: false, error: 'Task does not belong to your organization' }
      }

      // Get new assignee
      const newAssignee = await prisma.user.findUnique({
        where: { id: toUserId },
        select: { id: true, name: true, email: true, organizationId: true },
      })

      if (!newAssignee) {
        return { success: false, error: `User not found: ${toUserId}` }
      }

      // Verify new assignee is in the same organization
      if (newAssignee.organizationId !== context.organizationId) {
        return { success: false, error: 'Cannot reassign to users from other organizations' }
      }

      // Check if it's actually a reassignment
      if (task.assigneeId === toUserId) {
        return {
          success: false,
          error: `Task is already assigned to ${newAssignee.name ?? newAssignee.email}`,
        }
      }

      const oldAssignee = task.assignee
      const oldAssigneeName = oldAssignee?.name ?? oldAssignee?.email ?? 'Unassigned'
      const newAssigneeName = newAssignee.name ?? newAssignee.email

      // Update task assignment
      await prisma.task.update({
        where: { id: taskId },
        data: {
          assigneeId: toUserId,
          updatedAt: new Date(),
        },
      })

      // Create notifications
      if (notifyUsers) {
        // Notify new assignee
        await prisma.notification.create({
          data: {
            userId: toUserId,
            type: NotificationType.TASK_ASSIGNED,
            title: '📋 Task Assigned to You',
            message: `"${task.title}" has been assigned to you${reason ? `. Reason: ${reason}` : ''}`,
            data: {
              taskId: task.id,
              taskTitle: task.title,
              previousAssignee: oldAssigneeName,
              reason,
              assignedBy: 'NexFlow AI',
            },
          },
        })

        // Notify previous assignee if there was one
        if (oldAssignee) {
          await prisma.notification.create({
            data: {
              userId: oldAssignee.id,
              type: NotificationType.TASK_ASSIGNED,
              title: '📋 Task Reassigned',
              message: `"${task.title}" has been reassigned to ${newAssigneeName}${reason ? `. Reason: ${reason}` : ''}`,
              data: {
                taskId: task.id,
                taskTitle: task.title,
                newAssignee: newAssigneeName,
                reason,
                reassignedBy: 'NexFlow AI',
              },
            },
          })
        }
      }

      return {
        success: true,
        data: {
          taskId: task.id,
          taskTitle: task.title,
          previousAssignee: {
            id: oldAssignee?.id,
            name: oldAssigneeName,
          },
          newAssignee: {
            id: newAssignee.id,
            name: newAssigneeName,
          },
          reason,
          notificationsSent: notifyUsers,
        },
        message: `Task "${task.title}" reassigned from ${oldAssigneeName} to ${newAssigneeName}`,
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
}
