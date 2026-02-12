// Skill Types for AI Agent
// ============================================================================

import type { AgentContext } from '../types'

export interface SkillResult {
  success: boolean
  data?: unknown
  message?: string
  error?: string
}

export interface SkillParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  enum?: string[]
  items?: { type: string }
  default?: unknown
}

export interface Skill {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, SkillParameter>
    required?: string[]
  }
  requiresApproval: boolean
  execute: (params: Record<string, unknown>, context: AgentContext) => Promise<SkillResult>
}

// Tool format for Anthropic API
export interface AnthropicTool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}
