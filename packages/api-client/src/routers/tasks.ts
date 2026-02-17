import { z } from 'zod'
import { router, protectedProcedure, managerProcedure } from '../trpc'
import { prisma, TaskStatus, TaskPriority, TaskSource } from '@nexflow/database'

export const tasksRouter = router({
  // Unified TODOs for dashboard - combines tasks, PRs, repo insights, predictions, bottlenecks, risks
  getUnifiedTodos: protectedProcedure.query(async ({ ctx }) => {
    const [tasks, prsToReview, selectedRepos, predictions, bottlenecks, knowledgeBase] = await Promise.all([
      // User's assigned tasks + unassigned org tasks (not done)
      prisma.task.findMany({
        where: {
          organizationId: ctx.organizationId,
          OR: [
            { assigneeId: ctx.userId },
            { assigneeId: null },
          ],
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
        ],
        take: 20,
        include: {
          project: { select: { id: true, name: true, key: true } },
        },
      }),

      // Open PRs in tracked repos
      prisma.pullRequest.findMany({
        where: {
          organizationId: ctx.organizationId,
          status: 'OPEN',
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
        include: {
          author: { select: { id: true, name: true, image: true } },
        },
      }),

      // Selected repos with metrics
      prisma.selectedRepository.findMany({
        where: { organizationId: ctx.organizationId, syncEnabled: true },
        select: {
          id: true,
          fullName: true,
          description: true,
          language: true,
          completenessScore: true,
          openPRCount: true,
          openIssueCount: true,
          todoCount: true,
          lastAnalyzedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),

      // Active predictions (include orphaned null-projectId records for backward compat)
      prisma.prediction.findMany({
        where: {
          OR: [
            { project: { organizationId: ctx.organizationId } },
            { projectId: null },
          ],
          isActive: true,
        },
        orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
        take: 10,
        include: {
          project: { select: { id: true, name: true, key: true } },
        },
      }),

      // Active bottlenecks (include orphaned null-projectId records for backward compat)
      prisma.bottleneck.findMany({
        where: {
          OR: [
            { project: { organizationId: ctx.organizationId } },
            { projectId: null },
          ],
          status: 'ACTIVE',
        },
        orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }],
        take: 10,
        include: {
          project: { select: { id: true, name: true, key: true } },
        },
      }),

      // Knowledge base for risks and recommendations
      prisma.organizationKnowledgeBase.findUnique({
        where: { organizationId: ctx.organizationId },
      }),
    ])

    // Extract risks and recommendations from knowledge base
    const risks = (knowledgeBase?.goalProgress as { risks?: Array<{
      category: string
      title: string
      description: string
      likelihood: string
      impact: string
      mitigation: string
    }> })?.risks || []

    const recommendations = (knowledgeBase?.recommendations as Array<{
      title: string
      description: string
      priority: string
      category: string
    }>) || []

    // Calculate summary stats
    const totalTasks = tasks.length
    const urgentTasks = tasks.filter(t => t.priority === 'URGENT' || t.priority === 'HIGH').length
    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length
    const totalPRs = prsToReview.length
    const totalTodos = selectedRepos.reduce((sum, r) => sum + r.todoCount, 0)

    // Content is available if we have any insights
    const hasContent = totalTasks > 0 || totalPRs > 0 || selectedRepos.length > 0 ||
      predictions.length > 0 || bottlenecks.length > 0 || risks.length > 0

    return {
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        source: t.source,
        externalUrl: t.externalUrl,
        labels: t.labels,
        project: t.project,
      })),
      prsToReview: prsToReview.map(pr => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        url: pr.url,
        repository: pr.repository,
        isDraft: pr.isDraft,
        createdAt: pr.createdAt,
        additions: pr.additions,
        deletions: pr.deletions,
        author: pr.author,
        isStuck: pr.isStuck,
      })),
      repoStats: selectedRepos.map(r => ({
        id: r.id,
        fullName: r.fullName,
        description: r.description,
        language: r.language,
        completenessScore: r.completenessScore,
        openPRCount: r.openPRCount,
        openIssueCount: r.openIssueCount,
        todoCount: r.todoCount,
        lastAnalyzedAt: r.lastAnalyzedAt,
      })),
      predictions: predictions.map(p => ({
        id: p.id,
        type: p.type,
        confidence: p.confidence,
        reasoning: p.reasoning,
        value: p.value as { title?: string; description?: string; suggestedAction?: string } | null,
        project: p.project,
        createdAt: p.createdAt,
      })),
      bottlenecks: bottlenecks.map(b => ({
        id: b.id,
        type: b.type,
        severity: b.severity,
        title: b.title,
        description: b.description,
        impact: b.impact,
        project: b.project,
        detectedAt: b.detectedAt,
      })),
      risks,
      recommendations,
      summary: {
        totalTasks,
        urgentTasks,
        overdueTasks,
        totalPRs,
        totalTodos,
        totalPredictions: predictions.length,
        totalBottlenecks: bottlenecks.length,
        totalRisks: risks.length,
        hasContent,
      },
    }
  }),

  list: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      teamId: z.string().optional(),
      assigneeId: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      source: z.string().optional(),
      isStale: z.boolean().optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
      cursor: z.string().optional(),
    }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const tasks = await prisma.task.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(input.projectId && { projectId: input.projectId }),
          ...(input.teamId && { teamId: input.teamId }),
          ...(input.assigneeId && { assigneeId: input.assigneeId }),
          ...(input.status && { status: input.status as TaskStatus }),
          ...(input.priority && { priority: input.priority as TaskPriority }),
          ...(input.source && { source: input.source as TaskSource }),
          ...(input.isStale !== undefined && { isStale: input.isStale }),
          ...(input.search && {
            OR: [
              { title: { contains: input.search, mode: 'insensitive' } },
              { description: { contains: input.search, mode: 'insensitive' } },
            ],
          }),
        },
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          project: { select: { id: true, name: true, key: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
      })

      let nextCursor: string | undefined = undefined
      if (tasks.length > input.limit) {
        const nextItem = tasks.pop()
        nextCursor = nextItem?.id
      }

      return { tasks, nextCursor }
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.task.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          project: { select: { id: true, name: true, key: true } },
          creator: { select: { id: true, name: true } },
        },
      })
    }),

  create: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      storyPoints: z.number().optional(),
      dueDate: z.date().optional(),
      labels: z.array(z.string()).optional(),
      projectId: z.string().optional(),
      teamId: z.string().optional(),
      assigneeId: z.string().optional(),
      blockedByIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.task.create({
        data: {
          title: input.title,
          description: input.description,
          status: (input.status as TaskStatus) || TaskStatus.BACKLOG,
          priority: (input.priority as TaskPriority) || TaskPriority.MEDIUM,
          storyPoints: input.storyPoints,
          dueDate: input.dueDate,
          labels: input.labels || [],
          projectId: input.projectId,
          teamId: input.teamId,
          assigneeId: input.assigneeId,
          creatorId: ctx.userId,
          blockedByIds: input.blockedByIds || [],
          source: TaskSource.INTERNAL,
          organizationId: ctx.organizationId, // Link to organization
        },
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          project: { select: { id: true, name: true, key: true } },
        },
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      storyPoints: z.number().optional(),
      dueDate: z.date().optional(),
      labels: z.array(z.string()).optional(),
      assigneeId: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return prisma.task.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.status && { status: data.status as TaskStatus }),
          ...(data.priority && { priority: data.priority as TaskPriority }),
          ...(data.storyPoints !== undefined && { storyPoints: data.storyPoints }),
          ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
          ...(data.labels && { labels: data.labels }),
          ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        },
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          project: { select: { id: true, name: true, key: true } },
        },
      })
    }),

  delete: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.task.delete({ where: { id: input.id } })
      return { success: true }
    }),

  bulkUpdate: managerProcedure
    .input(z.object({
      ids: z.array(z.string()),
      data: z.object({
        status: z.string().optional(),
        priority: z.string().optional(),
        assigneeId: z.string().nullable().optional(),
        labels: z.array(z.string()).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const result = await prisma.task.updateMany({
        where: { id: { in: input.ids } },
        data: {
          ...(input.data.status && { status: input.data.status as TaskStatus }),
          ...(input.data.priority && { priority: input.data.priority as TaskPriority }),
          ...(input.data.assigneeId !== undefined && { assigneeId: input.data.assigneeId }),
          ...(input.data.labels && { labels: input.data.labels }),
        },
      })
      return { success: true, count: result.count }
    }),

  getStats: protectedProcedure
    .input(z.object({ projectId: z.string().optional() }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const where = {
        project: { organizationId: ctx.organizationId },
        ...(input.projectId && { projectId: input.projectId }),
      }

      const [byStatus, byPriority, staleCount] = await Promise.all([
        prisma.task.groupBy({
          by: ['status'],
          where,
          _count: { status: true },
        }),
        prisma.task.groupBy({
          by: ['priority'],
          where,
          _count: { priority: true },
        }),
        prisma.task.count({
          where: { ...where, isStale: true },
        }),
      ])

      return {
        byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count.status])),
        byPriority: Object.fromEntries(byPriority.map(p => [p.priority, p._count.priority])),
        staleCount,
      }
    }),
})

export type TasksRouter = typeof tasksRouter
