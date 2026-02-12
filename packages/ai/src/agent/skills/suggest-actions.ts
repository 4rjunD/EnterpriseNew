// Suggest Actions Skill - Recommend next steps
// ============================================================================

import { prisma } from '@nexflow/database'
import type { Skill, SkillResult } from './types'
import type { AgentContext } from '../types'

interface ActionSuggestion {
  priority: 'urgent' | 'high' | 'medium' | 'low'
  category: 'blocker' | 'workload' | 'process' | 'communication' | 'technical'
  title: string
  description: string
  reasoning: string
  impact: string
  effort: 'quick' | 'moderate' | 'significant'
  suggestedSkill?: string
  skillParams?: Record<string, unknown>
}

export const suggestActionsSkill: Skill = {
  name: 'suggest_actions',
  description: 'Analyze the current project state and suggest prioritized actions to improve velocity, resolve blockers, or address risks.',
  parameters: {
    type: 'object',
    properties: {
      focusArea: {
        type: 'string',
        description: 'Optional area to focus suggestions on',
        enum: ['all', 'blockers', 'workload', 'velocity', 'quality'],
      },
      limit: {
        type: 'number',
        description: 'Maximum number of suggestions (default: 5)',
      },
    },
    required: [],
  },
  requiresApproval: false,

  async execute(params: Record<string, unknown>, context: AgentContext): Promise<SkillResult> {
    const { focusArea = 'all', limit = 5 } = params as {
      focusArea?: string
      limit?: number
    }

    try {
      const suggestions: ActionSuggestion[] = []

      // Gather data for analysis
      const [tasks, prs, bottlenecks, teamWorkload] = await Promise.all([
        prisma.task.findMany({
          where: { project: { organizationId: context.organizationId } },
          include: { assignee: { select: { id: true, name: true } } },
        }),
        prisma.pullRequest.findMany({
          where: { project: { organizationId: context.organizationId } },
          include: { author: { select: { id: true, name: true } } },
        }),
        prisma.bottleneck.findMany({
          where: {
            project: { organizationId: context.organizationId },
            status: 'ACTIVE',
          },
        }),
        getTeamWorkload(context.organizationId),
      ])

      // Analyze and generate suggestions

      // 1. Critical bottleneck suggestions
      if (focusArea === 'all' || focusArea === 'blockers') {
        const criticalBottlenecks = bottlenecks.filter((b) => b.severity === 'CRITICAL')
        for (const bn of criticalBottlenecks.slice(0, 2)) {
          suggestions.push({
            priority: 'urgent',
            category: 'blocker',
            title: `Resolve critical bottleneck: ${bn.title}`,
            description: bn.description ?? 'Critical issue blocking project progress',
            reasoning: 'Critical bottlenecks should be the top priority as they block other work.',
            impact: 'Unblocks dependent work and restores project velocity',
            effort: 'moderate',
          })
        }
      }

      // 2. Stuck PR suggestions
      if (focusArea === 'all' || focusArea === 'blockers' || focusArea === 'velocity') {
        const stuckPRs = prs.filter((pr) => pr.isStuck && pr.status === 'OPEN')
        if (stuckPRs.length > 0) {
          const oldestStuck = stuckPRs[0]
          suggestions.push({
            priority: 'high',
            category: 'technical',
            title: `Unblock ${stuckPRs.length} stuck PR(s)`,
            description: `Starting with PR #${oldestStuck.number}: ${oldestStuck.title}`,
            reasoning: 'Stuck PRs represent completed work waiting to be merged. Unblocking them delivers value.',
            impact: 'Delivers pending features/fixes and reduces merge conflict risk',
            effort: 'quick',
          })
        }
      }

      // 3. Workload balancing suggestions
      if (focusArea === 'all' || focusArea === 'workload') {
        const overloaded = teamWorkload.filter((w) => w.taskCount > 10)
        const underloaded = teamWorkload.filter((w) => w.taskCount < 3)

        if (overloaded.length > 0 && underloaded.length > 0) {
          const fromUser = overloaded[0]
          const toUser = underloaded[0]
          suggestions.push({
            priority: 'high',
            category: 'workload',
            title: `Rebalance workload: ${fromUser.name} → ${toUser.name}`,
            description: `${fromUser.name} has ${fromUser.taskCount} tasks. ${toUser.name} has capacity (${toUser.taskCount} tasks).`,
            reasoning: 'Balanced workload prevents burnout and ensures consistent velocity.',
            impact: 'Reduces risk of delays from overloaded team members',
            effort: 'quick',
            suggestedSkill: 'reassign_task',
            skillParams: {
              fromUserId: fromUser.userId,
              toUserId: toUser.userId,
            },
          })
        }
      }

      // 4. Stale task suggestions
      if (focusArea === 'all' || focusArea === 'velocity') {
        const staleTasks = tasks.filter((t) => t.isStale && t.status !== 'DONE')
        if (staleTasks.length > 3) {
          suggestions.push({
            priority: 'medium',
            category: 'process',
            title: `Review ${staleTasks.length} stale tasks`,
            description: 'Tasks that have been idle may need reassignment or clarification.',
            reasoning: 'Stale tasks indicate blocked or forgotten work that slows velocity.',
            impact: 'Clears backlog debt and improves task flow',
            effort: 'moderate',
          })
        }
      }

      // 5. Unassigned tasks suggestions
      const unassignedTasks = tasks.filter(
        (t) => !t.assigneeId && t.status !== 'DONE' && t.status !== 'CANCELLED'
      )
      if (unassignedTasks.length > 5 && (focusArea === 'all' || focusArea === 'workload')) {
        suggestions.push({
          priority: 'medium',
          category: 'process',
          title: `Assign ${unassignedTasks.length} unassigned tasks`,
          description: 'Unassigned work may fall through the cracks.',
          reasoning: 'Tasks need owners to ensure accountability and progress.',
          impact: 'Ensures all work has clear ownership',
          effort: 'quick',
        })
      }

      // 6. High-priority task nudge
      if (focusArea === 'all' || focusArea === 'velocity') {
        const urgentTasks = tasks.filter(
          (t) =>
            t.priority === 'URGENT' &&
            t.status === 'TODO' &&
            t.assigneeId
        )
        if (urgentTasks.length > 0) {
          const task = urgentTasks[0]
          suggestions.push({
            priority: 'high',
            category: 'communication',
            title: `Nudge on urgent task: ${task.title}`,
            description: `Urgent task assigned to ${task.assignee?.name} is still in TODO status.`,
            reasoning: 'Urgent tasks need to be started promptly.',
            impact: 'Ensures critical work is prioritized',
            effort: 'quick',
            suggestedSkill: 'send_nudge',
            skillParams: {
              userId: task.assigneeId,
              taskId: task.id,
              message: `Friendly reminder: "${task.title}" is marked as urgent and ready to start.`,
            },
          })
        }
      }

      // 7. CI failure suggestions
      if (focusArea === 'all' || focusArea === 'quality') {
        const failingPRs = prs.filter((pr) => pr.ciStatus === 'FAILING' && pr.status === 'OPEN')
        if (failingPRs.length > 0) {
          suggestions.push({
            priority: 'high',
            category: 'technical',
            title: `Fix CI failures in ${failingPRs.length} PR(s)`,
            description: 'PRs with failing CI cannot be merged safely.',
            reasoning: 'CI failures block code delivery and may indicate bugs.',
            impact: 'Unblocks PR merges and maintains code quality',
            effort: 'moderate',
          })
        }
      }

      // 8. Review bottleneck
      if (focusArea === 'all' || focusArea === 'velocity') {
        const awaitingReview = prs.filter(
          (pr) => pr.status === 'OPEN' && pr.reviewerIds.length === 0
        )
        if (awaitingReview.length > 3) {
          suggestions.push({
            priority: 'medium',
            category: 'process',
            title: `Assign reviewers to ${awaitingReview.length} PRs`,
            description: 'PRs without reviewers will stall.',
            reasoning: 'Review assignment ensures PRs get timely feedback.',
            impact: 'Reduces PR cycle time',
            effort: 'quick',
          })
        }
      }

      // Sort by priority and limit
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
      suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

      const topSuggestions = suggestions.slice(0, limit)

      return {
        success: true,
        data: {
          totalSuggestions: suggestions.length,
          suggestions: topSuggestions,
          summary: generateSummary(topSuggestions),
        },
        message: `Generated ${topSuggestions.length} action suggestions`,
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
}

async function getTeamWorkload(organizationId: string) {
  const members = await prisma.user.findMany({
    where: { organizationId },
    include: {
      assignedTasks: {
        where: { status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] } },
      },
    },
  })

  return members.map((m) => ({
    userId: m.id,
    name: m.name ?? m.email,
    taskCount: m.assignedTasks.length,
    storyPoints: m.assignedTasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0),
  }))
}

function generateSummary(suggestions: ActionSuggestion[]): string {
  if (suggestions.length === 0) {
    return 'No urgent actions needed. Project is running smoothly.'
  }

  const urgent = suggestions.filter((s) => s.priority === 'urgent').length
  const high = suggestions.filter((s) => s.priority === 'high').length

  const parts: string[] = []

  if (urgent > 0) {
    parts.push(`${urgent} urgent action(s) need immediate attention`)
  }
  if (high > 0) {
    parts.push(`${high} high-priority action(s) recommended`)
  }

  if (parts.length === 0) {
    parts.push(`${suggestions.length} medium-priority suggestions to improve velocity`)
  }

  return parts.join('. ') + '.'
}
