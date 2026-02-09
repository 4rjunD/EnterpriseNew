import { WebClient } from '@slack/web-api'
import { prisma, IntegrationStatus, tokenEncryption } from '@nexflow/database'

interface SlackOAuthResponse {
  ok: boolean
  access_token: string
  token_type: string
  scope: string
  bot_user_id: string
  app_id: string
  team: {
    name: string
    id: string
  }
  authed_user: {
    id: string
  }
}

interface SlackMessageOptions {
  channel: string
  text: string
  blocks?: unknown[]
  threadTs?: string
}

interface SlackInteractiveMessage extends SlackMessageOptions {
  attachments?: {
    fallback: string
    callback_id: string
    actions: SlackAction[]
  }[]
}

interface SlackAction {
  name: string
  text: string
  type: 'button'
  value: string
  style?: 'default' | 'primary' | 'danger'
}

export class SlackClient {
  private organizationId: string
  private client: WebClient | null = null
  private botToken: string | null = null

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  /**
   * Initialize the Slack client with stored credentials
   */
  private async init(): Promise<boolean> {
    if (this.client) return true

    const integration = await prisma.integration.findUnique({
      where: {
        organizationId_type: {
          organizationId: this.organizationId,
          type: 'SLACK',
        },
      },
    })

    if (!integration?.accessToken || integration.status !== 'CONNECTED') {
      return false
    }

    // Decrypt token if encryption is enabled
    const { accessToken } = tokenEncryption.decryptIntegrationTokens({
      accessToken: integration.accessToken,
    })

    this.botToken = accessToken || null
    if (this.botToken) {
      this.client = new WebClient(this.botToken)
    }

    return Boolean(this.client)
  }

  /**
   * Check if Slack is connected for this organization
   */
  async isConnected(): Promise<boolean> {
    return this.init()
  }

