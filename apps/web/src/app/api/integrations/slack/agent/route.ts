import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma, ConversationChannel, IntegrationType } from '@nexflow/database'
import { AgentCore } from '@nexflow/ai'
import type { AgentChatContext } from '@nexflow/ai'

// Verify Slack request signature
function verifySlackRequest(
  body: string,
  timestamp: string,
  signature: string,
  signingSecret: string
): boolean {
  const baseString = `v0:${timestamp}:${body}`
  const hmac = crypto.createHmac('sha256', signingSecret)
  hmac.update(baseString)
  const computedSignature = `v0=${hmac.digest('hex')}`
  return crypto.timingSafeEqual(
    Buffer.from(computedSignature),
    Buffer.from(signature)
  )
}

// Format message for Slack blocks
function formatSlackResponse(message: string, pendingActions?: Array<{
  id: string
  skill: string
  description: string
  params: Record<string, unknown>
}>): object[] {
  const blocks: object[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: message,
      },
    },
  ]

  // Add action buttons for pending actions
  if (pendingActions && pendingActions.length > 0) {
    for (const action of pendingActions) {
      blocks.push({
        type: 'divider',
      })
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Pending Action: ${getSkillLabel(action.skill)}*\n${action.description}`,
        },
      })
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Approve',
            },
            style: 'primary',
            action_id: `approve_${action.id}`,
            value: JSON.stringify({
              actionId: action.id,
              skill: action.skill,
              params: action.params,
            }),
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Reject',
            },
            style: 'danger',
            action_id: `reject_${action.id}`,
            value: JSON.stringify({
              actionId: action.id,
            }),
          },
        ],
      })
    }
  }

  return blocks
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
    const timestamp = request.headers.get('x-slack-request-timestamp')
    const signature = request.headers.get('x-slack-signature')

    // Verify signature if we have signing secret
    const signingSecret = process.env.SLACK_SIGNING_SECRET
    if (signingSecret && timestamp && signature) {
      // Check timestamp to prevent replay attacks
      const timestampNum = parseInt(timestamp, 10)
      const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5
      if (timestampNum < fiveMinutesAgo) {
        return NextResponse.json({ error: 'Request too old' }, { status: 400 })
      }

      const isValid = verifySlackRequest(body, timestamp, signature, signingSecret)
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    }

    const payload = JSON.parse(body)

    // Handle URL verification challenge
    if (payload.type === 'url_verification') {
      return NextResponse.json({ challenge: payload.challenge })
    }

    // Handle event callbacks
    if (payload.type === 'event_callback') {
      const event = payload.event

      // Handle app mentions
      if (event.type === 'app_mention') {
        return handleAppMention(event, payload.team_id)
      }

      // Handle direct messages
      if (event.type === 'message' && event.channel_type === 'im') {
        // Ignore bot messages
        if (event.bot_id) {
          return NextResponse.json({ ok: true })
        }
        return handleDirectMessage(event, payload.team_id)
      }
    }

    // Handle interactive messages (button clicks)
    if (payload.type === 'interactive_message' || payload.payload) {
      const interactivePayload = payload.payload ? JSON.parse(payload.payload) : payload
      return handleInteraction(interactivePayload)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Slack webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleAppMention(event: {
  user: string
  text: string
  channel: string
  ts: string
  thread_ts?: string
}, teamId: string) {
  // Get organization from Slack team ID
  const integration = await prisma.integration.findFirst({
    where: {
      type: IntegrationType.SLACK,
      metadata: {
        path: ['team_id'],
        equals: teamId,
      },
    },
    include: {
      organization: true,
    },
  })

  if (!integration) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  // Extract message (remove the bot mention)
  const message = event.text.replace(/<@[A-Z0-9]+>/g, '').trim()

  if (!message) {
    return NextResponse.json({ ok: true })
  }

  // Find or create conversation
  const externalId = event.thread_ts || event.ts

  let conversation = await prisma.agentConversation.findFirst({
    where: {
      organizationId: integration.organizationId,
      channel: ConversationChannel.SLACK,
      externalId,
    },
  })

  if (!conversation) {
    conversation = await prisma.agentConversation.create({
      data: {
        organizationId: integration.organizationId,
        channel: ConversationChannel.SLACK,
        externalId,
        title: message.slice(0, 50),
      },
    })
  }

  // Process with agent
  const context: AgentChatContext = {
    organizationId: integration.organizationId,
    channel: 'SLACK',
    conversationId: conversation.id,
  }

  const agent = new AgentCore(context)
  const response = await agent.chat(message)

  // Post response to Slack
  const slackResponse = await postToSlack({
    channel: event.channel,
    thread_ts: event.thread_ts || event.ts,
    text: response.message,
    blocks: formatSlackResponse(response.message, response.pendingActions),
  })

  return NextResponse.json({ ok: true, response: slackResponse })
}

async function handleDirectMessage(event: {
  user: string
  text: string
  channel: string
  ts: string
}, teamId: string) {
  // Get organization from Slack team ID
  const integration = await prisma.integration.findFirst({
    where: {
      type: IntegrationType.SLACK,
      metadata: {
        path: ['team_id'],
        equals: teamId,
      },
    },
  })

  if (!integration) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  // Find or create conversation for this DM
  const externalId = `dm_${event.user}`

  let conversation = await prisma.agentConversation.findFirst({
    where: {
      organizationId: integration.organizationId,
      channel: ConversationChannel.SLACK,
      externalId,
    },
  })

  if (!conversation) {
    conversation = await prisma.agentConversation.create({
      data: {
        organizationId: integration.organizationId,
        channel: ConversationChannel.SLACK,
        externalId,
      },
    })
  }

  // Process with agent
  const context: AgentChatContext = {
    organizationId: integration.organizationId,
    channel: 'SLACK',
    conversationId: conversation.id,
  }

  const agent = new AgentCore(context)
  const response = await agent.chat(event.text)

  // Post response to Slack
  await postToSlack({
    channel: event.channel,
    text: response.message,
    blocks: formatSlackResponse(response.message, response.pendingActions),
  })

  return NextResponse.json({ ok: true })
}

async function handleInteraction(payload: {
  type: string
  team: { id: string }
  channel: { id: string }
  message: { ts: string; thread_ts?: string }
  actions?: Array<{ action_id: string; value: string }>
  user: { id: string }
}) {
  if (payload.type !== 'block_actions' || !payload.actions?.length) {
    return NextResponse.json({ ok: true })
  }

  const action = payload.actions[0]
  const actionData = JSON.parse(action.value)

  // Get organization
  const integration = await prisma.integration.findFirst({
    where: {
      type: IntegrationType.SLACK,
      metadata: {
        path: ['team_id'],
        equals: payload.team.id,
      },
    },
  })

  if (!integration) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const context: AgentChatContext = {
    organizationId: integration.organizationId,
    channel: 'SLACK',
  }

  const agent = new AgentCore(context)

  if (action.action_id.startsWith('approve_')) {
    // Execute the approved action
    const result = await agent.executeAction(actionData.actionId, {
      skill: actionData.skill,
      params: actionData.params,
    })

    // Update the message to show result
    await updateSlackMessage({
      channel: payload.channel.id,
      ts: payload.message.ts,
      text: result.success
        ? `Action approved and executed. ${result.result}`
        : `Action failed: ${result.error}`,
    })
  } else if (action.action_id.startsWith('reject_')) {
    await updateSlackMessage({
      channel: payload.channel.id,
      ts: payload.message.ts,
      text: 'Action rejected by user.',
    })
  }

  return NextResponse.json({ ok: true })
}

// Helper to post message to Slack
async function postToSlack(params: {
  channel: string
  text: string
  thread_ts?: string
  blocks?: object[]
}) {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) {
    console.warn('SLACK_BOT_TOKEN not configured')
    return null
  }

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: params.channel,
      text: params.text,
      thread_ts: params.thread_ts,
      blocks: params.blocks,
    }),
  })

  return response.json()
}

// Helper to update Slack message
async function updateSlackMessage(params: {
  channel: string
  ts: string
  text: string
}) {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) {
    console.warn('SLACK_BOT_TOKEN not configured')
    return null
  }

  const response = await fetch('https://slack.com/api/chat.update', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: params.channel,
      ts: params.ts,
      text: params.text,
    }),
  })

  return response.json()
}
