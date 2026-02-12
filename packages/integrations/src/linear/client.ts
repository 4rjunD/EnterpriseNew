import { LinearClient as SDK } from '@linear/sdk'
import { prisma, IntegrationType, TaskStatus, TaskPriority, TaskSource } from '@nexflow/database'
import type { IntegrationClient, SyncResult, UnifiedTask, OAuthTokens } from '../types'

export class LinearClient implements IntegrationClient {
  type = IntegrationType.LINEAR
  private sdk: SDK | null = null
  private organizationId: string

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  private async getClient(): Promise<SDK> {
    if (this.sdk) return this.sdk

    const integration = await prisma.integration.findUnique({
      where: {
        organizationId_type: {
          organizationId: this.organizationId,
          type: IntegrationType.LINEAR,
        },
      },
    })

    if (!integration?.accessToken) {
      throw new Error('Linear integration not connected')
    }

    this.sdk = new SDK({ apiKey: integration.accessToken })
    return this.sdk
  }

  async isConnected(): Promise<boolean> {
    try {
      const client = await this.getClient()
      await client.viewer
      return true
    } catch {
      return false
    }
  }

  async sync(): Promise<SyncResult> {
    const client = await this.getClient()
    let itemsSynced = 0
    const errors: string[] = []

    try {
      // Fetch issues from Linear
      const issues = await client.issues({
        first: 100,
        filter: { state: { type: { nin: ['canceled', 'completed'] } } },
      })

      for (const issue of issues.nodes) {
        try {
          const unifiedTask = await this.mapToUnifiedTask(issue as any)
          await this.upsertTask(unifiedTask)
          itemsSynced++
        } catch (e) {
          errors.push(`Failed to sync issue ${issue.id}: ${e}`)
        }
      }

      // Update sync timestamp
      await prisma.integration.update({
        where: {
          organizationId_type: {
            organizationId: this.organizationId,
            type: IntegrationType.LINEAR,
          },
        },
        data: {
          lastSyncAt: new Date(),
          syncError: null,
          status: 'CONNECTED',
        },
      })

      return { success: true, itemsSynced, errors: errors.length > 0 ? errors : undefined }
    } catch (e) {
      await prisma.integration.update({
        where: {
          organizationId_type: {
            organizationId: this.organizationId,
            type: IntegrationType.LINEAR,
          },
        },
        data: {
          syncError: String(e),
          status: 'ERROR',
        },
      })
      throw e
    }
  }

  async disconnect(): Promise<void> {
    await prisma.integration.update({
      where: {
        organizationId_type: {
          organizationId: this.organizationId,
          type: IntegrationType.LINEAR,
        },
      },
      data: {
        accessToken: null,
        refreshToken: null,
        webhookId: null,
        status: 'DISCONNECTED',
      },
    })
    this.sdk = null
  }

