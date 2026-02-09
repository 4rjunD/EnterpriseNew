import { prisma, NotificationType } from '@nexflow/database'
import { getTwilioClient } from '../twilio'
import { SlackClient } from '../slack'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical'
type PriorityLevel = NotificationPriority

export type NotificationChannel = 'in_app' | 'slack' | 'sms' | 'email'

export interface NotificationPayload {
  userId: string
  organizationId: string
  type: NotificationType
  title: string
  message: string
  priority?: NotificationPriority
  data?: Record<string, unknown>
  url?: string
  channels?: NotificationChannel[]
}

export interface SendResult {
  channel: NotificationChannel
  success: boolean
  error?: string
  messageId?: string
}

interface UserPreferences {
  emailEnabled: boolean
  slackEnabled: boolean
  smsEnabled: boolean
  inAppEnabled: boolean
  phoneNumber: string | null
  phoneVerified: boolean
  slackUserId: string | null
  nudgeViaSms: boolean
  reassignmentViaSms: boolean
  criticalOnlyViaSms: boolean
  quietHours: { start: string; end: string; timezone: string } | null
}

/**
 * Check if current time is within quiet hours
 */
function isQuietHours(quietHours: UserPreferences['quietHours'], timezone?: string): boolean {
  if (!quietHours) return false

  const userTimezone = timezone || quietHours.timezone || 'UTC'

  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const currentTime = formatter.format(now)

    const [startHour, startMin] = quietHours.start.split(':').map(Number)
    const [endHour, endMin] = quietHours.end.split(':').map(Number)
    const [currentHour, currentMin] = currentTime.split(':').map(Number)

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    const currentMinutes = currentHour * 60 + currentMin

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  } catch {
    return false
  }
}

/**
 * Get user notification preferences with defaults
 */
async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const prefs = await prisma.userNotificationPreferences.findUnique({
    where: { userId },
  })

  if (!prefs) {
    // Return defaults
    return {
      emailEnabled: true,
      slackEnabled: true,
      smsEnabled: false,
      inAppEnabled: true,
      phoneNumber: null,
      phoneVerified: false,
      slackUserId: null,
      nudgeViaSms: true,
      reassignmentViaSms: true,
      criticalOnlyViaSms: false,
      quietHours: null,
    }
  }

  return {
    emailEnabled: prefs.emailEnabled,
    slackEnabled: prefs.slackEnabled,
    smsEnabled: prefs.smsEnabled,
    inAppEnabled: prefs.inAppEnabled,
    phoneNumber: prefs.phoneNumber,
    phoneVerified: prefs.phoneVerified,
    slackUserId: prefs.slackUserId,
    nudgeViaSms: prefs.nudgeViaSms,
    reassignmentViaSms: prefs.reassignmentViaSms,
    criticalOnlyViaSms: prefs.criticalOnlyViaSms,
    quietHours: prefs.quietHours as UserPreferences['quietHours'],
  }
}

/**
 * Get user timezone
 */
async function getUserTimezone(userId: string): Promise<string | undefined> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  })
  return user?.timezone || undefined
}

/**
 * Check if SMS should be sent for this notification type
 */
function shouldSendSms(
  prefs: UserPreferences,
  notificationType: NotificationType,
  priority: NotificationPriority
): boolean {
  if (!prefs.smsEnabled || !prefs.phoneNumber || !prefs.phoneVerified) {
    return false
  }

  // Critical notifications always go through SMS if enabled
  if ((priority as string) === 'critical') {
    return true
  }

  // Check criticalOnlyViaSms preference
  if (prefs.criticalOnlyViaSms && (priority as string) !== 'critical') {
    return false
  }

  // Check notification type preferences
  const nudgeTypes: NotificationType[] = ['BOTTLENECK_DETECTED', 'PR_REVIEW_REQUESTED', 'DEADLINE_APPROACHING']
  const reassignmentTypes: NotificationType[] = ['TASK_ASSIGNED']

  if (nudgeTypes.includes(notificationType) && prefs.nudgeViaSms) {
    return true
  }

  if (reassignmentTypes.includes(notificationType) && prefs.reassignmentViaSms) {
    return true
  }

  return false
}

/**
 * Send in-app notification
 */
