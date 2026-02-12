// Query Data Skill - Retrieve tasks, PRs, team info, metrics
// ============================================================================

import { prisma } from '@nexflow/database'
import type { Skill, SkillResult } from './types'
import type { AgentContext } from '../types'

export const queryDataSkill: Skill = {
  name: 'query_data',
  description: 'Query data from NexFlow. Get tasks, pull requests, team members, bottlenecks, or metrics. Use this to get fresh data before answering questions.',
  parameters: {
    type: 'object',
    properties: {
      dataType: {
        type: 'string',
        description: 'Type of data to query',
        enum: ['tasks', 'pull_requests', 'team', 'bottlenecks', 'metrics', 'projects'],
      },
      filters: {
        type: 'object',
        description: 'Optional filters for the query (e.g., status, assignee, priority)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 20)',
      },
    },
    required: ['dataType'],
  },
  requiresApproval: false,

  async execute(params: Record<string, unknown>, context: AgentContext): Promise<SkillResult> {
    const { dataType, filters, limit = 20 } = params as {
      dataType: string
      filters?: Record<string, unknown>
      limit?: number
    }

    try {
      switch (dataType) {
        case 'tasks':
          return queryTasks(context.organizationId, filters, limit)
        case 'pull_requests':
          return queryPullRequests(context.organizationId, filters, limit)
        case 'team':
          return queryTeam(context.organizationId, filters)
        case 'bottlenecks':
          return queryBottlenecks(context.organizationId, filters, limit)
        case 'metrics':
          return queryMetrics(context.organizationId)
        case 'projects':
          return queryProjects(context.organizationId, limit)
        default:
          return { success: false, error: `Unknown data type: ${dataType}` }
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
}

async function queryTasks(
  organizationId: string,
  filters?: Record<string, unknown>,
  limit = 20
): Promise<SkillResult> {
  const where: Record<string, unknown> = {
    project: { organizationId },
  }

  if (filters?.status) {
    where.status = filters.status
  }
  if (filters?.assigneeId) {
    where.assigneeId = filters.assigneeId
  }
  if (filters?.priority) {
    where.priority = filters.priority
  }
  if (filters?.projectId) {
    where.projectId = filters.projectId
  }
  if (filters?.isStale) {
    where.isStale = filters.isStale
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, key: true } },
    },
    orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
  })

  return {
    success: true,
    data: {
      count: tasks.length,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        storyPoints: t.storyPoints,
        dueDate: t.dueDate,
        assignee: t.assignee?.name ?? 'Unassigned',
        project: t.project?.name,
        isStale: t.isStale,
        blockedByCount: t.blockedByIds.length,
      })),
    },
    message: `Found ${tasks.length} tasks`,
  }
}

async function queryPullRequests(
  organizationId: string,
  filters?: Record<string, unknown>,
  limit = 20
): Promise<SkillResult> {
  const where: Record<string, unknown> = {
    project: { organizationId },
  }

  if (filters?.status) {
    where.status = filters.status
  }
  if (filters?.authorId) {
    where.authorId = filters.authorId
  }
  if (filters?.isStuck) {
    where.isStuck = filters.isStuck
  }

  const prs = await prisma.pullRequest.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  })

  return {
    success: true,
    data: {
      count: prs.length,
      pullRequests: prs.map((pr) => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        status: pr.status,
        author: pr.author?.name ?? 'Unknown',
        repository: pr.repository,
        additions: pr.additions,
        deletions: pr.deletions,
        isStuck: pr.isStuck,
        ciStatus: pr.ciStatus,
        unresolvedComments: pr.unresolvedComments,
        url: pr.url,
      })),
    },
    message: `Found ${prs.length} pull requests`,
  }
}

