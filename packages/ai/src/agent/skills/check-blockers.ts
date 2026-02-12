// Check Blockers Skill - Find and explain current blockers
// ============================================================================

import { prisma } from '@nexflow/database'
import type { Skill, SkillResult } from './types'
import type { AgentContext } from '../types'

interface BlockerInfo {
  id: string
  type: 'task' | 'pr' | 'bottleneck'
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  blockedItems: string[]
  owner?: string
  suggestedAction?: string
  daysBlocked?: number
}

export const checkBlockersSkill: Skill = {
  name: 'check_blockers',
  description: 'Find and explain current blockers affecting the project. Identifies blocked tasks, stuck PRs, and active bottlenecks.',
  parameters: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'Optional project ID to check blockers for',
      },
      userId: {
        type: 'string',
        description: 'Optional user ID to check blockers affecting this person',
      },
      severityFilter: {
        type: 'string',
        description: 'Filter by minimum severity',
        enum: ['all', 'high', 'critical'],
      },
    },
    required: [],
  },
  requiresApproval: false,

  async execute(params: Record<string, unknown>, context: AgentContext): Promise<SkillResult> {
    const { projectId, userId, severityFilter = 'all' } = params as {
      projectId?: string
      userId?: string
      severityFilter?: 'all' | 'high' | 'critical'
    }

    try {
      const blockers: BlockerInfo[] = []

      // Get blocked tasks
      const blockedTasks = await prisma.task.findMany({
        where: {
          project: {
            organizationId: context.organizationId,
            ...(projectId && { id: projectId }),
          },
          ...(userId && { assigneeId: userId }),
          blockedByIds: { isEmpty: false },
          status: { not: 'DONE' },
        },
        include: {
          assignee: { select: { id: true, name: true } },
        },
      })

      // Get the blocking tasks
      const allBlockingIds = blockedTasks.flatMap((t) => t.blockedByIds)
      const blockingTasks = await prisma.task.findMany({
        where: { id: { in: allBlockingIds } },
        select: { id: true, title: true, status: true, assignee: { select: { name: true } } },
      })
      const blockingTaskMap = new Map(blockingTasks.map((t) => [t.id, t]))

      for (const task of blockedTasks) {
        const blockingItems = task.blockedByIds
          .map((id) => {
            const blocker = blockingTaskMap.get(id)
            if (!blocker) return `Unknown task ${id}`
            return `"${blocker.title}" (${blocker.status}, ${blocker.assignee?.name ?? 'unassigned'})`
          })
          .filter(Boolean)

        const severity = task.priority === 'URGENT' ? 'critical' :
                        task.priority === 'HIGH' ? 'high' : 'medium'

        if (severityFilter === 'critical' && severity !== 'critical') continue
        if (severityFilter === 'high' && severity !== 'critical' && severity !== 'high') continue

        blockers.push({
          id: task.id,
          type: 'task',
          title: task.title,
          severity,
          description: `Task is blocked by ${task.blockedByIds.length} other task(s)`,
          blockedItems: blockingItems,
          owner: task.assignee?.name ?? 'Unassigned',
          suggestedAction: 'Resolve blocking tasks or remove dependency if no longer needed',
        })
      }

      // Get stuck PRs
      const stuckPRs = await prisma.pullRequest.findMany({
        where: {
          project: {
            organizationId: context.organizationId,
            ...(projectId && { id: projectId }),
          },
          ...(userId && { authorId: userId }),
          status: 'OPEN',
          OR: [
            { isStuck: true },
            { ciStatus: 'FAILING' },
            { unresolvedComments: { gt: 3 } },
          ],
        },
        include: {
          author: { select: { id: true, name: true } },
        },
      })

      for (const pr of stuckPRs) {
        const issues: string[] = []
        let severity: BlockerInfo['severity'] = 'medium'
        let suggestedAction = ''

        if (pr.isStuck) {
          issues.push('PR has been idle without activity')
          severity = 'high'
          suggestedAction = 'Review and provide feedback, or merge if ready'
        }
        if (pr.ciStatus === 'FAILING') {
          issues.push('CI/tests are failing')
          severity = 'high'
          suggestedAction = 'Fix failing tests before merge'
        }
        if (pr.unresolvedComments > 3) {
          issues.push(`${pr.unresolvedComments} unresolved review comments`)
          suggestedAction = 'Address review feedback'
        }

        // Calculate days since last activity
        const daysSinceUpdate = Math.floor(
          (Date.now() - new Date(pr.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysSinceUpdate > 7) {
          severity = 'critical'
        }

        if (severityFilter === 'critical' && severity !== 'critical') continue
        if (severityFilter === 'high' && severity !== 'critical' && severity !== 'high') continue

        blockers.push({
          id: pr.id,
          type: 'pr',
          title: `PR #${pr.number}: ${pr.title}`,
          severity,
          description: issues.join('; '),
          blockedItems: [],
          owner: pr.author?.name ?? 'Unknown',
          suggestedAction,
          daysBlocked: daysSinceUpdate,
        })
      }

      // Get active bottlenecks
      const bottleneckWhere: Record<string, unknown> = {
        project: {
          organizationId: context.organizationId,
          ...(projectId && { id: projectId }),
        },
        status: 'ACTIVE',
      }

      if (severityFilter === 'critical') {
        bottleneckWhere.severity = 'CRITICAL'
      } else if (severityFilter === 'high') {
        bottleneckWhere.severity = { in: ['CRITICAL', 'HIGH'] }
      }

      const bottlenecks = await prisma.bottleneck.findMany({
        where: bottleneckWhere,
        include: {
          task: { select: { id: true, title: true } },
          pullRequest: { select: { id: true, number: true, title: true } },
        },
        orderBy: { severity: 'desc' },
      })

      for (const bn of bottlenecks) {
        const blockedItems: string[] = []
        if (bn.task) {
          blockedItems.push(`Task: ${bn.task.title}`)
        }
        if (bn.pullRequest) {
          blockedItems.push(`PR #${bn.pullRequest.number}: ${bn.pullRequest.title}`)
        }

        const daysActive = Math.floor(
          (Date.now() - new Date(bn.detectedAt).getTime()) / (1000 * 60 * 60 * 24)
        )

        blockers.push({
          id: bn.id,
          type: 'bottleneck',
          title: bn.title,
          severity: bn.severity.toLowerCase() as BlockerInfo['severity'],
          description: bn.description ?? `${bn.type} bottleneck detected`,
          blockedItems,
          suggestedAction: bn.impact ?? 'Investigate and resolve',
          daysBlocked: daysActive,
        })
      }

      // Sort by severity
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      blockers.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

      const summary = generateBlockerSummary(blockers)

      return {
        success: true,
        data: {
          totalBlockers: blockers.length,
          critical: blockers.filter((b) => b.severity === 'critical').length,
          high: blockers.filter((b) => b.severity === 'high').length,
          blockers: blockers.slice(0, 15),
          summary,
        },
        message: summary,
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
}

function generateBlockerSummary(blockers: BlockerInfo[]): string {
  if (blockers.length === 0) {
    return 'No blockers found. Project is flowing smoothly.'
  }

  const critical = blockers.filter((b) => b.severity === 'critical').length
  const high = blockers.filter((b) => b.severity === 'high').length

  const parts: string[] = [`Found ${blockers.length} blocker(s)`]

  if (critical > 0) {
    parts.push(`${critical} critical`)
  }
  if (high > 0) {
    parts.push(`${high} high-severity`)
  }

  // Add top blocker info
  const topBlocker = blockers[0]
  if (topBlocker) {
    parts.push(`Top priority: ${topBlocker.title}`)
  }

  return parts.join('. ')
}
