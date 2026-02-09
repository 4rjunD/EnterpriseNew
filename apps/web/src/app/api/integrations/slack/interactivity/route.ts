import { NextRequest, NextResponse } from 'next/server'
import { prisma, BottleneckStatus, TaskStatus } from '@nexflow/database'
import { SlackClient } from '@nexflow/integrations'

interface SlackInteractionPayload {
  type: string
  user: {
    id: string
    username: string
    name: string
  }
  actions: Array<{
    action_id: string
    block_id: string
    value?: string
    type: string
  }>
  container: {
    channel_id: string
    message_ts: string
  }
  response_url: string
  trigger_id: string
}

/**
 * POST /api/integrations/slack/interactivity
 * Handle Slack interactive message button clicks
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const rawBody = await request.text()

    // Verify the request signature
    const signature = request.headers.get('x-slack-signature')
    const timestamp = request.headers.get('x-slack-request-timestamp')

    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 })
    }

    if (!SlackClient.verifyRequestSignature(signature, timestamp, rawBody)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse the payload (it's URL-encoded with a 'payload' key)
    const params = new URLSearchParams(rawBody)
    const payloadString = params.get('payload')

    if (!payloadString) {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
    }

    const payload: SlackInteractionPayload = JSON.parse(payloadString)

    // Handle different interaction types
    if (payload.type !== 'block_actions') {
      return NextResponse.json({ ok: true })
    }

    // Process each action
    for (const action of payload.actions) {
      await handleAction(action, payload)
    }

    // Acknowledge the interaction
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error handling Slack interactivity:', error)
    // Slack requires a 200 response even on error to prevent retries
    return NextResponse.json({ ok: false })
  }
}

async function handleAction(
  action: SlackInteractionPayload['actions'][0],
  payload: SlackInteractionPayload
): Promise<void> {
  try {
    const actionData = action.value ? JSON.parse(action.value) : {}

    switch (action.action_id) {
      case 'mark_resolved':
        await handleMarkResolved(actionData, payload)
        break

      case 'snooze':
        await handleSnooze(actionData, payload)
        break

      case 'accept_task':
        await handleAcceptTask(actionData, payload)
        break

      case 'view_details':
      case 'view_task':
        // These are link buttons, no server-side action needed
        break

      default:
        console.log('Unknown action:', action.action_id)
    }
  } catch (error) {
    console.error('Error handling action:', action.action_id, error)
  }
}

async function handleMarkResolved(
  data: { itemId: string; type: 'task' | 'pr' },
  payload: SlackInteractionPayload
): Promise<void> {
  if (data.type === 'task') {
    // Mark task as resolved
    await prisma.task.update({
      where: { id: data.itemId },
      data: {
        isStale: false,
        staleAt: null,
      },
    })

    // Resolve any associated bottlenecks
    await prisma.bottleneck.updateMany({
      where: {
        taskId: data.itemId,
        status: BottleneckStatus.ACTIVE,
      },
      data: {
        status: BottleneckStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    })
  } else {
    // Mark PR as not stuck
    await prisma.pullRequest.update({
      where: { id: data.itemId },
      data: {
        isStuck: false,
        stuckAt: null,
      },
    })

    // Resolve any associated bottlenecks
    await prisma.bottleneck.updateMany({
      where: {
        pullRequestId: data.itemId,
        status: BottleneckStatus.ACTIVE,
      },
      data: {
        status: BottleneckStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    })
  }

  // Send a response message update
  await sendResponseMessage(payload.response_url, {
    text: `Marked as resolved by <@${payload.user.id}>`,
    replace_original: false,
    response_type: 'ephemeral',
  })
}

async function handleSnooze(
  data: { itemId: string; type: 'task' | 'pr' },
  payload: SlackInteractionPayload
): Promise<void> {
  // Snooze for 24 hours by updating the stale/stuck timestamp
  const snoozeUntil = new Date(Date.now() + 24 * 60 * 60 * 1000)

  if (data.type === 'task') {
    await prisma.task.update({
      where: { id: data.itemId },
      data: {
        staleAt: snoozeUntil,
      },
    })
  } else {
    await prisma.pullRequest.update({
      where: { id: data.itemId },
      data: {
        stuckAt: snoozeUntil,
      },
    })
  }

  await sendResponseMessage(payload.response_url, {
    text: `Snoozed for 24 hours by <@${payload.user.id}>`,
    replace_original: false,
    response_type: 'ephemeral',
  })
}

async function handleAcceptTask(
  data: { taskId: string },
  payload: SlackInteractionPayload
): Promise<void> {
  // Find the user by their Slack ID
  const preferences = await prisma.userNotificationPreferences.findFirst({
    where: { slackUserId: payload.user.id },
    include: { user: true },
  })

  if (!preferences) {
    await sendResponseMessage(payload.response_url, {
      text: `Could not find your NexFlow account. Please ensure your Slack is connected.`,
      replace_original: false,
      response_type: 'ephemeral',
    })
    return
  }

  // Update the task status to in progress
  await prisma.task.update({
    where: { id: data.taskId },
    data: {
      status: TaskStatus.IN_PROGRESS,
    },
  })

  await sendResponseMessage(payload.response_url, {
    text: `Task accepted and moved to In Progress by <@${payload.user.id}>`,
    replace_original: false,
    response_type: 'ephemeral',
  })
}

async function sendResponseMessage(
  responseUrl: string,
  message: {
    text: string
    replace_original?: boolean
    response_type?: 'in_channel' | 'ephemeral'
  }
): Promise<void> {
  try {
    await fetch(responseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })
  } catch (error) {
    console.error('Error sending Slack response message:', error)
  }
}
