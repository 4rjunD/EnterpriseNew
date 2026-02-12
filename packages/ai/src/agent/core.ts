// AgentCore - Main AI Agent Class
// ============================================================================

import Anthropic from '@anthropic-ai/sdk'
import { prisma, ConversationChannel } from '@nexflow/database'
import type { AgentContext, AgentResponse, ChatMessage, ToolCall, PendingAction } from './types'
import { MemoryManager } from './memory'
import { ContextBuilder } from './context-builder'
import { SYSTEM_PROMPT } from './prompts/system'
import { getSkillByName, skillsAsTools } from './skills'

// Use Anthropic SDK types directly
type MessageParam = Anthropic.Messages.MessageParam

export class AgentCore {
  private context: AgentContext
  private anthropic: Anthropic
  private memory: MemoryManager
  private contextBuilder: ContextBuilder

  constructor(context: AgentContext) {
    this.context = context
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
    this.memory = new MemoryManager(context.organizationId)
    this.contextBuilder = new ContextBuilder(context.organizationId)
  }

  /**
   * Process a user message and return a response
   */
  async chat(userMessage: string): Promise<AgentResponse> {
    const startTime = Date.now()

    // Get or create conversation
    const conversationId = await this.getOrCreateConversation()

    // Build context string
    const contextString = await this.contextBuilder.buildContextString()

    // Get recent conversation history
    const history = await this.getConversationHistory(conversationId)

    // Store user message
    await this.storeMessage(conversationId, {
      role: 'user',
      content: userMessage,
    })

    // Build messages array
    const messages: MessageParam[] = []

    // Add history
    for (const msg of history) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content,
        })
      }
    }

    // Add current message with context
    const userMessageWithContext = `${userMessage}

---
Current Context:
${contextString}`

    messages.push({
      role: 'user',
      content: userMessageWithContext,
    })

    // Call Claude with tools
    const response = await this.callClaude(messages)

    // Process response and tool calls
    const { message, toolCalls, pendingActions } = await this.processResponse(response)

    // Store assistant message
    const latencyMs = Date.now() - startTime
    await this.storeMessage(conversationId, {
      role: 'assistant',
      content: message,
      toolCalls,
    }, {
      tokens: response.usage?.output_tokens,
      latencyMs,
      model: response.model,
      pendingActions,
    })

    return {
      message,
      toolCalls,
      pendingActions,
      conversationId,
    }
  }

  /**
   * Call Claude API with tools
   */
  private async callClaude(messages: MessageParam[]): Promise<Anthropic.Message> {
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured')
    }

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: skillsAsTools as Anthropic.Tool[],
      messages,
    })

    // Handle tool use - process tools and continue conversation
    if (response.stop_reason === 'tool_use') {
      return this.handleToolUse(response, messages)
    }

    return response
  }

  /**
   * Handle tool use in Claude response
   */
  private async handleToolUse(
    response: Anthropic.Message,
    messages: MessageParam[]
  ): Promise<Anthropic.Message> {
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    )

    // Execute tools
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const toolUse of toolUseBlocks) {
      const skill = getSkillByName(toolUse.name)

      if (!skill) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: `Error: Unknown skill "${toolUse.name}"`,
          is_error: true,
        })
        continue
      }

      // Check if skill requires approval
      if (skill.requiresApproval) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify({
            status: 'pending_approval',
            message: `This action requires user approval. Skill: ${skill.name}`,
            params: toolUse.input,
          }),
        })
        continue
      }

      // Execute skill
      try {
        const result = await skill.execute(
          toolUse.input as Record<string, unknown>,
          this.context
        )
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        })
      } catch (error) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: `Error executing skill: ${error}`,
          is_error: true,
        })
      }
    }

    // Continue conversation with tool results
    const newMessages: MessageParam[] = [
      ...messages,
      { role: 'assistant' as const, content: response.content },
      { role: 'user' as const, content: toolResults },
    ]

    return this.callClaude(newMessages)
  }

  /**
   * Process Claude response into structured output
   */
  private async processResponse(response: Anthropic.Message): Promise<{
    message: string
    toolCalls: ToolCall[]
    pendingActions: PendingAction[]
  }> {
    let message = ''
    const toolCalls: ToolCall[] = []
    const pendingActions: PendingAction[] = []

    for (const block of response.content) {
      if (block.type === 'text') {
        message += block.text
      } else if (block.type === 'tool_use') {
        const skill = getSkillByName(block.name)

        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        })

        // If skill requires approval, create pending action
        if (skill?.requiresApproval) {
          pendingActions.push({
            id: `action_${block.id}`,
            skill: block.name,
            description: this.getActionDescription(block.name, block.input as Record<string, unknown>),
            params: block.input as Record<string, unknown>,
            requiresApproval: true,
          })
        }
      }
    }

    return { message, toolCalls, pendingActions }
  }

  /**
   * Generate human-readable description for an action
   */
  private getActionDescription(skillName: string, params: Record<string, unknown>): string {
    switch (skillName) {
      case 'send_nudge':
        return `Send a reminder to ${params.userId || 'user'}: "${params.message || 'reminder'}"`
      case 'reassign_task':
        return `Reassign task "${params.taskId}" from ${params.fromUserId || 'current assignee'} to ${params.toUserId || 'new assignee'}`
      case 'create_task':
        return `Create new task: "${params.title}"`
      case 'update_status':
        return `Update ${params.entityType || 'task'} status to "${params.status}"`
      case 'schedule_meeting':
        return `Schedule meeting: "${params.title}" with ${(params.attendees as string[])?.length || 0} attendees`
      default:
        return `Execute ${skillName} with params: ${JSON.stringify(params)}`
    }
  }

  /**
   * Get or create a conversation
   */
  private async getOrCreateConversation(): Promise<string> {
    if (this.context.conversationId) {
      return this.context.conversationId
    }

    // Create new conversation
    const conversation = await prisma.agentConversation.create({
      data: {
        organizationId: this.context.organizationId,
        userId: this.context.userId,
        channel: this.context.channel as ConversationChannel,
      },
    })

    this.context.conversationId = conversation.id
    return conversation.id
  }

  /**
   * Get conversation history
   */
  private async getConversationHistory(conversationId: string): Promise<ChatMessage[]> {
    const messages = await prisma.agentMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20, // Last 20 messages
    })

    return messages.map((m) => ({
      role: m.role as ChatMessage['role'],
      content: m.content,
      toolCalls: m.toolCalls as unknown as ToolCall[] | undefined,
    }))
  }

  /**
   * Store a message in the conversation
   */
  private async storeMessage(
    conversationId: string,
    message: ChatMessage,
    metadata?: {
      tokens?: number
      latencyMs?: number
      model?: string
      pendingActions?: PendingAction[]
    }
  ): Promise<void> {
    await prisma.agentMessage.create({
      data: {
        conversationId,
        role: message.role,
        content: message.content,
        toolCalls: message.toolCalls as unknown as object ?? undefined,
        tokens: metadata?.tokens,
        latencyMs: metadata?.latencyMs,
        model: metadata?.model,
        pendingActions: metadata?.pendingActions as unknown as object ?? undefined,
      },
    })

    // Update conversation timestamp
    await prisma.agentConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })
  }

  /**
   * Execute a pending action (after approval)
   */
  async executeAction(actionId: string, params: Record<string, unknown>): Promise<{
    success: boolean
    result?: unknown
    error?: string
  }> {
    // Parse skill name from action ID (action_toolId format or just skillName)
    const skillName = params.skill as string
    const skill = getSkillByName(skillName)

    if (!skill) {
      return { success: false, error: `Unknown skill: ${skillName}` }
    }

    try {
      const result = await skill.execute(params.params as Record<string, unknown>, this.context)
      return { success: result.success, result: result.data, error: result.error }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /**
   * Generate a briefing (for heartbeat)
   */
  async generateBriefing(): Promise<string> {
    const contextString = await this.contextBuilder.buildContextString()

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Generate a daily briefing for this team.

${contextString}

Keep it concise and actionable. Focus on:
1. Progress since yesterday
2. Top priorities for today
3. Any blockers or risks needing attention
4. Team workload status`,
        },
      ],
    })

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    )

    return textBlock?.text ?? 'Unable to generate briefing.'
  }
}
