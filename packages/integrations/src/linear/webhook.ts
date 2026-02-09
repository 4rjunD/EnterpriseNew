import { prisma, IntegrationType, TaskStatus, TaskPriority, TaskSource } from '@nexflow/database'
import crypto from 'crypto'

interface LinearWebhookPayload {
  action: 'create' | 'update' | 'remove'
  type: 'Issue' | 'Comment' | 'Project'
  data: {
    id: string
    title?: string
    description?: string
    priority?: number
    state?: { name: string }
    assignee?: { email: string }
    labels?: Array<{ name: string }>
    dueDate?: string
    estimate?: number
    url?: string
  }
  organizationId?: string
}

export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const expectedSignature = hmac.digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

export async function handleLinearWebhook(
  payload: LinearWebhookPayload,
  organizationId: string
): Promise<void> {
  switch (payload.type) {
    case 'Issue':
      await handleIssueWebhook(payload, organizationId)
      break
    case 'Comment':
      // Handle comment webhooks if needed
      break
    case 'Project':
      // Handle project webhooks if needed
      break
  }
}

async function handleIssueWebhook(
  payload: LinearWebhookPayload,
  organizationId: string
): Promise<void> {
  const { action, data } = payload

  switch (action) {
    case 'create':
    case 'update':
      await upsertTaskFromWebhook(data, organizationId)
      break
    case 'remove':
      await prisma.task.deleteMany({
        where: {
          source: TaskSource.LINEAR,
          externalId: data.id,
        },
      })
      break
  }
}

async function upsertTaskFromWebhook(
  data: LinearWebhookPayload['data'],
  organizationId: string
): Promise<void> {
  // Find assignee by email
  let assigneeId: string | undefined
  if (data.assignee?.email) {
    const user = await prisma.user.findFirst({
      where: {
        email: data.assignee.email,
        organizationId,
      },
    })
    assigneeId = user?.id
  }

  const status = mapStatus(data.state?.name || '')
  const priority = mapPriority(data.priority || 0)

  await prisma.task.upsert({
    where: {
      source_externalId: {
        source: TaskSource.LINEAR,
        externalId: data.id,
      },
    },
    create: {
      source: TaskSource.LINEAR,
      externalId: data.id,
      title: data.title || 'Untitled',
      description: data.description,
      status,
      priority,
      assigneeId,
      labels: data.labels?.map((l) => l.name) || [],
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      storyPoints: data.estimate,
      externalUrl: data.url,
      lastSyncedAt: new Date(),
    },
    update: {
      title: data.title || 'Untitled',
      description: data.description,
      status,
      priority,
      assigneeId,
      labels: data.labels?.map((l) => l.name) || [],
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      storyPoints: data.estimate,
      lastSyncedAt: new Date(),
    },
  })
}

function mapStatus(linearStatus: string): TaskStatus {
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

function mapPriority(linearPriority: number): TaskPriority {
  const priorityMap: Record<number, TaskPriority> = {
    0: TaskPriority.MEDIUM,
    1: TaskPriority.URGENT,
    2: TaskPriority.HIGH,
    3: TaskPriority.MEDIUM,
    4: TaskPriority.LOW,
  }
  return priorityMap[linearPriority] || TaskPriority.MEDIUM
}
