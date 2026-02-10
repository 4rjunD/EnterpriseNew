import { prisma, AgentType, AgentActionStatus } from '@nexflow/database'

export interface AgentContext {
  organizationId: string
  agentConfigId: string
  agentType: AgentType
  thresholds: Record<string, unknown>
  quietHours?: { start: number; end: number }
  autoApprove: boolean
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

  constructor(context: AgentContext) {
    this.context = context
  }

  abstract evaluate(): Promise<AgentDecision[]>
  abstract execute(decision: AgentDecision): Promise<AgentResult>

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
