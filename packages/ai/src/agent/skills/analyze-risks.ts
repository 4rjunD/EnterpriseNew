// Analyze Risks Skill - Predict delays and assess delivery risks
// ============================================================================

import { prisma } from '@nexflow/database'
import type { Skill, SkillResult } from './types'
import type { AgentContext } from '../types'

interface RiskAssessment {
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
  recommendation: string
}

export const analyzeRisksSkill: Skill = {
  name: 'analyze_risks',
  description: 'Analyze project risks and predict potential delivery delays. Assesses timeline, scope, team, and technical risks.',
  parameters: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'Optional project ID to analyze. If not provided, analyzes all projects.',
      },
      focusArea: {
        type: 'string',
        description: 'Optional focus area for risk analysis',
        enum: ['timeline', 'scope', 'team', 'technical', 'all'],
      },
    },
    required: [],
  },
  requiresApproval: false,

  async execute(params: Record<string, unknown>, context: AgentContext): Promise<SkillResult> {
    const { projectId, focusArea = 'all' } = params as {
      projectId?: string
      focusArea?: string
    }

    try {
      const risks: RiskAssessment[] = []

      // Get data for analysis
      const [tasks, prs, bottlenecks, projectContext] = await Promise.all([
        prisma.task.findMany({
          where: {
            project: {
              organizationId: context.organizationId,
              ...(projectId && { id: projectId }),
            },
          },
          include: {
            assignee: true,
          },
        }),
        prisma.pullRequest.findMany({
          where: {
            project: {
              organizationId: context.organizationId,
              ...(projectId && { id: projectId }),
            },
          },
        }),
        prisma.bottleneck.findMany({
          where: {
            project: {
              organizationId: context.organizationId,
              ...(projectId && { id: projectId }),
            },
            status: 'ACTIVE',
          },
        }),
        prisma.projectContext.findFirst({
          where: { organizationId: context.organizationId },
        }),
      ])

      // Timeline Risks
      if (focusArea === 'all' || focusArea === 'timeline') {
        risks.push(...analyzeTimelineRisks(tasks, projectContext))
      }

      // Scope Risks
      if (focusArea === 'all' || focusArea === 'scope') {
        risks.push(...analyzeScopeRisks(tasks))
      }

      // Team Risks
      if (focusArea === 'all' || focusArea === 'team') {
        risks.push(...analyzeTeamRisks(tasks))
      }

      // Technical Risks
      if (focusArea === 'all' || focusArea === 'technical') {
        risks.push(...analyzeTechnicalRisks(prs, bottlenecks))
      }

      // Sort by severity
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      risks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

      const criticalCount = risks.filter((r) => r.severity === 'critical').length
      const highCount = risks.filter((r) => r.severity === 'high').length

      return {
        success: true,
        data: {
          totalRisks: risks.length,
          criticalRisks: criticalCount,
          highRisks: highCount,
          risks: risks.slice(0, 10), // Top 10 risks
          summary: generateRiskSummary(risks),
        },
        message: `Identified ${risks.length} risks (${criticalCount} critical, ${highCount} high)`,
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
}

function analyzeTimelineRisks(
  tasks: Array<{
    id: string
    status: string
    dueDate: Date | null
    storyPoints: number | null
    blockedByIds: string[]
  }>,
  projectContext: { milestones?: unknown } | null
): RiskAssessment[] {
  const risks: RiskAssessment[] = []

  // Check for overdue tasks
  const now = new Date()
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE'
  )

  if (overdueTasks.length > 0) {
    risks.push({
      category: 'timeline',
      severity: overdueTasks.length > 5 ? 'critical' : overdueTasks.length > 2 ? 'high' : 'medium',
      title: `${overdueTasks.length} overdue tasks`,
      description: `There are ${overdueTasks.length} tasks past their due date that are not completed.`,
      impact: 'Project timeline is already slipping. Downstream tasks may be affected.',
      recommendation: 'Review overdue tasks, reprioritize, and consider reassigning to available team members.',
    })
  }

  // Check for upcoming milestone risks
  if (projectContext?.milestones) {
    const milestones = projectContext.milestones as Array<{
      name: string
      targetDate: string
      status?: string
    }>

    for (const milestone of milestones) {
      if (milestone.status === 'completed') continue

      const targetDate = new Date(milestone.targetDate)
      const daysRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysRemaining <= 0) {
        risks.push({
          category: 'timeline',
          severity: 'critical',
          title: `Milestone "${milestone.name}" is past due`,
          description: `This milestone was due ${Math.abs(daysRemaining)} days ago.`,
          impact: 'Missed milestone affects project credibility and downstream planning.',
          recommendation: 'Communicate delay to stakeholders, identify blockers, and set new realistic target.',
        })
      } else if (daysRemaining <= 7) {
        const incompleteTasks = tasks.filter((t) => t.status !== 'DONE').length
        if (incompleteTasks > daysRemaining * 2) {
          risks.push({
            category: 'timeline',
            severity: 'high',
            title: `Milestone "${milestone.name}" at risk`,
            description: `${daysRemaining} days remaining with ${incompleteTasks} tasks incomplete.`,
            impact: 'May miss the milestone deadline without intervention.',
            recommendation: 'Focus team on critical path items, consider descoping non-essential features.',
          })
        }
      }
    }
  }

  // Check velocity vs remaining work
  const remainingPoints = tasks
    .filter((t) => t.status !== 'DONE')
    .reduce((sum, t) => sum + (t.storyPoints ?? 0), 0)

  const completedPoints = tasks
    .filter((t) => t.status === 'DONE')
    .reduce((sum, t) => sum + (t.storyPoints ?? 0), 0)

  if (remainingPoints > completedPoints * 2) {
    risks.push({
      category: 'timeline',
      severity: 'medium',
      title: 'Remaining work exceeds current velocity',
      description: `${remainingPoints} story points remaining vs ${completedPoints} completed.`,
      impact: 'At current pace, project may take significantly longer than planned.',
      recommendation: 'Review scope, increase team capacity, or adjust timeline expectations.',
    })
  }

  return risks
}

