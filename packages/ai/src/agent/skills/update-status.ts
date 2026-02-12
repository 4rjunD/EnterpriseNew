// Update Status Skill - Update task or milestone status
// ============================================================================

import { prisma, TaskStatus, NotificationType } from '@nexflow/database'
import type { Skill, SkillResult } from './types'
import type { AgentContext } from '../types'

export const updateStatusSkill: Skill = {
  name: 'update_status',
  description: 'Update the status of a task or milestone. Requires approval before making changes.',
  parameters: {
    type: 'object',
    properties: {
      entityType: {
        type: 'string',
        description: 'Type of entity to update',
        enum: ['task', 'milestone'],
      },
      entityId: {
        type: 'string',
        description: 'ID of the task, or milestone name for milestone updates',
      },
      newStatus: {
        type: 'string',
        description: 'New status to set. For tasks: BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED. For milestones: planning, in_progress, completed, missed',
      },
      reason: {
        type: 'string',
        description: 'Reason for the status change',
      },
    },
    required: ['entityType', 'entityId', 'newStatus'],
  },
  requiresApproval: true,

  async execute(params: Record<string, unknown>, context: AgentContext): Promise<SkillResult> {
    const { entityType, entityId, newStatus, reason } = params as {
      entityType: 'task' | 'milestone'
      entityId: string
      newStatus: string
      reason?: string
    }

    try {
      if (entityType === 'task') {
        return updateTaskStatus(context.organizationId, entityId, newStatus, reason)
      } else if (entityType === 'milestone') {
        return updateMilestoneStatus(context.organizationId, entityId, newStatus, reason)
      } else {
        return { success: false, error: `Unknown entity type: ${entityType}` }
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
}

async function updateTaskStatus(
  organizationId: string,
  taskId: string,
  newStatus: string,
  reason?: string
): Promise<SkillResult> {
  // Validate status
  const statusUppercase = newStatus.toUpperCase()
  if (!Object.keys(TaskStatus).includes(statusUppercase)) {
    return {
      success: false,
      error: `Invalid task status: ${newStatus}. Valid values: ${Object.keys(TaskStatus).join(', ')}`,
    }
  }

  // Get task
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, organizationId: true } },
    },
  })

  if (!task) {
    return { success: false, error: `Task not found: ${taskId}` }
  }

  if (task.project?.organizationId !== organizationId) {
    return { success: false, error: 'Task does not belong to your organization' }
  }

  const oldStatus = task.status

  // Update task
  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: TaskStatus[statusUppercase as keyof typeof TaskStatus],
      updatedAt: new Date(),
    },
  })

  // Notify assignee of status change
  if (task.assigneeId) {
    await prisma.notification.create({
      data: {
        userId: task.assigneeId,
        type: NotificationType.AGENT_SUGGESTION,
        title: '📋 Task Status Updated',
        message: `"${task.title}" status changed from ${oldStatus} to ${statusUppercase}${reason ? `. Reason: ${reason}` : ''}`,
        data: {
          taskId: task.id,
          taskTitle: task.title,
          oldStatus,
          newStatus: statusUppercase,
          reason,
          updatedBy: 'NexFlow AI',
        },
      },
    })
  }

  return {
    success: true,
    data: {
      taskId: task.id,
      title: task.title,
      oldStatus,
      newStatus: statusUppercase,
      assignee: task.assignee?.name ?? task.assignee?.email,
      project: task.project?.name,
      reason,
    },
    message: `Task "${task.title}" status updated: ${oldStatus} → ${statusUppercase}`,
  }
}

async function updateMilestoneStatus(
  organizationId: string,
  milestoneName: string,
  newStatus: string,
  reason?: string
): Promise<SkillResult> {
  // Validate status
  const validStatuses = ['planning', 'in_progress', 'completed', 'missed']
  if (!validStatuses.includes(newStatus.toLowerCase())) {
    return {
      success: false,
      error: `Invalid milestone status: ${newStatus}. Valid values: ${validStatuses.join(', ')}`,
    }
  }

  // Get project context with milestones
  const projectContext = await prisma.projectContext.findFirst({
    where: { organizationId },
  })

  if (!projectContext) {
    return { success: false, error: 'No project context found for organization' }
  }

  if (!projectContext.milestones) {
    return { success: false, error: 'No milestones defined in project context' }
  }

  const milestones = projectContext.milestones as Array<{
    name: string
    targetDate: string
    description?: string
    status?: string
  }>

  // Find the milestone
  const milestoneIndex = milestones.findIndex(
    (m) => m.name.toLowerCase() === milestoneName.toLowerCase()
  )

  if (milestoneIndex === -1) {
    return {
      success: false,
      error: `Milestone not found: ${milestoneName}. Available milestones: ${milestones.map((m) => m.name).join(', ')}`,
    }
  }

  const oldStatus = milestones[milestoneIndex].status ?? 'planning'

  // Update milestone status
  milestones[milestoneIndex].status = newStatus.toLowerCase()

  await prisma.projectContext.update({
    where: { id: projectContext.id },
    data: {
      milestones: milestones,
      updatedAt: new Date(),
    },
  })

  return {
    success: true,
    data: {
      milestoneName: milestones[milestoneIndex].name,
      targetDate: milestones[milestoneIndex].targetDate,
      oldStatus,
      newStatus: newStatus.toLowerCase(),
      reason,
    },
    message: `Milestone "${milestones[milestoneIndex].name}" status updated: ${oldStatus} → ${newStatus.toLowerCase()}`,
  }
}