async function sendInApp(payload: NotificationPayload): Promise<SendResult> {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: (payload.data ?? {}) as any,
      },
    })

    return {
      channel: 'in_app',
      success: true,
      messageId: notification.id,
    }
  } catch (error) {
    return {
      channel: 'in_app',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send SMS notification
 */
async function sendSms(
  payload: NotificationPayload,
  phoneNumber: string
): Promise<SendResult> {
  try {
    const twilioClient = getTwilioClient()

    if (!twilioClient.isConfigured) {
      return {
        channel: 'sms',
        success: false,
        error: 'Twilio not configured',
      }
    }

    // Determine SMS type based on notification type
    if (payload.type === 'TASK_ASSIGNED') {
      const result = await twilioClient.sendReassignment(
        phoneNumber,
        payload.title,
        payload.url || '',
        payload.data?.fromUserName as string | undefined
      )
      return {
        channel: 'sms',
        success: true,
        messageId: result.sid,
      }
    }

    if (payload.type === 'BOTTLENECK_DETECTED' || payload.type === 'PR_REVIEW_REQUESTED') {
      const isTask = payload.data?.taskId !== undefined
      const result = await twilioClient.sendNudge(
        phoneNumber,
        isTask ? 'task' : 'pr',
        payload.title,
        payload.url || ''
      )
      return {
        channel: 'sms',
        success: true,
        messageId: result.sid,
      }
    }

    if (payload.priority === 'critical') {
      const result = await twilioClient.sendCriticalAlert(
        phoneNumber,
        payload.title,
        payload.message,
        payload.url
      )
      return {
        channel: 'sms',
        success: true,
        messageId: result.sid,
      }
    }

    // Generic SMS for other types
    const result = await twilioClient.sendSMS(
      phoneNumber,
      `[NexFlow] ${payload.title}: ${payload.message}`
    )
    return {
      channel: 'sms',
      success: true,
      messageId: result.sid,
    }
  } catch (error) {
    return {
      channel: 'sms',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send Slack notification
 */
async function sendSlack(
  payload: NotificationPayload,
  slackUserId: string
): Promise<SendResult> {
  try {
    const slackClient = new SlackClient(payload.organizationId)

    if (!(await slackClient.isConnected())) {
      return {
        channel: 'slack',
        success: false,
        error: 'Slack not connected for organization',
      }
    }

    // Build Slack message blocks
    const blocks = buildSlackBlocks(payload)

    await slackClient.sendDirectMessage(slackUserId, payload.title, blocks)

    return {
      channel: 'slack',
      success: true,
    }
  } catch (error) {
    return {
      channel: 'slack',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Build Slack blocks for notification
 */
function buildSlackBlocks(payload: NotificationPayload): unknown[] {
  const blocks: unknown[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: payload.title,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: payload.message,
      },
    },
  ]

  // Add action buttons if URL is provided
  if (payload.url) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Details',
            emoji: true,
          },
          url: payload.url,
          action_id: 'view_details',
        },
      ],
    })
  }

  // Add context with notification type
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `*Type:* ${payload.type.replace(/_/g, ' ').toLowerCase()} | *Priority:* ${payload.priority || 'medium'}`,
      },
    ],
  })

  return blocks
}

/**
 * Unified notification service
 */
export class NotificationService {
  /**
   * Send a notification to a user via their preferred channels
   */
  async send(payload: NotificationPayload): Promise<SendResult[]> {
    const results: SendResult[] = []

    // Get user preferences
    const prefs = await getUserPreferences(payload.userId)
    const timezone = await getUserTimezone(payload.userId)
    const priority = payload.priority || 'medium'

    // Check quiet hours (skip for critical notifications)
    const inQuietHours = isQuietHours(prefs.quietHours, timezone)
    const skipNonCritical = inQuietHours && priority !== 'critical'

    // Determine which channels to use
    const requestedChannels = payload.channels || ['in_app', 'slack', 'sms']

    // In-app notifications (always allowed, not affected by quiet hours)
    if (requestedChannels.includes('in_app') && prefs.inAppEnabled) {
      results.push(await sendInApp(payload))
    }

    // Skip other channels during quiet hours for non-critical notifications
    if (skipNonCritical) {
      return results
    }

    // Slack notifications
    if (
      requestedChannels.includes('slack') &&
      prefs.slackEnabled &&
      prefs.slackUserId
    ) {
      results.push(await sendSlack(payload, prefs.slackUserId))
    }

    // SMS notifications
    if (
      requestedChannels.includes('sms') &&
      prefs.phoneNumber &&
      shouldSendSms(prefs, payload.type, priority)
    ) {
      results.push(await sendSms(payload, prefs.phoneNumber))
    }

    return results
  }

  /**
   * Send a nudge notification
   */
  async sendNudge(options: {
    userId: string
    organizationId: string
    type: 'task' | 'pr'
    title: string
    itemId: string
    url: string
    reminderCount: number
  }): Promise<SendResult[]> {
    return this.send({
      userId: options.userId,
      organizationId: options.organizationId,
      type: options.type === 'task' ? 'BOTTLENECK_DETECTED' : 'PR_REVIEW_REQUESTED',
      title: options.type === 'task' ? 'Task needs attention' : 'Pull request needs attention',
      message:
        options.type === 'task'
          ? `Your task "${options.title}" has been in progress for a while. Please update its status or let us know if you're blocked.`
          : `Your PR "${options.title}" has been waiting for review. Please follow up or request additional reviewers.`,
      priority: options.reminderCount >= 3 ? 'high' : 'medium',
      data: {
        [options.type === 'task' ? 'taskId' : 'prId']: options.itemId,
        reminderCount: options.reminderCount,
      },
      url: options.url,
    })
  }

  /**
   * Send a task reassignment notification
   */
  async sendReassignment(options: {
    userId: string
    organizationId: string
    taskId: string
    taskTitle: string
    url: string
    fromUserId?: string
    fromUserName?: string
  }): Promise<SendResult[]> {
    return this.send({
      userId: options.userId,
      organizationId: options.organizationId,
      type: 'TASK_ASSIGNED',
      title: options.taskTitle,
      message: options.fromUserName
        ? `A task has been reassigned to you from ${options.fromUserName} by NexFlow Agent`
        : `A task has been assigned to you by NexFlow Agent`,
      priority: 'medium',
      data: {
        taskId: options.taskId,
        fromUserId: options.fromUserId,
        fromUserName: options.fromUserName,
      },
      url: options.url,
    })
  }

  /**
   * Send a critical alert
   */
  async sendCriticalAlert(options: {
    userId: string
    organizationId: string
    title: string
    message: string
    url?: string
    data?: Record<string, unknown>
  }): Promise<SendResult[]> {
    return this.send({
      userId: options.userId,
      organizationId: options.organizationId,
      type: 'PREDICTION_ALERT',
      title: options.title,
      message: options.message,
      priority: 'critical',
      data: options.data,
      url: options.url,
    })
  }
}

// Export singleton instance
export const notificationService = new NotificationService()
