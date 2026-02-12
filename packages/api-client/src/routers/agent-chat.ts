import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma, ConversationChannel } from '@nexflow/database'
import { AgentCore, getSkillByName } from '@nexflow/ai'
import type { AgentChatContext } from '@nexflow/ai'

export const agentChatRouter = router({
  // Send a message to the AI agent and get a response
  chat: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1),
        conversationId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const context: AgentChatContext = {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        channel: 'WEB',
        conversationId: input.conversationId,
      }

      const agent = new AgentCore(context)
      const response = await agent.chat(input.message)

      return {
        message: response.message,
        conversationId: response.conversationId,
        toolCalls: response.toolCalls,
        pendingActions: response.pendingActions,
      }
    }),

  // Get all conversations for the current user/org
  getConversations: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const conversations = await prisma.agentConversation.findMany({
        where: {
          organizationId: ctx.organizationId,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
      })

      let nextCursor: string | undefined = undefined
      if (conversations.length > input.limit) {
        const nextItem = conversations.pop()
        nextCursor = nextItem?.id
      }

      return {
        conversations: conversations.map((c) => ({
          id: c.id,
          title: c.title ?? getConversationTitle(c.messages[0]?.content),
          channel: c.channel,
          lastMessage: c.messages[0]?.content?.slice(0, 100),
          lastMessageAt: c.messages[0]?.createdAt,
          user: c.user,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
        nextCursor,
      }
    }),

  // Get a specific conversation with messages
  getConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        messageLimit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      const conversation = await prisma.agentConversation.findFirst({
        where: {
          id: input.conversationId,
          organizationId: ctx.organizationId,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: input.messageLimit,
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      if (!conversation) {
        throw new Error('Conversation not found')
      }

      return {
        id: conversation.id,
        title: conversation.title,
        channel: conversation.channel,
        user: conversation.user,
        messages: conversation.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          toolCalls: m.toolCalls,
          pendingActions: m.pendingActions,
          createdAt: m.createdAt,
        })),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      }
    }),

  // Delete a conversation
  deleteConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await prisma.agentConversation.deleteMany({
        where: {
          id: input.conversationId,
          organizationId: ctx.organizationId,
        },
      })

      return { success: true }
    }),

  // Approve a pending action
  approveAction: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        messageId: z.string(),
        actionId: z.string(),
        skillName: z.string(),
        params: z.record(z.unknown()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify conversation belongs to org
      const conversation = await prisma.agentConversation.findFirst({
        where: {
          id: input.conversationId,
          organizationId: ctx.organizationId,
        },
      })

      if (!conversation) {
        throw new Error('Conversation not found')
      }

      // Get the skill and execute it
      const skill = getSkillByName(input.skillName)
      if (!skill) {
        throw new Error(`Unknown skill: ${input.skillName}`)
      }

      const context: AgentChatContext = {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        channel: conversation.channel as AgentChatContext['channel'],
        conversationId: input.conversationId,
      }

      const result = await skill.execute(input.params, context)

      // Update the message to mark action as executed
      await prisma.agentMessage.update({
        where: { id: input.messageId },
        data: {
          pendingActions: undefined, // Clear pending actions after execution
        },
      })

      // Add a new message showing the result
      await prisma.agentMessage.create({
        data: {
          conversationId: input.conversationId,
          role: 'assistant',
          content: result.success
            ? `Action completed: ${result.message}`
            : `Action failed: ${result.error}`,
          toolCalls: [
            {
              id: input.actionId,
              name: input.skillName,
              arguments: input.params as object,
              result: result as object,
            },
          ] as object,
        },
      })

      return {
        success: result.success,
        result: result.data,
        message: result.message,
        error: result.error,
      }
    }),

  // Reject a pending action
  rejectAction: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        messageId: z.string(),
        actionId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify conversation belongs to org
      const conversation = await prisma.agentConversation.findFirst({
        where: {
          id: input.conversationId,
          organizationId: ctx.organizationId,
        },
      })

      if (!conversation) {
        throw new Error('Conversation not found')
      }

      // Update the message to mark action as rejected
      await prisma.agentMessage.update({
        where: { id: input.messageId },
        data: {
          pendingActions: undefined,
        },
      })

      // Add a message noting the rejection
      await prisma.agentMessage.create({
        data: {
          conversationId: input.conversationId,
          role: 'system',
          content: `Action rejected${input.reason ? `: ${input.reason}` : ''}`,
        },
      })

      return { success: true }
    }),

  // Get heartbeat configuration
  getHeartbeatConfig: protectedProcedure.query(async ({ ctx }) => {
    let config = await prisma.heartbeatConfig.findUnique({
      where: { organizationId: ctx.organizationId },
    })

    // Return defaults if no config exists
    if (!config) {
      return {
        enabled: true,
        dailyBriefingEnabled: true,
        dailyBriefingTime: '09:00',
        dailyBriefingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        alertOnBlockers: true,
        alertOnRisks: true,
        alertOnMilestones: true,
        slackChannelId: null,
        discordChannelId: null,
        webNotifications: true,
        quietHoursStart: null,
        quietHoursEnd: null,
        timezone: 'UTC',
      }
    }

    return {
      enabled: config.enabled,
      dailyBriefingEnabled: config.dailyBriefingEnabled,
      dailyBriefingTime: config.dailyBriefingTime,
      dailyBriefingDays: config.dailyBriefingDays,
      alertOnBlockers: config.alertOnBlockers,
      alertOnRisks: config.alertOnRisks,
      alertOnMilestones: config.alertOnMilestones,
      slackChannelId: config.slackChannelId,
      discordChannelId: config.discordChannelId,
      webNotifications: config.webNotifications,
      quietHoursStart: config.quietHoursStart,
      quietHoursEnd: config.quietHoursEnd,
      timezone: config.timezone,
    }
  }),

  // Update heartbeat configuration
  updateHeartbeatConfig: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean().optional(),
        dailyBriefingEnabled: z.boolean().optional(),
        dailyBriefingTime: z.string().optional(),
        dailyBriefingDays: z.array(z.string()).optional(),
        alertOnBlockers: z.boolean().optional(),
        alertOnRisks: z.boolean().optional(),
        alertOnMilestones: z.boolean().optional(),
        slackChannelId: z.string().nullable().optional(),
        discordChannelId: z.string().nullable().optional(),
        webNotifications: z.boolean().optional(),
        quietHoursStart: z.string().nullable().optional(),
        quietHoursEnd: z.string().nullable().optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const config = await prisma.heartbeatConfig.upsert({
        where: { organizationId: ctx.organizationId },
        update: {
          ...input,
          updatedAt: new Date(),
        },
        create: {
          organizationId: ctx.organizationId,
          ...input,
        },
      })

      return config
    }),

  // Generate a briefing on demand
  generateBriefing: protectedProcedure.mutation(async ({ ctx }) => {
    const context: AgentChatContext = {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      channel: 'API',
    }

    const agent = new AgentCore(context)
    const briefing = await agent.generateBriefing()

    return { briefing }
  }),

  // Get recent AI agent activity
  getAgentActivity: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input, ctx }) => {
      const messages = await prisma.agentMessage.findMany({
        where: {
          conversation: {
            organizationId: ctx.organizationId,
          },
          role: 'assistant',
          toolCalls: { not: undefined },
        },
        include: {
          conversation: {
            select: { id: true, title: true, channel: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      })

      return messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        conversationTitle: m.conversation?.title,
        channel: m.conversation?.channel,
        toolCalls: m.toolCalls,
        createdAt: m.createdAt,
      }))
    }),
})

// Helper to generate conversation title from first message
function getConversationTitle(content?: string): string {
  if (!content) return 'New Conversation'

  // Take first 50 chars, find last complete word
  const truncated = content.slice(0, 50)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > 20) {
    return truncated.slice(0, lastSpace) + '...'
  }

  return truncated + (content.length > 50 ? '...' : '')
}
