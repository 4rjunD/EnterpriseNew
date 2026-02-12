// AI Agent Module Exports
// ============================================================================

// Core
export { AgentCore } from './core'
export { MemoryManager } from './memory'
export { ContextBuilder } from './context-builder'

// Types
export type {
  AgentContext as ChatAgentContext,
  AgentResponse,
  ChatMessage,
  ToolCall,
  PendingAction,
  RichContext,
  ProjectContextData,
  TeamStatus,
  SprintStatus,
  BottleneckSummary,
} from './types'

// Prompts
export { SYSTEM_PROMPT, BRIEFING_PROMPT, RISK_ANALYSIS_PROMPT } from './prompts/system'

// Skills
export {
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
} from './skills'

export type { Skill, SkillResult } from './skills'
