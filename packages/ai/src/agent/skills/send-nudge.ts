// Send Nudge Skill - Send reminder via Slack/email
// ============================================================================

import { prisma, NotificationType } from '@nexflow/database'
import type { Skill, SkillResult } from './types'
import type { AgentContext } from '../types'

export const sendNudgeSkill: Skill = {
  name: 'send_nudge',
  description: 'Send a friendly reminder/nudge to a team member via Slack, email, or in-app notification. Requires approval before sending.',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'ID of the user to nudge',
      },
      message: {
        type: 'string',
        description: 'The nudge message to send',
      },
      taskId: {
        type: 'string',
        description: 'Optional task ID this nudge relates to',
      },
      channel: {
        type: 'string',
        description: 'Channel to send nudge through',
        enum: ['slack', 'email', 'in_app', 'auto'],
      },
      urgency: {
        type: 'string',
        description: 'Urgency level of the nudge',
        enum: ['low', 'normal', 'high'],
      },
    },
    required: ['userId', 'message'],
  },
  requiresApproval: true,

  async execute(params: Record<string, unknown>, context: AgentContext): Promise<SkillResult> {
    const { userId, message, taskId, channel = 'auto', urgency = 'normal' } = params as {
      userId: string
      message: string
      taskId?: string
      channel?: 'slack' | 'email' | 'in_app' | 'auto'
      urgency?: 'low' | 'normal' | 'high'
    }

    try {
      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          notificationPreferences: true,
        },
      })

      if (!user) {
        return { success: false, error: `User not found: ${userId}` }
      }

      // Check if user is in the same organization
      if (user.organizationId !== context.organizationId) {
        return { success: false, error: 'Cannot nudge users from other organizations' }
      }

      // Check quiet hours
      const prefs = user.notificationPreferences
      if (prefs?.quietHours) {
        const quietHours = prefs.quietHours as { start: string; end: string; timezone?: string }
        const isQuietTime = checkQuietHours(quietHours)
        if (isQuietTime && urgency !== 'high') {
          return {
            success: false,
            error: `User is in quiet hours (${quietHours.start} - ${quietHours.end}). Set urgency to 'high' to override.`,
          }
        }
      }

      // Determine channel
      let selectedChannel = channel
      if (channel === 'auto') {
        if (prefs?.slackEnabled && prefs.slackUserId) {
          selectedChannel = 'slack'
        } else if (prefs?.inAppEnabled) {
          selectedChannel = 'in_app'
        } else if (prefs?.emailEnabled) {
          selectedChannel = 'email'
        } else {
          selectedChannel = 'in_app'
        }
      }

      // Get task details if provided
      let taskTitle: string | undefined
      if (taskId) {
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          select: { title: true },
        })
        taskTitle = task?.title
      }

      // Send notification based on channel
      const result = await sendNotification({
        userId,
        userName: user.name ?? user.email,
        message,
        channel: selectedChannel as 'slack' | 'email' | 'in_app',
        urgency,
        taskId,
        taskTitle,
        slackUserId: prefs?.slackUserId ?? undefined,
        email: user.email,
      })

      // Create in-app notification record
      await prisma.notification.create({
        data: {
          userId,
          type: NotificationType.AGENT_SUGGESTION,
          title: urgency === 'high' ? '🔔 Urgent Reminder' : '💡 Friendly Reminder',
          message,
          data: {
            taskId,
            taskTitle,
            channel: selectedChannel,
            sentBy: 'NexFlow AI',
            sentAt: new Date().toISOString(),
          },
        },
      })

      return {
        success: true,
        data: {
          recipientName: user.name ?? user.email,
          channel: selectedChannel,
          message,
          taskTitle,
          timestamp: new Date().toISOString(),
        },
        message: `Nudge sent to ${user.name ?? user.email} via ${selectedChannel}`,
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
}

function checkQuietHours(quietHours: { start: string; end: string; timezone?: string }): boolean {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute

  const [startHour, startMinute] = quietHours.start.split(':').map(Number)
  const [endHour, endMinute] = quietHours.end.split(':').map(Number)
  const startTime = startHour * 60 + startMinute
  const endTime = endHour * 60 + endMinute

  if (startTime < endTime) {
    // Normal range (e.g., 09:00 - 17:00)
    return currentTime >= startTime && currentTime < endTime
  } else {
    // Overnight range (e.g., 22:00 - 08:00)
    return currentTime >= startTime || currentTime < endTime
  }
}

interface NotificationParams {
  userId: string
  userName: string
  message: string
  channel: 'slack' | 'email' | 'in_app'
  urgency: string
  taskId?: string
  taskTitle?: string
  slackUserId?: string
  email: string
}

async function sendNotification(params: NotificationParams): Promise<{ sent: boolean; method: string }> {
  const { channel, userName, message, slackUserId, email, taskTitle, urgency } = params

  switch (channel) {
    case 'slack':
      if (slackUserId) {
        // In a real implementation, this would call the Slack API
        // For now, we'll log and return success
        console.log(`[Slack Nudge] To: ${slackUserId} (${userName})`)
        console.log(`[Slack Nudge] Message: ${message}`)
        if (taskTitle) {
          console.log(`[Slack Nudge] Related to: ${taskTitle}`)
        }

        // TODO: Integrate with Slack client
        // await slackClient.chat.postMessage({
        //   channel: slackUserId,
        //   text: message,
        //   blocks: [...]
        // })

        return { sent: true, method: 'slack' }
      }
      // Fall through to in_app if no Slack ID
      return sendNotification({ ...params, channel: 'in_app' })

    case 'email':
      // In a real implementation, this would send an email
      console.log(`[Email Nudge] To: ${email}`)
      console.log(`[Email Nudge] Subject: ${urgency === 'high' ? 'Urgent: ' : ''}Reminder from NexFlow`)
      console.log(`[Email Nudge] Body: ${message}`)

      // TODO: Integrate with email service
      // await emailService.send({
      //   to: email,
      //   subject: `Reminder from NexFlow`,
      //   body: message
      // })

      return { sent: true, method: 'email' }

    case 'in_app':
    default:
      // In-app notification is created in the main execute function
      console.log(`[In-App Nudge] To: ${userName}`)
      console.log(`[In-App Nudge] Message: ${message}`)
      return { sent: true, method: 'in_app' }
  }
}
