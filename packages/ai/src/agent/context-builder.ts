// Context Builder for AI Agent
// Builds rich context from database for LLM prompts
// ============================================================================

import { prisma } from '@nexflow/database'
import type {
  RichContext,
  ProjectContextData,
  TeamStatus,
  SprintStatus,
  BottleneckSummary,
} from './types'

export class ContextBuilder {
  private organizationId: string

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  /**
   * Build complete context for AI agent
   */
  async buildContext(): Promise<RichContext> {
    const [
      projectContext,
      teamStatus,
      sprintStatus,
      activeBottlenecks,
      recentActivity,
      upcomingMilestones,
    ] = await Promise.all([
      this.getProjectContext(),
      this.getTeamStatus(),
      this.getSprintStatus(),
      this.getActiveBottlenecks(),
      this.getRecentActivity(),
      this.getUpcomingMilestones(),
    ])

    return {
      projectContext,
      teamStatus,
      sprintStatus,
      activeBottlenecks,
      recentActivity,
      upcomingMilestones,
    }
  }

  /**
   * Format context as string for LLM prompt
   */
  async buildContextString(): Promise<string> {
    const ctx = await this.buildContext()
    const sections: string[] = []

    // Project Context
    if (ctx.projectContext) {
      sections.push(`## Project Context
- Building: ${ctx.projectContext.buildingDescription}
- Goals: ${ctx.projectContext.goals.join(', ') || 'None specified'}
- Tech Stack: ${ctx.projectContext.techStack.join(', ') || 'Not specified'}`)
    }

    // Sprint Status
    if (ctx.sprintStatus) {
      const completionPct = ctx.sprintStatus.totalTasks > 0
        ? Math.round((ctx.sprintStatus.completedTasks / ctx.sprintStatus.totalTasks) * 100)
        : 0
      sections.push(`## Current Sprint
- Progress: ${ctx.sprintStatus.completedTasks}/${ctx.sprintStatus.totalTasks} tasks (${completionPct}%)
- In Progress: ${ctx.sprintStatus.inProgressTasks} tasks
- Blocked: ${ctx.sprintStatus.blockedTasks} tasks
- Story Points: ${ctx.sprintStatus.completedPoints}/${ctx.sprintStatus.totalPoints} completed
- Velocity: ${ctx.sprintStatus.velocity} points/sprint`)
    }

    // Team Status
    if (ctx.teamStatus) {
      const workloadLines = ctx.teamStatus.workloadDistribution
        .slice(0, 5)
        .map((w) => `  - ${w.name}: ${w.taskCount} tasks (${w.storyPoints} pts)`)
      sections.push(`## Team Status
- Active Members: ${ctx.teamStatus.activeMembers}/${ctx.teamStatus.totalMembers}
- Workload:
${workloadLines.join('\n')}`)
    }

    // Bottlenecks
    if (ctx.activeBottlenecks.length > 0) {
      const bottleneckLines = ctx.activeBottlenecks
        .slice(0, 5)
        .map((b) => `  - [${b.severity}] ${b.title} (${b.type})`)
      sections.push(`## Active Bottlenecks
${bottleneckLines.join('\n')}`)
    }

    // Upcoming Milestones
    if (ctx.upcomingMilestones.length > 0) {
      const milestoneLines = ctx.upcomingMilestones
        .map((m) => `  - ${m.name}: ${m.daysRemaining} days remaining`)
      sections.push(`## Upcoming Milestones
${milestoneLines.join('\n')}`)
    }

    // Recent Activity
    if (ctx.recentActivity.length > 0) {
      sections.push(`## Recent Activity (24h)
${ctx.recentActivity.slice(0, 10).map((a) => `- ${a}`).join('\n')}`)
    }

    return sections.join('\n\n')
  }

  private async getProjectContext(): Promise<ProjectContextData | undefined> {
    const ctx = await prisma.projectContext.findFirst({
      where: { organizationId: this.organizationId },
    })

    if (!ctx) return undefined

    return {
      buildingDescription: ctx.buildingDescription,
      milestones: (ctx.milestones as ProjectContextData['milestones']) ?? [],
      goals: ctx.goals ?? [],
      techStack: ctx.techStack ?? [],
    }
  }