async function queryTeam(
  organizationId: string,
  filters?: Record<string, unknown>
): Promise<SkillResult> {
  const where: Record<string, unknown> = { organizationId }

  if (filters?.role) {
    where.role = filters.role
  }
  if (filters?.status) {
    where.status = filters.status
  }

  const members = await prisma.user.findMany({
    where,
    include: {
      assignedTasks: {
        where: { status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] } },
      },
      pullRequests: {
        where: { status: 'OPEN' },
      },
    },
  })

  return {
    success: true,
    data: {
      count: members.length,
      members: members.map((m) => ({
        id: m.id,
        name: m.name ?? m.email,
        email: m.email,
        role: m.role,
        status: m.status,
        activeTasks: m.assignedTasks.length,
        totalStoryPoints: m.assignedTasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0),
        openPRs: m.pullRequests.length,
      })),
    },
    message: `Found ${members.length} team members`,
  }
}

async function queryBottlenecks(
  organizationId: string,
  filters?: Record<string, unknown>,
  limit = 20
): Promise<SkillResult> {
  const where: Record<string, unknown> = {
    project: { organizationId },
  }

  if (filters?.status) {
    where.status = filters.status
  } else {
    where.status = 'ACTIVE' // Default to active bottlenecks
  }
  if (filters?.severity) {
    where.severity = filters.severity
  }
  if (filters?.type) {
    where.type = filters.type
  }

  const bottlenecks = await prisma.bottleneck.findMany({
    where,
    include: {
      task: { select: { id: true, title: true } },
      pullRequest: { select: { id: true, number: true, title: true } },
    },
    orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }],
    take: limit,
  })

  return {
    success: true,
    data: {
      count: bottlenecks.length,
      bottlenecks: bottlenecks.map((b) => ({
        id: b.id,
        type: b.type,
        severity: b.severity,
        title: b.title,
        description: b.description,
        impact: b.impact,
        status: b.status,
        detectedAt: b.detectedAt,
        relatedTask: b.task?.title,
        relatedPR: b.pullRequest ? `PR #${b.pullRequest.number}` : undefined,
      })),
    },
    message: `Found ${bottlenecks.length} bottlenecks`,
  }
}

async function queryMetrics(organizationId: string): Promise<SkillResult> {
  // Get various metrics
  const [taskCounts, prCounts, bottleneckCounts] = await Promise.all([
    prisma.task.groupBy({
      by: ['status'],
      where: { project: { organizationId } },
      _count: { id: true },
    }),
    prisma.pullRequest.groupBy({
      by: ['status'],
      where: { project: { organizationId } },
      _count: { id: true },
    }),
    prisma.bottleneck.groupBy({
      by: ['severity'],
      where: { project: { organizationId }, status: 'ACTIVE' },
      _count: { id: true },
    }),
  ])

  const tasksByStatus = Object.fromEntries(taskCounts.map((t) => [t.status, t._count.id]))
  const prsByStatus = Object.fromEntries(prCounts.map((p) => [p.status, p._count.id]))
  const bottlenecksBySeverity = Object.fromEntries(bottleneckCounts.map((b) => [b.severity, b._count.id]))

  const totalTasks = Object.values(tasksByStatus).reduce((a, b) => a + b, 0)
  const completedTasks = tasksByStatus['DONE'] ?? 0
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return {
    success: true,
    data: {
      tasks: {
        total: totalTasks,
        byStatus: tasksByStatus,
        completionRate: `${completionRate}%`,
      },
      pullRequests: {
        total: Object.values(prsByStatus).reduce((a, b) => a + b, 0),
        byStatus: prsByStatus,
      },
      bottlenecks: {
        total: Object.values(bottlenecksBySeverity).reduce((a, b) => a + b, 0),
        bySeverity: bottlenecksBySeverity,
      },
    },
    message: 'Retrieved project metrics',
  }
}

async function queryProjects(organizationId: string, limit = 20): Promise<SkillResult> {
  const projects = await prisma.project.findMany({
    where: { organizationId },
    include: {
      _count: {
        select: { tasks: true, pullRequests: true, bottlenecks: true },
      },
    },
    take: limit,
  })

  return {
    success: true,
    data: {
      count: projects.length,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        key: p.key,
        status: p.status,
        startDate: p.startDate,
        targetDate: p.targetDate,
        taskCount: p._count.tasks,
        prCount: p._count.pullRequests,
        bottleneckCount: p._count.bottlenecks,
      })),
    },
    message: `Found ${projects.length} projects`,
  }
}
