import { router, protectedProcedure } from '../trpc'
import { prisma } from '@nexflow/database'
import { z } from 'zod'

export const onboardingRouter = router({
  // Get onboarding status
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { onboardingCompleted: true },
    })
    return { completed: user?.onboardingCompleted ?? false }
  }),

  // Mark onboarding as complete
  complete: protectedProcedure.mutation(async ({ ctx }) => {
    await prisma.user.update({
      where: { id: ctx.userId },
      data: { onboardingCompleted: true },
    })
    return { success: true }
  }),

  // Save project context during onboarding
  saveProjectContext: protectedProcedure
    .input(
      z.object({
        buildingDescription: z.string().min(10, 'Please provide at least 10 characters'),
        milestones: z
          .array(
            z.object({
              name: z.string(),
              targetDate: z.string(),
              description: z.string().optional(),
            })
          )
          .optional(),
        goals: z.array(z.string()).optional(),
        techStack: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Filter out empty milestones and goals
      const milestones = input.milestones?.filter((m) => m.name.trim()) || []
      const goals = input.goals?.filter((g) => g.trim()) || []
      const techStack = input.techStack?.filter((t) => t.trim()) || []

      return prisma.projectContext.upsert({
        where: {
          organizationId: ctx.organizationId,
        },
        create: {
          organizationId: ctx.organizationId,
          buildingDescription: input.buildingDescription,
          milestones: milestones.length > 0 ? milestones : undefined,
          goals,
          techStack,
        },
        update: {
          buildingDescription: input.buildingDescription,
          milestones: milestones.length > 0 ? milestones : undefined,
          goals,
          techStack,
        },
      })
    }),

  // Get existing project context
  getProjectContext: protectedProcedure.query(async ({ ctx }) => {
    return prisma.projectContext.findFirst({
      where: { organizationId: ctx.organizationId },
    })
  }),

  // Get setup progress for getting started checklist
  getSetupProgress: protectedProcedure.query(async ({ ctx }) => {
    const [
      organization,
      integrations,
      teamMembers,
      bottlenecks,
      predictions,
      agentConfigs,
    ] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { id: true, name: true },
      }),
      prisma.integration.count({
        where: { organizationId: ctx.organizationId, status: 'CONNECTED' },
      }),
      prisma.user.count({
        where: { organizationId: ctx.organizationId },
      }),
      prisma.bottleneck.count({
        where: { project: { organizationId: ctx.organizationId } },
      }),
      prisma.prediction.count({
        where: { project: { organizationId: ctx.organizationId } },
      }),
      prisma.agentConfig.findMany({
        where: { organizationId: ctx.organizationId, enabled: true },
        select: { id: true },
      }),
    ])

    const hasWorkspace = !!organization
    const hasIntegration = integrations > 0
    const hasTeamMembers = teamMembers > 1 // More than just the current user
    const hasRunAnalysis = bottlenecks > 0 || predictions > 0
    const hasEnabledAgents = agentConfigs.length > 0

    const steps = [
      { id: 'workspace', label: 'Create your workspace', completed: hasWorkspace },
      { id: 'integration', label: 'Connect an integration', completed: hasIntegration },
      { id: 'team', label: 'Invite team members', completed: hasTeamMembers },
      { id: 'analysis', label: 'Run first analysis', completed: hasRunAnalysis },
      { id: 'agents', label: 'Enable AI agents', completed: hasEnabledAgents },
    ]

    const completedCount = steps.filter((s) => s.completed).length
    const totalCount = steps.length
    const isComplete = completedCount === totalCount

    return {
      steps,
      completedCount,
      totalCount,
      isComplete,
      progress: Math.round((completedCount / totalCount) * 100),
    }
  }),
})
