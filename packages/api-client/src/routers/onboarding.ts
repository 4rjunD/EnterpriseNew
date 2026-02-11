import { router, protectedProcedure } from '../trpc'
import { prisma } from '@nexflow/database'

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
