import { z } from 'zod'
import { router, protectedProcedure, adminProcedure, publicProcedure, TRPCError } from '../trpc'
import { prisma, UserRole } from '@nexflow/database'
import { sendInvitationEmail } from '@nexflow/integrations/email'

export const invitationsRouter = router({
  // Send bulk invitations (admin only)
  sendBulk: adminProcedure
    .input(
      z.object({
        emails: z.array(z.string().email()),
        role: z.nativeEnum(UserRole).optional().default(UserRole.IC),
        teamId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

      // Get inviter and organization details for email
      const inviter = await prisma.user.findUnique({
        where: { id: ctx.userId },
        include: { organization: true },
      })

      const results = await Promise.allSettled(
        input.emails.map(async (email) => {
          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email },
          })
          if (existingUser) {
            return { email, status: 'already_exists' as const }
          }

          // Check if invitation already exists
          const existingInvitation = await prisma.invitation.findFirst({
            where: {
              email,
              organizationId: ctx.organizationId,
              status: 'PENDING',
            },
          })
          if (existingInvitation) {
            return { email, status: 'already_invited' as const }
          }

          // Create invitation
          const invitation = await prisma.invitation.create({
            data: {
              email,
              role: input.role,
              organizationId: ctx.organizationId,
              teamId: input.teamId,
              invitedById: ctx.userId,
              expiresAt,
            },
          })

          // Send invitation email
          if (inviter) {
            await sendInvitationEmail({
              to: email,
              inviterName: inviter.name || inviter.email,
              organizationName: inviter.organization.name,
              inviteToken: invitation.token,
            })
          }

          return {
            email,
            status: 'sent' as const,
            inviteLink: `/invite/${invitation.token}`,
          }
        })
      )

      const sent = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 'sent'
      ).length

      return {
        sent,
        total: input.emails.length,
        results: results.map((r) =>
          r.status === 'fulfilled' ? r.value : { email: '', status: 'failed' as const }
        ),
      }
    }),

  // List pending invitations
  list: adminProcedure.query(async ({ ctx }) => {
    const invitations = await prisma.invitation.findMany({
      where: {
        organizationId: ctx.organizationId,
      },
      include: {
        invitedBy: {
          select: { name: true, email: true },
        },
        team: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      teamName: inv.team?.name,
      invitedBy: inv.invitedBy.name || inv.invitedBy.email,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    }))
  }),

  // Get invitation by token (public - for accept page)
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const invitation = await prisma.invitation.findUnique({
        where: { token: input.token },
        include: {
          organization: {
            select: { name: true, logo: true },
          },
          team: {
            select: { name: true },
          },
        },
      })

      if (!invitation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' })
      }

      if (invitation.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invitation has already been ${invitation.status.toLowerCase()}`,
        })
      }

      if (invitation.expiresAt < new Date()) {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' },
        })
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invitation has expired' })
      }

      return {
        email: invitation.email,
        role: invitation.role,
        organizationName: invitation.organization.name,
        organizationLogo: invitation.organization.logo,
        teamName: invitation.team?.name,
      }
    }),

  // Accept invitation (creates user account)
  accept: publicProcedure
    .input(
      z.object({
        token: z.string(),
        name: z.string().min(1),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      const invitation = await prisma.invitation.findUnique({
        where: { token: input.token },
      })

      if (!invitation || invitation.status !== 'PENDING') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid invitation' })
      }

      if (invitation.expiresAt < new Date()) {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' },
        })
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invitation has expired' })
      }

      // Hash password
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.hash(input.password, 12)

      // Create user
      const user = await prisma.user.create({
        data: {
          email: invitation.email,
          name: input.name,
          password: hashedPassword,
          role: invitation.role,
          organizationId: invitation.organizationId,
          onboardingCompleted: true, // Invited users skip onboarding
        },
      })

      // Add to team if specified
      if (invitation.teamId) {
        await prisma.teamMember.create({
          data: {
            userId: user.id,
            teamId: invitation.teamId,
            role: 'MEMBER',
          },
        })
      }

      // Mark invitation as accepted
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      })

      return { success: true, email: user.email }
    }),

  // Cancel invitation (admin only)
  cancel: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await prisma.invitation.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      })

      if (!invitation) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      await prisma.invitation.update({
        where: { id: input.id },
        data: { status: 'CANCELLED' },
      })

      return { success: true }
    }),

  // Resend invitation
  resend: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await prisma.invitation.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      })

      if (!invitation) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const updated = await prisma.invitation.update({
        where: { id: input.id },
        data: {
          status: 'PENDING',
          expiresAt,
          updatedAt: new Date(),
        },
      })

      // Resend invitation email
      const inviter = await prisma.user.findUnique({
        where: { id: ctx.userId },
        include: { organization: true },
      })

      if (inviter) {
        await sendInvitationEmail({
          to: invitation.email,
          inviterName: inviter.name || inviter.email,
          organizationName: inviter.organization.name,
          inviteToken: updated.token,
        })
      }

      return { success: true }
    }),
})
