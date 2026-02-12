// AI Agent Types
// ============================================================================

export type ConversationChannel = 'WEB' | 'SLACK' | 'DISCORD' | 'API'

export interface AgentContext {
  organizationId: string
  userId?: string
  channel: ConversationChannel
  conversationId?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCalls?: ToolCall[]
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: unknown
}

export interface AgentResponse {
  message: string
  toolCalls?: ToolCall[]
  pendingActions?: PendingAction[]
  conversationId: string
}

export interface PendingAction {
  id: string
  skill: string
  description: string
  params: Record<string, unknown>
  requiresApproval: boolean
}

export interface SkillResult {
  success: boolean
  data?: unknown
  message?: string
  error?: string
}

export interface Skill {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
  requiresApproval: boolean
  execute: (params: Record<string, unknown>, context: AgentContext) => Promise<SkillResult>
}

export interface MemoryEntry {
  key: string
  content: string
  metadata?: Record<string, unknown>
  expiresAt?: Date
}

export interface ProjectContextData {
  buildingDescription: string
  milestones: Array<{ name: string; targetDate: string; description?: string; status?: string }>
  goals: string[]
  techStack: string[]
}

export interface TeamStatus {
  totalMembers: number
  activeMembers: number
  workloadDistribution: Array<{
    userId: string
    name: string
    taskCount: number
    storyPoints: number
  }>
}

export interface SprintStatus {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  blockedTasks: number
  totalPoints: number
  completedPoints: number
  velocity: number
}

export interface BottleneckSummary {
  id: string
  type: string
  severity: string
  title: string
  description?: string
  status: string
}

export interface RichContext {
  projectContext?: ProjectContextData
  teamStatus?: TeamStatus
  sprintStatus?: SprintStatus
  activeBottlenecks: BottleneckSummary[]
  recentActivity: string[]
  upcomingMilestones: Array<{ name: string; daysRemaining: number }>
}
