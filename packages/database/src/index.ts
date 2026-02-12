export { prisma, PrismaClient } from './client'
export { encrypt, decrypt, isEncrypted, TokenEncryption, tokenEncryption } from './encryption'

// Re-export Prisma types
export type {
  Organization,
  User,
  Team,
  TeamMember,
  Project,
  Task,
  PullRequest,
  Integration,
  Prediction,
  Bottleneck,
  AgentConfig,
  AgentAction,
  BehavioralMetric,
  Notification,
  Invitation,
} from '@prisma/client'

export {
  UserRole,
  UserStatus,
  TeamRole,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  TaskSource,
  PRStatus,
  CIStatus,
  IntegrationType,
  IntegrationStatus,
  PredictionType,
  BottleneckType,
  BottleneckSeverity,
  BottleneckStatus,
  AgentType,
  AgentActionStatus,
  MetricSource,
  NotificationType,
  InvitationStatus,
  SyncStatus,
  FocusTimeType,
  FocusTimeStatus,
  MemoryType,
  ConversationChannel,
} from '@prisma/client'

// Re-export new AI Agent types
export type {
  AgentMemory,
  AgentConversation,
  AgentMessage,
  HeartbeatConfig,
} from '@prisma/client'
