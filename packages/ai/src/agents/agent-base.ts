import { prisma, AgentType, AgentActionStatus } from '@nexflow/database'
import OpenAI from 'openai'

export interface AgentContext {
  organizationId: string
  agentConfigId: string
  agentType: AgentType
  thresholds: Record<string, unknown>
  quietHours?: { start: number; end: number }
  autoApprove: boolean
}

export interface AIAnalysisResult {
  shouldAct: boolean
  reasoning: string
  confidence: number
  recommendation?: string
  priority?: 'low' | 'medium' | 'high'
}

export interface AgentDecision {
  shouldAct: boolean
  action: string
  reasoning: string
  suggestion: Record<string, unknown>
  targetUserId?: string
  bottleneckId?: string
  priority: 'low' | 'medium' | 'high'
}

export interface AgentResult {
  success: boolean
  message: string
  data?: Record<string, unknown>
}

export abstract class Agent {
  protected context: AgentContext
  protected openai: OpenAI

  constructor(context: AgentContext) {
    this.context = context
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  abstract evaluate(): Promise<AgentDecision[]>
  abstract execute(decision: AgentDecision): Promise<AgentResult>

  /**
   * Get the project context for AI analysis
   */
  protected async getProjectContext(): Promise<string> {
    const ctx = await prisma.projectContext.findFirst({
      where: { organizationId: this.context.organizationId },
    })

    if (!ctx) {
      return 'No project context available.'
    }

    const parts: string[] = []
    parts.push(`Building: ${ctx.buildingDescription}`)

    if (ctx.goals && ctx.goals.length > 0) {
      parts.push(`Goals: ${ctx.goals.join(', ')}`)
    }

    if (ctx.milestones) {
      const milestones = ctx.milestones as Array<{ name: string; targetDate: string }>
      if (milestones.length > 0) {
        parts.push(`Milestones: ${milestones.map((m) => `${m.name} (${m.targetDate})`).join(', ')}`)
      }
    }

    if (ctx.techStack && ctx.techStack.length > 0) {
      parts.push(`Tech Stack: ${ctx.techStack.join(', ')}`)
    }

    return parts.join('\n')
  }

  /**
   * Analyze data using GPT to make AI-powered decisions
   */
  protected async analyzeWithAI(
    prompt: string,
    data: Record<string, unknown>
  ): Promise<AIAnalysisResult> {
    // Skip AI analysis if no API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return {
        shouldAct: false,
        reasoning: 'AI analysis unavailable - no API key configured',
        confidence: 0,
      }
    }

    try {
      const projectContext = await this.getProjectContext()

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an AI engineering manager assistant. Analyze the provided data in the context of the project and make recommendations.

PROJECT CONTEXT:
${projectContext}

You must respond with valid JSON in this exact format:
{
  "shouldAct": boolean,
  "reasoning": "string explaining your analysis",
  "confidence": number between 0 and 1,
  "recommendation": "optional specific recommendation",
  "priority": "low" | "medium" | "high"
}

Be conservative - only recommend action when truly needed. Consider:
- Project goals and milestones when assessing urgency
- Team dynamics and workload balance
- Risk vs reward of taking action`,
          },
          {
            role: 'user',
            content: `${prompt}\n\nData to analyze:\n${JSON.stringify(data, null, 2)}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
        temperature: 0.3,
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        return {
          shouldAct: false,
          reasoning: 'No response from AI',
          confidence: 0,
        }
      }

      const result = JSON.parse(content) as AIAnalysisResult
      return {
        shouldAct: result.shouldAct ?? false,
        reasoning: result.reasoning ?? 'No reasoning provided',
        confidence: Math.max(0, Math.min(1, result.confidence ?? 0)),
        recommendation: result.recommendation,
        priority: result.priority,
      }
    } catch (error) {
      console.error('AI analysis failed:', error)
      return {
        shouldAct: false,
        reasoning: `AI analysis failed: ${error}`,
        confidence: 0,
      }
    }
  }

  protected async preExecutionChecks(): Promise<boolean> {
    // Check quiet hours
    if (this.context.quietHours) {
      const currentHour = new Date().getHours()
      const { start, end } = this.context.quietHours

      if (start > end) {
        // Quiet hours span midnight
        if (currentHour >= start || currentHour < end) {
          return false
        }
      } else {
        if (currentHour >= start && currentHour < end) {
          return false
        }
      }
    }

    // Check rate limiting - max 10 actions per hour
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentActions = await prisma.agentAction.count({
      where: {
        agentConfigId: this.context.agentConfigId,
        createdAt: { gte: hourAgo },
      },
    })

    if (recentActions >= 10) {
      return false
    }

    return true
  }

  async run(): Promise<void> {
    const canExecute = await this.preExecutionChecks()
    if (!canExecute) {
      return
    }

    const decisions = await this.evaluate()

    for (const decision of decisions) {
      if (!decision.shouldAct) continue

      // Create pending action
      const action = await prisma.agentAction.create({
        data: {
          agentConfigId: this.context.agentConfigId,
          action: decision.action,
          reasoning: decision.reasoning,
          suggestion: decision.suggestion as any,
          targetUserId: decision.targetUserId,
          bottleneckId: decision.bottleneckId,
          status: this.context.autoApprove
            ? AgentActionStatus.APPROVED
            : AgentActionStatus.PENDING,
          ...(this.context.autoApprove && {
            approvedAt: new Date(),
            approvedBy: 'system',
          }),
        },
      })

      // If auto-approve, execute immediately
      if (this.context.autoApprove) {
        try {
          const result = await this.execute(decision)
          await prisma.agentAction.update({
            where: { id: action.id },
            data: {
              status: result.success
                ? AgentActionStatus.EXECUTED
                : AgentActionStatus.FAILED,
              result: result as any,
              executedAt: new Date(),
            },
          })
        } catch (error) {
          await prisma.agentAction.update({
            where: { id: action.id },
            data: {
              status: AgentActionStatus.FAILED,
              result: { error: String(error) },
            },
          })
        }
      }
    }
  }
}
