import { router, protectedProcedure } from '../trpc'
import { prisma, UserRole } from '@nexflow/database'
import { z } from 'zod'
import { sendInvitationEmail } from '@nexflow/integrations/email'

export const onboardingRouter = router({
  // Get onboarding status
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { onboardingCompleted: true },
    })
    return { completed: user?.onboardingCompleted ?? false }
  }),

  // Mark onboarding as complete and send any pending invites
  complete: protectedProcedure
    .input(
      z
        .object({
          invites: z
            .array(
              z.object({
                email: z.string().email(),
                name: z.string(),
                role: z.enum(['member', 'admin', 'cofounder']),
              })
            )
            .optional(),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      // Mark onboarding as complete
      await prisma.user.update({
        where: { id: ctx.userId },
        data: { onboardingCompleted: true },
      })

      // Send invites if provided
      const inviteResults: Array<{ email: string; status: string }> = []

      if (input?.invites && input.invites.length > 0) {
        const inviter = await prisma.user.findUnique({
          where: { id: ctx.userId },
          include: { organization: true },
        })

        if (inviter) {
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 7)

          for (const invite of input.invites) {
            // Skip empty emails
            if (!invite.email.trim()) continue

            try {
              // Check if user already exists
              const existingUser = await prisma.user.findUnique({
                where: { email: invite.email },
              })
              if (existingUser) {
                inviteResults.push({ email: invite.email, status: 'already_exists' })
                continue
              }

              // Map role
              const roleMap: Record<string, UserRole> = {
                member: UserRole.IC,
                admin: UserRole.MANAGER,
                cofounder: UserRole.ADMIN,
              }

              // Create invitation
              const invitation = await prisma.invitation.create({
                data: {
                  email: invite.email,
                  role: roleMap[invite.role] || UserRole.IC,
                  organizationId: ctx.organizationId,
                  invitedById: ctx.userId,
                  expiresAt,
                },
              })

              // Send invitation email
              await sendInvitationEmail({
                to: invite.email,
                inviterName: inviter.name || inviter.email,
                organizationName: inviter.organization.name,
                inviteToken: invitation.token,
              })

              inviteResults.push({ email: invite.email, status: 'sent' })
            } catch (error) {
              console.error(`Failed to send invite to ${invite.email}:`, error)
              inviteResults.push({ email: invite.email, status: 'failed' })
            }
          }
        }
      }

      return { success: true, invitesSent: inviteResults.filter((r) => r.status === 'sent').length }
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

  // Save company context during onboarding
  saveCompanyContext: protectedProcedure
    .input(
      z.object({
        industry: z.string().optional(),
        companyStage: z.string().optional(),
        teamDistribution: z.string().optional(),
        developmentMethod: z.string().optional(),
        primaryChallenges: z.array(z.string()).optional(),
        riskTolerance: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const primaryChallenges = input.primaryChallenges?.filter((c) => c.trim()) || []

      // First check if project context exists
      const existing = await prisma.projectContext.findFirst({
        where: { organizationId: ctx.organizationId },
      })

      if (existing) {
        return prisma.projectContext.update({
          where: { id: existing.id },
          data: {
            industry: input.industry,
            companyStage: input.companyStage,
            teamDistribution: input.teamDistribution,
            developmentMethod: input.developmentMethod,
            primaryChallenges,
            riskTolerance: input.riskTolerance,
          },
        })
      }

      // Create with minimal buildingDescription - will be updated later
      return prisma.projectContext.create({
        data: {
          organizationId: ctx.organizationId,
          buildingDescription: 'To be defined',
          industry: input.industry,
          companyStage: input.companyStage,
          teamDistribution: input.teamDistribution,
          developmentMethod: input.developmentMethod,
          primaryChallenges,
          riskTolerance: input.riskTolerance,
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
