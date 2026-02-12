// Skills Registry for AI Agent
// ============================================================================

import type { Skill, AnthropicTool } from './types'

// Import all skills
import { queryDataSkill } from './query-data'
import { analyzeRisksSkill } from './analyze-risks'
import { writeStandupSkill } from './write-standup'
import { checkBlockersSkill } from './check-blockers'
import { suggestActionsSkill } from './suggest-actions'
import { sendNudgeSkill } from './send-nudge'
import { reassignTaskSkill } from './reassign-task'
import { createTaskSkill } from './create-task'
import { updateStatusSkill } from './update-status'
import { scheduleMeetingSkill } from './schedule-meeting'

// Export individual skills
export {
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
}

// All skills array
export const skills: Skill[] = [
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
]

// Skills that don't require approval (read-only)
export const readOnlySkills = skills.filter((s) => !s.requiresApproval)

// Skills that require approval (actions)
export const actionSkills = skills.filter((s) => s.requiresApproval)

// Get skill by name
export function getSkillByName(name: string): Skill | undefined {
  return skills.find((s) => s.name === name)
}

// Convert skills to Anthropic tool format
export const skillsAsTools: AnthropicTool[] = skills.map((skill) => ({
  name: skill.name,
  description: skill.description,
  input_schema: skill.parameters,
}))

// Re-export types
export type { Skill, SkillResult, AnthropicTool } from './types'