function analyzeScopeRisks(
  tasks: Array<{ id: string; status: string; createdAt: Date; storyPoints: number | null }>
): RiskAssessment[] {
  const risks: RiskAssessment[] = []

  // Check for scope creep (new tasks added recently)
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const recentTasks = tasks.filter((t) => new Date(t.createdAt) > twoWeeksAgo)
  const recentTaskRatio = tasks.length > 0 ? recentTasks.length / tasks.length : 0

  if (recentTaskRatio > 0.3 && recentTasks.length > 5) {
    risks.push({
      category: 'scope',
      severity: 'high',
      title: 'Potential scope creep detected',
      description: `${recentTasks.length} new tasks added in the last 2 weeks (${Math.round(recentTaskRatio * 100)}% of total).`,
      impact: 'Growing scope threatens timeline and team capacity.',
      recommendation: 'Review new additions with stakeholders, ensure they are truly necessary, consider deferring non-critical items.',
    })
  }

  // Check for undefined scope (tasks without story points)
  const tasksWithoutPoints = tasks.filter((t) => !t.storyPoints && t.status !== 'DONE')
  if (tasksWithoutPoints.length > tasks.length * 0.3) {
    risks.push({
      category: 'scope',
      severity: 'medium',
      title: 'Undefined work scope',
      description: `${tasksWithoutPoints.length} active tasks have no story point estimates.`,
      impact: 'Difficult to accurately forecast completion or identify overload.',
      recommendation: 'Hold estimation session to size remaining work.',
    })
  }

  return risks
}

function analyzeTeamRisks(
  tasks: Array<{ id: string; status: string; assigneeId: string | null; storyPoints: number | null; assignee: { id: string; name: string | null } | null }>
): RiskAssessment[] {
  const risks: RiskAssessment[] = []

  // Check workload distribution
  const workloadByUser: Record<string, { name: string; tasks: number; points: number }> = {}

  for (const task of tasks) {
    if (task.status === 'DONE' || !task.assigneeId) continue

    if (!workloadByUser[task.assigneeId]) {
      workloadByUser[task.assigneeId] = {
        name: task.assignee?.name ?? 'Unknown',
        tasks: 0,
        points: 0,
      }
    }
    workloadByUser[task.assigneeId].tasks++
    workloadByUser[task.assigneeId].points += task.storyPoints ?? 0
  }

  const workloads = Object.values(workloadByUser)

  // Find overloaded team members
  const overloaded = workloads.filter((w) => w.tasks > 10 || w.points > 30)
  if (overloaded.length > 0) {
    const names = overloaded.map((w) => `${w.name} (${w.tasks} tasks, ${w.points} pts)`).join(', ')
    risks.push({
      category: 'team',
      severity: overloaded.some((w) => w.tasks > 15) ? 'critical' : 'high',
      title: 'Team member overload detected',
      description: `Overloaded: ${names}`,
      impact: 'Risk of burnout, quality issues, and delays.',
      recommendation: 'Redistribute work to team members with capacity or defer lower-priority tasks.',
    })
  }

  // Check for concentration risk
  if (workloads.length > 0) {
    const avgTasks = workloads.reduce((sum, w) => sum + w.tasks, 0) / workloads.length
    const maxTasks = Math.max(...workloads.map((w) => w.tasks))

    if (maxTasks > avgTasks * 3 && maxTasks > 8) {
      const topPerson = workloads.find((w) => w.tasks === maxTasks)
      risks.push({
        category: 'team',
        severity: 'medium',
        title: 'Knowledge concentration risk',
        description: `${topPerson?.name} has ${maxTasks} tasks, 3x+ the average.`,
        impact: 'Single point of failure - if this person is unavailable, progress stops.',
        recommendation: 'Pair programming or knowledge sharing sessions to distribute expertise.',
      })
    }
  }

  // Check for unassigned work
  const unassignedTasks = tasks.filter((t) => !t.assigneeId && t.status !== 'DONE')
  if (unassignedTasks.length > 5) {
    risks.push({
      category: 'team',
      severity: 'medium',
      title: 'Unassigned work backlog',
      description: `${unassignedTasks.length} tasks have no assignee.`,
      impact: 'Work may fall through the cracks or be forgotten.',
      recommendation: 'Assign tasks during next sprint planning or standup.',
    })
  }

  return risks
}