  /**
   * Get OAuth URL for Slack app installation
   */
  static getOAuthUrl(state: string): string {
    const clientId = process.env.SLACK_CLIENT_ID
    const redirectUri = process.env.SLACK_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/integrations/slack/callback`

    const scopes = [
      'channels:read',
      'chat:write',
      'im:write',
      'im:read',
      'users:read',
      'users:read.email',
      'team:read',
    ].join(',')

    return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
  }

  /**
   * Exchange OAuth code for access token
   */
  static async handleOAuthCallback(
    code: string,
    organizationId: string
  ): Promise<{ success: boolean; teamName?: string; error?: string }> {
    const clientId = process.env.SLACK_CLIENT_ID
    const clientSecret = process.env.SLACK_CLIENT_SECRET
    const redirectUri = process.env.SLACK_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/integrations/slack/callback`

    if (!clientId || !clientSecret) {
      return { success: false, error: 'Slack credentials not configured' }
    }

    try {
      const client = new WebClient()
      const result = await client.oauth.v2.access({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }) as SlackOAuthResponse

      if (!result.ok || !result.access_token) {
        return { success: false, error: 'OAuth exchange failed' }
      }

      // Encrypt token before storing
      const { accessToken: encryptedToken } = tokenEncryption.encryptIntegrationTokens({
        accessToken: result.access_token,
      })

      // Store the integration
      await prisma.integration.upsert({
        where: {
          organizationId_type: {
            organizationId,
            type: 'SLACK',
          },
        },
        create: {
          organizationId,
          type: 'SLACK',
          status: 'CONNECTED',
          accessToken: encryptedToken,
          metadata: {
            teamId: result.team.id,
            teamName: result.team.name,
            botUserId: result.bot_user_id,
            appId: result.app_id,
            authedUserId: result.authed_user.id,
            scope: result.scope,
          },
        },
        update: {
          status: 'CONNECTED',
          accessToken: encryptedToken,
          metadata: {
            teamId: result.team.id,
            teamName: result.team.name,
            botUserId: result.bot_user_id,
            appId: result.app_id,
            authedUserId: result.authed_user.id,
            scope: result.scope,
          },
          syncError: null,
        },
      })

      return { success: true, teamName: result.team.name }
    } catch (error) {
      console.error('Slack OAuth error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(options: SlackMessageOptions): Promise<{ ts?: string; error?: string }> {
    if (!(await this.init()) || !this.client) {
      return { error: 'Slack not connected' }
    }

    try {
      const result = await this.client.chat.postMessage({
        channel: options.channel,
        text: options.text,
        blocks: options.blocks as any,
        thread_ts: options.threadTs,
      })

      return { ts: result.ts }
    } catch (error) {
      console.error('Slack sendMessage error:', error)
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Send a direct message to a user
   */
  async sendDirectMessage(
    userId: string,
    text: string,
    blocks?: unknown[]
  ): Promise<{ ts?: string; error?: string }> {
    if (!(await this.init()) || !this.client) {
      return { error: 'Slack not connected' }
    }

    try {
      // Open a DM channel with the user
      const dmResult = await this.client.conversations.open({
        users: userId,
      })

      if (!dmResult.ok || !dmResult.channel?.id) {
        return { error: 'Failed to open DM channel' }
      }

      // Send the message
      return this.sendMessage({
        channel: dmResult.channel.id,
        text,
        blocks,
      })
    } catch (error) {
      console.error('Slack sendDirectMessage error:', error)
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Send an interactive message with action buttons
   */
  async sendInteractiveMessage(options: SlackInteractiveMessage): Promise<{ ts?: string; error?: string }> {
    if (!(await this.init()) || !this.client) {
      return { error: 'Slack not connected' }
    }

    try {
      const result = await this.client.chat.postMessage({
        channel: options.channel,
        text: options.text,
        blocks: options.blocks as any,
        attachments: options.attachments as any,
      })

      return { ts: result.ts }
    } catch (error) {
      console.error('Slack sendInteractiveMessage error:', error)
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Send a nudge message with action buttons
   */
  async sendNudgeMessage(options: {
    userId: string
    type: 'task' | 'pr'
    title: string
    itemId: string
    url: string
    callbackId: string
  }): Promise<{ ts?: string; error?: string }> {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: options.type === 'task' ? 'Task Needs Attention' : 'PR Needs Review',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: options.type === 'task'
            ? `Your task *${options.title}* has been in progress for a while. Please update its status or let us know if you're blocked.`
            : `Your PR *${options.title}* has been waiting for review. Please follow up or request additional reviewers.`,
        },
      },
      {
        type: 'actions',
        block_id: options.callbackId,
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Details',
              emoji: true,
            },
            url: options.url,
            action_id: 'view_details',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Mark as Resolved',
              emoji: true,
            },
            style: 'primary',
            action_id: 'mark_resolved',
            value: JSON.stringify({ itemId: options.itemId, type: options.type }),
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Snooze',
              emoji: true,
            },
            action_id: 'snooze',
            value: JSON.stringify({ itemId: options.itemId, type: options.type }),
          },
        ],
      },
    ]

    return this.sendDirectMessage(options.userId, `${options.type === 'task' ? 'Task' : 'PR'} needs attention: ${options.title}`, blocks)
  }

