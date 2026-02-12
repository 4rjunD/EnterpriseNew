// Write Standup Skill - Generate daily or weekly summaries
// ============================================================================

import { prisma } from '@nexflow/database'
import type { Skill, SkillResult } from './types'
import type { AgentContext } from '../types'

export const writeStandupSkill: Skill = {
  name: 'write_standup',
  description: 'Generate a standup update or status summary. Can create daily standups, weekly summaries, or custom reports.',
  parameters: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'Type of standup to generate',
        enum: ['daily', 'weekly', 'custom'],
      },
      userId: {
        type: 'string',
        description: 'Optional user ID to generate standup for a specific person',
      },
      projectId: {
        type: 'string',
        description: 'Optional project ID to focus on',
      },
      format: {
        type: 'string',
        description: 'Output format',
        enum: ['text', 'markdown', 'slack'],
      },
    },
    required: ['type'],
  },
  requiresApproval: false,

  async execute(params: Record<string, unknown>, context: AgentContext): Promise<SkillResult> {
    const { type, userId, projectId, format = 'markdown' } = params as {
      type: 'daily' | 'weekly' | 'custom'
      userId?: string
      projectId?: string
      format?: 'text' | 'markdown' | 'slack'
    }

    try {
      const timeRange = type === 'weekly'
        ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() - 24 * 60 * 60 * 1000)

      // Build query filters
      const taskWhere: Record<string, unknown> = {
        project: {
          organizationId: context.organizationId,
          ...(projectId && { id: projectId }),
        },
        ...(userId && { assigneeId: userId }),
      }

      // Get completed tasks
      const completedTasks = await prisma.task.findMany({
        where: {
          ...taskWhere,
          status: 'DONE',
          updatedAt: { gte: timeRange },
        },
        include: {
          assignee: { select: { name: true } },
          project: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
      })

      // Get in-progress tasks
      const inProgressTasks = await prisma.task.findMany({
        where: {
          ...taskWhere,
          status: { in: ['IN_PROGRESS', 'IN_REVIEW'] },
        },
        include: {
          assignee: { select: { name: true } },
          project: { select: { name: true } },
        },
        orderBy: { priority: 'desc' },
      })

      // Get blockers
      const blockedTasks = await prisma.task.findMany({
        where: {
          ...taskWhere,
          blockedByIds: { isEmpty: false },
          status: { not: 'DONE' },
        },
        include: {
          assignee: { select: { name: true } },
        },
      })

      // Get merged PRs
      const mergedPRs = await prisma.pullRequest.findMany({
        where: {
          project: {
            organizationId: context.organizationId,
            ...(projectId && { id: projectId }),
          },
          ...(userId && { authorId: userId }),
          status: 'MERGED',
          mergedAt: { gte: timeRange },
        },
        include: {
          author: { select: { name: true } },
        },
        orderBy: { mergedAt: 'desc' },
      })

      // Get active bottlenecks
      const bottlenecks = await prisma.bottleneck.findMany({
        where: {
          project: {
            organizationId: context.organizationId,
            ...(projectId && { id: projectId }),
          },
          status: 'ACTIVE',
        },
        orderBy: { severity: 'desc' },
        take: 5,
      })

      // Format standup
      const standup = formatStandup({
        type,
        completedTasks,
        inProgressTasks,
        blockedTasks,
        mergedPRs,
        bottlenecks,
        format,
        userId,
      })

      return {
        success: true,
        data: {
          standup,
          stats: {
            completed: completedTasks.length,
            inProgress: inProgressTasks.length,
            blocked: blockedTasks.length,
            prsMerged: mergedPRs.length,
            activeBottlenecks: bottlenecks.length,
          },
        },
        message: `Generated ${type} standup`,
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
}

interface StandupData {
  type: 'daily' | 'weekly' | 'custom'
  completedTasks: Array<{
    title: string
    assignee: { name: string | null } | null
    project: { name: string } | null
  }>
  inProgressTasks: Array<{
    title: string
    assignee: { name: string | null } | null
    priority: string
  }>
  blockedTasks: Array<{
    title: string
    assignee: { name: string | null } | null
  }>
  mergedPRs: Array<{
    number: number
    title: string
    author: { name: string | null } | null
  }>
  bottlenecks: Array<{
    title: string
    severity: string
  }>
  format: 'text' | 'markdown' | 'slack'
  userId?: string
}

function formatStandup(data: StandupData): string {
  const { type, format, completedTasks, inProgressTasks, blockedTasks, mergedPRs, bottlenecks } = data

  const period = type === 'weekly' ? 'This Week' : 'Yesterday'
  const sections: string[] = []

  // Header
  if (format === 'markdown') {
    sections.push(`# ${type === 'weekly' ? 'Weekly Summary' : 'Daily Standup'}\n`)
  } else if (format === 'slack') {
    sections.push(`*${type === 'weekly' ? 'Weekly Summary' : 'Daily Standup'}*\n`)
  } else {
    sections.push(`${type === 'weekly' ? 'WEEKLY SUMMARY' : 'DAILY STANDUP'}\n`)
  }

  // Completed
  sections.push(formatSection(
    format,
    `${period} - Completed (${completedTasks.length})`,
    completedTasks.length > 0
      ? completedTasks.slice(0, 10).map((t) => `${t.title}${t.assignee?.name ? ` (${t.assignee.name})` : ''}`)
      : ['No tasks completed']
  ))

  // In Progress
  sections.push(formatSection(
    format,
    `Today - In Progress (${inProgressTasks.length})`,
    inProgressTasks.length > 0
      ? inProgressTasks.slice(0, 10).map((t) => `${t.title} [${t.priority}]`)
      : ['No tasks in progress']
  ))

  // PRs Merged
  if (mergedPRs.length > 0) {
    sections.push(formatSection(
      format,
      `PRs Merged (${mergedPRs.length})`,
      mergedPRs.slice(0, 5).map((pr) => `#${pr.number}: ${pr.title}`)
    ))
  }

  // Blockers
  if (blockedTasks.length > 0 || bottlenecks.length > 0) {
    const blockerItems: string[] = []
    blockedTasks.slice(0, 5).forEach((t) => {
      blockerItems.push(`Task blocked: ${t.title}`)
    })
    bottlenecks.slice(0, 3).forEach((b) => {
      blockerItems.push(`[${b.severity}] ${b.title}`)
    })

    sections.push(formatSection(
      format,
      'Blockers & Risks',
      blockerItems.length > 0 ? blockerItems : ['No blockers']
    ))
  }

  return sections.join('\n')
}

function formatSection(
  format: 'text' | 'markdown' | 'slack',
  title: string,
  items: string[]
): string {
  let section = ''

  if (format === 'markdown') {
    section = `## ${title}\n`
    items.forEach((item) => {
      section += `- ${item}\n`
    })
  } else if (format === 'slack') {
    section = `*${title}*\n`
    items.forEach((item) => {
      section += `• ${item}\n`
    })
  } else {
    section = `${title}:\n`
    items.forEach((item) => {
      section += `  - ${item}\n`
    })
  }

  return section
}
