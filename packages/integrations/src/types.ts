import { IntegrationType, TaskStatus, TaskPriority, TaskSource } from '@nexflow/database'

export interface IntegrationClient {
  type: IntegrationType
  isConnected(): Promise<boolean>
  sync(): Promise<SyncResult>
  disconnect(): Promise<void>
}

export interface SyncResult {
  success: boolean
  itemsSynced: number
  errors?: string[]
}

export interface UnifiedTask {
  externalId: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assigneeEmail?: string
  labels: string[]
  dueDate?: Date
  storyPoints?: number
  externalUrl: string
  source: TaskSource
  projectExternalId?: string
}

export interface UnifiedPullRequest {
  externalId: string
  number: number
  title: string
  description?: string
  status: 'OPEN' | 'MERGED' | 'CLOSED'
  url: string
  isDraft: boolean
  additions: number
  deletions: number
  authorEmail?: string
  repository: string
  baseBranch: string
  headBranch: string
  createdAt: Date
  mergedAt?: Date
  closedAt?: Date
}

export interface WebhookPayload {
  type: string
  action: string
  data: Record<string, unknown>
  timestamp: Date
}

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
}
