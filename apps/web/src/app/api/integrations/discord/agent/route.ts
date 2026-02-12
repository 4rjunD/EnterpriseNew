import { NextResponse } from 'next/server'
import { prisma, ConversationChannel, IntegrationType } from '@nexflow/database'
import { AgentCore } from '@nexflow/ai'
import type { AgentChatContext } from '@nexflow/ai'
import nacl from 'tweetnacl'

// Verify Discord request signature
function verifyDiscordRequest(
  body: string,
  signature: string,
  timestamp: string,
  publicKey: string
): boolean {
  try {
    const isVerified = nacl.sign.detached.verify(
      Buffer.from(timestamp + body),
      Buffer.from(signature, 'hex'),
      Buffer.from(publicKey, 'hex')
    )
    return isVerified
  } catch {
    return false
  }
}

// Format message for Discord embeds
function formatDiscordResponse(message: string, pendingActions?: Array<{
  id: string
  skill: string
  description: string
  params: Record<string, unknown>
}>): object {
  const response: {
    content?: string
    embeds?: object[]
    components?: object[]
  } = {}

  // Main message
  if (message.length <= 2000) {
    response.content = message
  } else {
    // If message is too long, use embed
    response.embeds = [
      {
        description: message.slice(0, 4096),
        color: 0x5865F2, // Discord blurple
      },
    ]
  }

  // Add action buttons for pending actions
  if (pendingActions && pendingActions.length > 0) {
    response.embeds = response.embeds || []
    response.components = []

    for (const action of pendingActions) {
      response.embeds.push({
        title: `Pending: ${getSkillLabel(action.skill)}`,
        description: action.description,
        color: 0xFEE75C, // Yellow for pending
      })

      response.components.push({
        type: 1, // Action Row
        components: [
          {
            type: 2, // Button
            style: 3, // Success (green)
            label: 'Approve',
            custom_id: `approve_${action.id}`,
          },
          {
            type: 2, // Button
            style: 4, // Danger (red)
            label: 'Reject',
            custom_id: `reject_${action.id}`,
          },
        ],
      })
    }
  }

  return response
}

function getSkillLabel(skill: string): string {
  const labels: Record<string, string> = {
    send_nudge: 'Send Nudge',
    reassign_task: 'Reassign Task',
    create_task: 'Create Task',
    update_status: 'Update Status',
    schedule_meeting: 'Schedule Meeting',
  }
  return labels[skill] || skill
}

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-signature-ed25519')
    const timestamp = request.headers.get('x-signature-timestamp')

    // Verify signature
    const publicKey = process.env.DISCORD_PUBLIC_KEY
    if (publicKey && signature && timestamp) {
      const isValid = verifyDiscordRequest(body, signature, timestamp, publicKey)
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(body)

    // Handle ping (Discord verification)
    if (payload.type === 1) {
      return NextResponse.json({ type: 1 })
    }

    // Handle slash commands
    if (payload.type === 2) {
      return handleSlashCommand(payload)
    }

    // Handle message components (button clicks)
    if (payload.type === 3) {
      return handleInteraction(payload)
    }

    return NextResponse.json({ type: 1 })
  } catch (error) {
    console.error('Discord webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleSlashCommand(payload: {
  guild_id: string
  channel_id: string
  data: {
    name: string
    options?: Array<{ name: string; value: string }>
  }
  member?: { user: { id: string } }
  user?: { id: string }
}) {
  // Get organization from Discord guild ID
  const integration = await prisma.integration.findFirst({
    where: {
      type: IntegrationType.DISCORD,
      metadata: {
        path: ['guild_id'],
        equals: payload.guild_id,
      },
    },
  })

  if (!integration) {
    return NextResponse.json({
      type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        content: 'This Discord server is not connected to NexFlow. Please set up the integration first.',
        flags: 64, // Ephemeral
      },
    })
  }

  // Handle /nexflow command
  if (payload.data.name === 'nexflow') {
    const message = payload.data.options?.find((o) => o.name === 'message')?.value

    if (!message) {
      return NextResponse.json({
        type: 4,
        data: {
          content: 'Please provide a message. Usage: `/nexflow message:your question here`',
          flags: 64,
        },
      })
    }

    // Find or create conversation
    const externalId = `discord_${payload.guild_id}_${payload.channel_id}`

    let conversation = await prisma.agentConversation.findFirst({
      where: {
        organizationId: integration.organizationId,
        channel: ConversationChannel.DISCORD,
        externalId,
      },
    })

    if (!conversation) {
      conversation = await prisma.agentConversation.create({
        data: {
          organizationId: integration.organizationId,
          channel: ConversationChannel.DISCORD,
          externalId,
          title: message.slice(0, 50),
        },
      })
    }

    // Process with agent
    const context: AgentChatContext = {
      organizationId: integration.organizationId,
      channel: 'DISCORD',
      conversationId: conversation.id,
    }

    const agent = new AgentCore(context)
    const response = await agent.chat(message)

    const discordResponse = formatDiscordResponse(response.message, response.pendingActions)

    return NextResponse.json({
      type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
      data: discordResponse,
    })
  }

  // Handle /status command (shortcut)
  if (payload.data.name === 'status') {
    const context: AgentChatContext = {
      organizationId: integration.organizationId,
      channel: 'DISCORD',
    }

    const agent = new AgentCore(context)
    const response = await agent.chat("What's our current project status?")

    return NextResponse.json({
      type: 4,
      data: formatDiscordResponse(response.message),
    })
  }

  // Handle /standup command (shortcut)
  if (payload.data.name === 'standup') {
    const context: AgentChatContext = {
      organizationId: integration.organizationId,
      channel: 'DISCORD',
    }

    const agent = new AgentCore(context)
    const response = await agent.chat('Write me a standup for today')

    return NextResponse.json({
      type: 4,
      data: formatDiscordResponse(response.message),
    })
  }

  // Handle /blockers command (shortcut)
  if (payload.data.name === 'blockers') {
    const context: AgentChatContext = {
      organizationId: integration.organizationId,
      channel: 'DISCORD',
    }

    const agent = new AgentCore(context)
    const response = await agent.chat('Are there any blockers I should know about?')

    return NextResponse.json({
      type: 4,
      data: formatDiscordResponse(response.message),
    })
  }

  return NextResponse.json({
    type: 4,
    data: {
      content: 'Unknown command',
      flags: 64,
    },
  })
}

async function handleInteraction(payload: {
  guild_id: string
  data: {
    custom_id: string
    component_type: number
  }
  message: {
    id: string
    channel_id: string
  }
}) {
  const customId = payload.data.custom_id

  // Get organization
  const integration = await prisma.integration.findFirst({
    where: {
      type: IntegrationType.DISCORD,
      metadata: {
        path: ['guild_id'],
        equals: payload.guild_id,
      },
    },
  })

  if (!integration) {
    return NextResponse.json({
      type: 4,
      data: {
        content: 'Organization not found',
        flags: 64,
      },
    })
  }

  if (customId.startsWith('approve_')) {
    const actionId = customId.replace('approve_', '')

    // TODO: Retrieve action details from database and execute
    // For now, acknowledge the interaction
    return NextResponse.json({
      type: 7, // UPDATE_MESSAGE
      data: {
        content: 'Action approved. Processing...',
        components: [], // Remove buttons
      },
    })
  }

  if (customId.startsWith('reject_')) {
    return NextResponse.json({
      type: 7, // UPDATE_MESSAGE
      data: {
        content: 'Action rejected.',
        components: [], // Remove buttons
      },
    })
  }

  return NextResponse.json({ type: 1 })
}