  /**
   * Send a task reassignment message
   */
  async sendReassignmentMessage(options: {
    userId: string
    taskTitle: string
    taskId: string
    url: string
    fromUserName?: string
    callbackId: string
  }): Promise<{ ts?: string; error?: string }> {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Task Assigned to You',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: options.fromUserName
            ? `A task has been reassigned to you from *${options.fromUserName}*:\n*${options.taskTitle}*`
            : `A new task has been assigned to you:\n*${options.taskTitle}*`,
        },
      },
      {
        type: 'actions',
        block_id: options.callbackId,
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Task',
              emoji: true,
            },
            url: options.url,
            action_id: 'view_task',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Accept',
              emoji: true,
            },
            style: 'primary',
            action_id: 'accept_task',
            value: JSON.stringify({ taskId: options.taskId }),
          },
        ],
      },
    ]

    return this.sendDirectMessage(options.userId, `Task assigned: ${options.taskTitle}`, blocks)
  }

  /**
   * Look up Slack user by email
   */
  async lookupUserByEmail(email: string): Promise<{ userId?: string; error?: string }> {
    if (!(await this.init()) || !this.client) {
      return { error: 'Slack not connected' }
    }

    try {
      const result = await this.client.users.lookupByEmail({ email })
      return { userId: result.user?.id }
    } catch (error) {
      // User not found is expected sometimes
      if ((error as { data?: { error?: string } })?.data?.error === 'users_not_found') {
        return { error: 'User not found' }
      }
      console.error('Slack lookupUserByEmail error:', error)
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Get team info
   */
  async getTeamInfo(): Promise<{ team?: { id: string; name: string }; error?: string }> {
    if (!(await this.init()) || !this.client) {
      return { error: 'Slack not connected' }
    }

    try {
      const result = await this.client.team.info()
      if (result.team) {
        return {
          team: {
            id: result.team.id!,
            name: result.team.name!,
          },
        }
      }
      return { error: 'No team info returned' }
    } catch (error) {
      console.error('Slack getTeamInfo error:', error)
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Disconnect Slack integration
   */
  async disconnect(): Promise<void> {
    await prisma.integration.update({
      where: {
        organizationId_type: {
          organizationId: this.organizationId,
          type: 'SLACK',
        },
      },
      data: {
        status: 'DISCONNECTED',
        accessToken: null,
        metadata: undefined,
      },
    })

    this.client = null
    this.botToken = null
  }

  /**
   * Sync users from Slack (map Slack users to NexFlow users by email)
   */
  async sync(): Promise<{ success: boolean; itemsSynced: number }> {
    if (!(await this.init()) || !this.client) {
      return { success: false, itemsSynced: 0 }
    }

    try {
      // Get all Slack users
      const result = await this.client.users.list()
      const slackUsers = result.members?.filter(
        (m) => !m.is_bot && !m.deleted && m.profile?.email
      ) || []

      let synced = 0

      for (const slackUser of slackUsers) {
        const email = slackUser.profile?.email
        if (!email) continue

        // Try to find matching NexFlow user
        const user = await prisma.user.findFirst({
          where: {
            email,
            organizationId: this.organizationId,
          },
        })

        if (user) {
          // Create or update notification preferences with Slack user ID
          await prisma.userNotificationPreferences.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              slackUserId: slackUser.id,
            },
            update: {
              slackUserId: slackUser.id,
            },
          })
          synced++
        }
      }

      // Update last sync time
      await prisma.integration.update({
        where: {
          organizationId_type: {
            organizationId: this.organizationId,
            type: 'SLACK',
          },
        },
        data: {
          lastSyncAt: new Date(),
        },
      })

      return { success: true, itemsSynced: synced }
    } catch (error) {
      console.error('Slack sync error:', error)

      await prisma.integration.update({
        where: {
          organizationId_type: {
            organizationId: this.organizationId,
            type: 'SLACK',
          },
        },
        data: {
          syncError: error instanceof Error ? error.message : 'Unknown error',
        },
      })

      return { success: false, itemsSynced: 0 }
    }
  }

  /**
   * Verify Slack request signature
   */
  static verifyRequestSignature(
    signature: string,
    timestamp: string,
    body: string
  ): boolean {
    const signingSecret = process.env.SLACK_SIGNING_SECRET
    if (!signingSecret) {
      console.warn('SLACK_SIGNING_SECRET not configured')
      return false
    }

    const crypto = require('crypto')

    // Check timestamp to prevent replay attacks
    const time = Math.floor(Date.now() / 1000)
    if (Math.abs(time - parseInt(timestamp)) > 300) {
      return false
    }

    const sigBasestring = `v0:${timestamp}:${body}`
    const mySignature = 'v0=' + crypto
      .createHmac('sha256', signingSecret)
      .update(sigBasestring, 'utf8')
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(mySignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    )
  }
}