  private async getTeamStatus(): Promise<TeamStatus | undefined> {
    const members = await prisma.user.findMany({
      where: { organizationId: this.organizationId },
      include: {
        assignedTasks: {
          where: {
            status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] },
          },
        },
      },
    })

    if (members.length === 0) return undefined

    const workloadDistribution = members.map((m) => ({
      userId: m.id,
      name: m.name ?? m.email,
      taskCount: m.assignedTasks.length,
      storyPoints: m.assignedTasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0),
    }))

    // Sort by task count descending
    workloadDistribution.sort((a, b) => b.taskCount - a.taskCount)

    return {
      totalMembers: members.length,
      activeMembers: members.filter((m) => m.status !== 'OFFLINE').length,
      workloadDistribution,
    }
  }

  private async getSprintStatus(): Promise<SprintStatus | undefined> {
    const tasks = await prisma.task.findMany({
      where: {
        project: { organizationId: this.organizationId },
      },
    })

    if (tasks.length === 0) return undefined

    const completedTasks = tasks.filter((t) => t.status === 'DONE').length
    const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length
    const blockedTasks = tasks.filter((t) => t.blockedByIds.length > 0 && t.status !== 'DONE').length

    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0)
    const completedPoints = tasks
      .filter((t) => t.status === 'DONE')
      .reduce((sum, t) => sum + (t.storyPoints ?? 0), 0)

    // Calculate velocity based on recent completions (simplified)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentlyCompleted = tasks.filter(
      (t) => t.status === 'DONE' && t.updatedAt > thirtyDaysAgo
    )
    const velocity = Math.round(
      recentlyCompleted.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0) / 2
    ) // 2 sprints in 30 days

    return {
      totalTasks: tasks.length,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      totalPoints,
      completedPoints,
      velocity,
    }
  }

  private async getActiveBottlenecks(): Promise<BottleneckSummary[]> {
    const bottlenecks = await prisma.bottleneck.findMany({
      where: {
        project: { organizationId: this.organizationId },
        status: 'ACTIVE',
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: 10,
    })

    return bottlenecks.map((b) => ({
      id: b.id,
      type: b.type,
      severity: b.severity,
      title: b.title,
      description: b.description ?? undefined,
      status: b.status,
    }))
  }

  private async getRecentActivity(): Promise<string[]> {
    const activities: string[] = []
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Recent task updates
    const recentTasks = await prisma.task.findMany({
      where: {
        project: { organizationId: this.organizationId },
        updatedAt: { gte: twentyFourHoursAgo },
      },
      include: { assignee: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    })

    for (const task of recentTasks) {
      const who = task.assignee?.name ?? 'Someone'
      if (task.status === 'DONE') {
        activities.push(`${who} completed "${task.title}"`)
      } else if (task.status === 'IN_PROGRESS') {
        activities.push(`${who} started work on "${task.title}"`)
      }
    }

    // Recent PR activity
    const recentPRs = await prisma.pullRequest.findMany({
      where: {
        project: { organizationId: this.organizationId },
        updatedAt: { gte: twentyFourHoursAgo },
      },
      include: { author: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    })

    for (const pr of recentPRs) {
      const who = pr.author?.name ?? 'Someone'
      if (pr.status === 'MERGED') {
        activities.push(`${who} merged PR #${pr.number}: ${pr.title}`)
      } else if (pr.status === 'OPEN') {
        activities.push(`${who} opened PR #${pr.number}: ${pr.title}`)
      }
    }

    return activities
  }

  private async getUpcomingMilestones(): Promise<Array<{ name: string; daysRemaining: number }>> {
    const ctx = await prisma.projectContext.findFirst({
      where: { organizationId: this.organizationId },
    })

    if (!ctx?.milestones) return []

    const milestones = ctx.milestones as Array<{
      name: string
      targetDate: string
      status?: string
    }>
    const now = new Date()

    return milestones
      .filter((m) => m.status !== 'completed' && m.targetDate)
      .map((m) => {
        const targetDate = new Date(m.targetDate)
        const daysRemaining = Math.ceil(
          (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        return { name: m.name, daysRemaining }
      })
      .filter((m) => m.daysRemaining > -30) // Include recently passed milestones
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
  }
}
