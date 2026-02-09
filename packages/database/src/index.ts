export { prisma, PrismaClient } from './client'

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
} from '@prisma/client'