function analyzeTechnicalRisks(
  prs: Array<{ id: string; status: string; isStuck: boolean; ciStatus: string; unresolvedComments: number }>,
  bottlenecks: Array<{ id: string; type: string; severity: string }>
): RiskAssessment[] {
  const risks: RiskAssessment[] = []

  // Check for stuck PRs
  const stuckPRs = prs.filter((pr) => pr.isStuck && pr.status === 'OPEN')
  if (stuckPRs.length > 0) {
    risks.push({
      category: 'technical',
      severity: stuckPRs.length > 3 ? 'high' : 'medium',
      title: `${stuckPRs.length} stuck pull requests`,
      description: 'PRs that have been idle without progress.',
      impact: 'Blocked code delivery, potential merge conflicts building up.',
      recommendation: 'Review stuck PRs, identify blockers, and take action to unblock.',
    })
  }

  // Check for CI failures
  const failingPRs = prs.filter((pr) => pr.ciStatus === 'FAILING' && pr.status === 'OPEN')
  if (failingPRs.length > 0) {
    risks.push({
      category: 'technical',
      severity: failingPRs.length > 2 ? 'high' : 'medium',
      title: `${failingPRs.length} PRs with CI failures`,
      description: 'Pull requests with failing automated tests or builds.',
      impact: 'Cannot merge until fixed, blocking code delivery.',
      recommendation: 'Prioritize fixing CI failures to unblock merges.',
    })
  }

  // Check for PRs with unresolved comments
  const prsWithComments = prs.filter((pr) => pr.unresolvedComments > 2 && pr.status === 'OPEN')
  if (prsWithComments.length > 0) {
    risks.push({
      category: 'technical',
      severity: 'medium',
      title: `${prsWithComments.length} PRs with unresolved review comments`,
      description: 'Pull requests need attention from authors.',
      impact: 'Delayed code reviews slow down delivery.',
      recommendation: 'Authors should address review feedback promptly.',
    })
  }

  // Check bottlenecks
  const criticalBottlenecks = bottlenecks.filter((b) => b.severity === 'CRITICAL')
  const highBottlenecks = bottlenecks.filter((b) => b.severity === 'HIGH')

  if (criticalBottlenecks.length > 0) {
    risks.push({
      category: 'technical',
      severity: 'critical',
      title: `${criticalBottlenecks.length} critical bottlenecks`,
      description: 'Critical issues blocking project progress.',
      impact: 'Project cannot proceed until these are resolved.',
      recommendation: 'Immediately focus team resources on resolving critical blockers.',
    })
  }

  if (highBottlenecks.length > 2) {
    risks.push({
      category: 'technical',
      severity: 'high',
      title: `${highBottlenecks.length} high-severity bottlenecks`,
      description: 'Multiple high-severity issues detected.',
      impact: 'Significant slowdown in project velocity.',
      recommendation: 'Address high-severity bottlenecks in priority order.',
    })
  }

  return risks
}

function generateRiskSummary(risks: RiskAssessment[]): string {
  if (risks.length === 0) {
    return 'No significant risks identified. Project appears healthy.'
  }

  const critical = risks.filter((r) => r.severity === 'critical').length
  const high = risks.filter((r) => r.severity === 'high').length

  if (critical > 0) {
    return `⚠️ ${critical} critical risk(s) require immediate attention. ${high} high-severity risks also identified.`
  }

  if (high > 0) {
    return `${high} high-severity risk(s) should be addressed soon to prevent escalation.`
  }

  return `${risks.length} medium/low risks identified. Continue monitoring but no urgent action needed.`
}
