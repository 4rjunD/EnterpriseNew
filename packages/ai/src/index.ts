export * from './predictions'
export * from './agents'
export { BottleneckDetector } from './bottleneck-detector'

// AI Agent Chat System
// Re-export specific items to avoid conflicts with ./agents AgentContext
export {
  AgentCore,
  MemoryManager,
  ContextBuilder,
  SYSTEM_PROMPT,
  BRIEFING_PROMPT,
  RISK_ANALYSIS_PROMPT,
  skills,
  readOnlySkills,
  actionSkills,
  getSkillByName,
  skillsAsTools,
  queryDataSkill,
  analyzeRisksSkill,
  writeStandupSkill,
  checkBlockersSkill,
  suggestActionsSkill,
  sendNudgeSkill,
  reassignTaskSkill,
  createTaskSkill,
  updateStatusSkill,
  scheduleMeetingSkill,
} from './agent'

// Export agent types with explicit names
export type {
  ChatAgentContext,
  AgentResponse,
  ChatMessage,
  ToolCall,
  PendingAction,
  RichContext,
  ProjectContextData,
  TeamStatus,
  SprintStatus,
  BottleneckSummary,
  Skill,
  SkillResult,
} from './agent'

// Re-export AgentContext from the new chat agent system for convenience (but named differently)
export type { AgentContext as AgentChatContext } from './agent/types'
