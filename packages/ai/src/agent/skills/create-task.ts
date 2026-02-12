// Create Task Skill - Create a new task
// ============================================================================

import { prisma, TaskStatus, TaskPriority, TaskSource, NotificationType } from '@nexflow/database'
import type { Skill, SkillResult } from './types'
import type { AgentContext } from '../types'

export const createTaskSkill: Skill = {
  name: 'create_task',
  description: 'Create a new task in the project. Requires approval before creation.',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Title of the task',
      },
      description: {
        type: 'string',
        description: 'Detailed description of the task',
      },
      projectId: {
        type: 'string',
        description: 'ID of the project to add the task to',
      },
      assigneeId: {
        type: 'string',
        description: 'ID of the user to assign the task to (optional)',
      },
      priority: {
        type: 'string',
        description: 'Priority level of the task',
        enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      },
      storyPoints: {
        type: 'number',
        description: 'Story point estimate for the task',
      },
      dueDate: {
        type: 'string',
        description: 'Due date for the task (ISO format)',
      },
      labels: {
        type: 'array',
        description: 'Labels/tags for the task',
        items: { type: 'string' },
      },
    },
    required: ['title', 'projectId'],
  },
  requiresApproval: true,

  async execute(params: Record<string, unknown>, context: AgentContext): Promise<SkillResult> {
    const {
      title,
      description,
      projectId,
      assigneeId,
      priority = 'MEDIUM',
      storyPoints,
      dueDate,
      labels = [],
    } = params as {
      title: string
      description?: string
      projectId: string
      assigneeId?: string
      priority?: string
      storyPoints?: number
      dueDate?: string
      labels?: string[]
    }

    try {
      // Verify project exists and belongs to the organization
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, name: true, organizationId: true, teamId: true },
      })

      if (!project) {
        return { success: false, error: `Project not found: ${projectId}` }
      }

      if (project.organizationId !== context.organizationId) {
        return { success: false, error: 'Project does not belong to your organization' }
      }

      // Verify assignee if provided
      let assigneeName: string | undefined
      if (assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: assigneeId },
          select: { id: true, name: true, email: true, organizationId: true },
        })

        if (!assignee) {
          return { success: false, error: `User not found: ${assigneeId}` }
        }

        if (assignee.organizationId !== context.organizationId) {
          return { success: false, error: 'Cannot assign to users from other organizations' }
        }

        assigneeName = assignee.name ?? assignee.email
      }

      // Parse priority
      const taskPriority = priority.toUpperCase() as keyof typeof TaskPriority
      if (!Object.keys(TaskPriority).includes(taskPriority)) {
        return { success: false, error: `Invalid priority: ${priority}` }
      }

      // Parse due date
      let parsedDueDate: Date | undefined
      if (dueDate) {
        parsedDueDate = new Date(dueDate)
        if (isNaN(parsedDueDate.getTime())) {
          return { success: false, error: `Invalid due date format: ${dueDate}` }
        }
      }

      // Create the task
      const task = await prisma.task.create({
        data: {
          title,
          description,
          projectId,
          teamId: project.teamId,
          assigneeId,
          priority: TaskPriority[taskPriority],
          status: TaskStatus.BACKLOG,
          storyPoints,
          dueDate: parsedDueDate,
          labels,
          source: TaskSource.INTERNAL,
          creatorId: context.userId,
        },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
        },
      })

      // Notify assignee if one was set
      if (assigneeId) {
        await prisma.notification.create({
          data: {
            userId: assigneeId,
            type: NotificationType.TASK_ASSIGNED,
            title: '📋 New Task Assigned',
            message: `"${title}" has been assigned to you in ${project.name}`,
            data: {
              taskId: task.id,
              taskTitle: task.title,
              projectName: project.name,
              priority: taskPriority,
              assignedBy: 'NexFlow AI',
            },
          },
        })
      }

      return {
        success: true,
        data: {
          taskId: task.id,
          title: task.title,
          description: task.description,
          project: task.project?.name,
          assignee: assigneeName,
          priority: task.priority,
          status: task.status,
          storyPoints: task.storyPoints,
          dueDate: task.dueDate?.toISOString(),
          labels: task.labels,
          createdAt: task.createdAt.toISOString(),
        },
        message: `Created task "${task.title}" in ${project.name}${assigneeName ? ` (assigned to ${assigneeName})` : ''}`,
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
}