  // OAuth callback handler
  static async handleOAuthCallback(
    code: string,
    organizationId: string
  ): Promise<OAuthTokens> {
    const response = await fetch('https://api.linear.app/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.LINEAR_CLIENT_ID!,
        client_secret: process.env.LINEAR_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/integrations/linear/callback`,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to exchange OAuth code')
    }

    const data = await response.json()

    // Store tokens
    await prisma.integration.upsert({
      where: {
        organizationId_type: {
          organizationId,
          type: IntegrationType.LINEAR,
        },
      },
      create: {
        organizationId,
        type: IntegrationType.LINEAR,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenExpiry: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000)
          : null,
        status: 'CONNECTED',
      },
      update: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenExpiry: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000)
          : null,
        status: 'CONNECTED',
      },
    })

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    }
  }

  // Webhook registration
  async registerWebhook(): Promise<string> {
    const client = await this.getClient()

    const webhook = await client.createWebhook({
      url: `${process.env.NEXTAUTH_URL}/api/integrations/linear/webhook`,
      resourceTypes: ['Issue', 'Comment', 'Project'],
      label: 'NexFlow Enterprise',
    })

    if (!webhook.success) {
      throw new Error('Failed to register webhook')
    }

    const webhookData = await webhook.webhook

    await prisma.integration.update({
      where: {
        organizationId_type: {
          organizationId: this.organizationId,
          type: IntegrationType.LINEAR,
        },
      },
      data: {
        webhookId: webhookData?.id,
      },
    })

    return webhookData?.id || ''
  }

  // Map Linear issue to unified task
  private async mapToUnifiedTask(issue: {
    id: string
    title: string
    description?: string | null
    priority: number
    state: Promise<{ name: string } | undefined>
    assignee?: Promise<{ email: string } | undefined>
    labels: () => Promise<{ nodes: Array<{ name: string }> }>
    dueDate?: string | null
    estimate?: number | null
    url: string
    project?: Promise<{ id: string } | undefined>
  }): Promise<UnifiedTask> {
    const state = await issue.state
    const assignee = issue.assignee ? await issue.assignee : undefined
    const labels = await issue.labels()
    const project = issue.project ? await issue.project : undefined

    return {
      externalId: issue.id,
      title: issue.title,
      description: issue.description || undefined,
      status: this.mapStatus(state?.name || ''),
      priority: this.mapPriority(issue.priority),
      assigneeEmail: assignee?.email,
      labels: labels.nodes.map((l) => l.name),
      dueDate: issue.dueDate ? new Date(issue.dueDate) : undefined,
      storyPoints: issue.estimate || undefined,
      externalUrl: issue.url,
      source: TaskSource.LINEAR,
      projectExternalId: project?.id,
    }
  }

  private mapStatus(linearStatus: string): TaskStatus {
    const statusMap: Record<string, TaskStatus> = {
      backlog: TaskStatus.BACKLOG,
      unstarted: TaskStatus.TODO,
      started: TaskStatus.IN_PROGRESS,
      'in progress': TaskStatus.IN_PROGRESS,
      'in review': TaskStatus.IN_REVIEW,
      done: TaskStatus.DONE,
      completed: TaskStatus.DONE,
      cancelled: TaskStatus.CANCELLED,
      canceled: TaskStatus.CANCELLED,
    }
    return statusMap[linearStatus.toLowerCase()] || TaskStatus.BACKLOG
  }

  private mapPriority(linearPriority: number): TaskPriority {
    // Linear: 0 = no priority, 1 = urgent, 2 = high, 3 = medium, 4 = low
    const priorityMap: Record<number, TaskPriority> = {
      0: TaskPriority.MEDIUM,
      1: TaskPriority.URGENT,
      2: TaskPriority.HIGH,
      3: TaskPriority.MEDIUM,
      4: TaskPriority.LOW,
    }
    return priorityMap[linearPriority] || TaskPriority.MEDIUM
  }

  private async upsertTask(task: UnifiedTask): Promise<void> {
    // Find or create user by email
    let assigneeId: string | undefined
    if (task.assigneeEmail) {
      const user = await prisma.user.findFirst({
        where: {
          email: task.assigneeEmail,
          organizationId: this.organizationId,
        },
      })
      assigneeId = user?.id
    }

    await prisma.task.upsert({
      where: {
        source_externalId: {
          source: TaskSource.LINEAR,
          externalId: task.externalId,
        },
      },
      create: {
        source: TaskSource.LINEAR,
        externalId: task.externalId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeId,
        labels: task.labels,
        dueDate: task.dueDate,
        storyPoints: task.storyPoints,
        externalUrl: task.externalUrl,
        lastSyncedAt: new Date(),
        organizationId: this.organizationId, // Link to organization
      },
      update: {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeId,
        labels: task.labels,
        dueDate: task.dueDate,
        storyPoints: task.storyPoints,
        lastSyncedAt: new Date(),
        organizationId: this.organizationId, // Ensure org link on update too
      },
    })
  }

  // Create issue in Linear from unified task
  async createIssue(task: {
    title: string
    description?: string
    priority?: TaskPriority
    teamId: string
  }): Promise<string> {
    const client = await this.getClient()

    const priorityMap: Record<TaskPriority, number> = {
      [TaskPriority.URGENT]: 1,
      [TaskPriority.HIGH]: 2,
      [TaskPriority.MEDIUM]: 3,
      [TaskPriority.LOW]: 4,
    }

    const result = await client.createIssue({
      title: task.title,
      description: task.description,
      priority: task.priority ? priorityMap[task.priority] : 3,
      teamId: task.teamId,
    })

    if (!result.success) {
      throw new Error('Failed to create issue in Linear')
    }

    const issue = await result.issue
    return issue?.id || ''
  }

  // Update issue in Linear
  async updateIssue(
    externalId: string,
    updates: Partial<{
      title: string
      description: string
      priority: TaskPriority
      stateId: string
    }>
  ): Promise<void> {
    const client = await this.getClient()

    const priorityMap: Record<TaskPriority, number> = {
      [TaskPriority.URGENT]: 1,
      [TaskPriority.HIGH]: 2,
      [TaskPriority.MEDIUM]: 3,
      [TaskPriority.LOW]: 4,
    }

    await client.updateIssue(externalId, {
      title: updates.title,
      description: updates.description,
      priority: updates.priority ? priorityMap[updates.priority] : undefined,
      stateId: updates.stateId,
    })
  }
}
