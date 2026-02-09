import { prisma, AgentType, AgentActionStatus } from '@nexflow/database'
import { Agent, AgentContext, AgentDecision } from './agent-base'
import { TaskReassignerAgent } from './task-reassigner'
import { NudgeSenderAgent } from './nudge-sender'
import { ScopeAdjusterAgent } from './scope-adjuster'
import { AGENT_DEFAULTS } from '@nexflow/config'

export class AgentRegistry {
  private static agents: Map<AgentType, new (context: AgentContext) => Agent> = new Map([
    [AgentType.TASK_REASSIGNER, TaskReassignerAgent],
    [AgentType.NUDGE_SENDER, NudgeSenderAgent],
    [AgentType.SCOPE_ADJUSTER, ScopeAdjusterAgent],
  ])

  static getAgent(type: AgentType, context: AgentContext): Agent {
    const AgentClass = this.agents.get(type)
    if (!AgentClass) {
      throw new Error(`Unknown agent type: ${type}`)
    }
    return new AgentClass(context)
  }
}

export class AgentExecutor {
  async runAllAgents(organizationId: string): Promise<void> {
    const configs = await prisma.agentConfig.findMany({
      where: {
        organizationId,
        enabled: true,
      },
    })

    for (const config of configs) {
      const context: AgentContext = {
        organizationId,
        agentConfigId: config.id,
        agentType: config.type,
        thresholds: (config.thresholds as Record<string, unknown>) || this.getDefaultThresholds(config.type),
        quietHours: config.quietHours as { start: number; end: number } | undefined,
        autoApprove: config.autoApprove,
      }

      try {
        const agent = AgentRegistry.getAgent(config.type, context)
        await agent.run()
      } catch (error) {
        console.error(`Error running agent ${config.type}:`, error)
      }
    }
  }

  async executeApprovedActions(): Promise<void> {
    const approvedActions = await prisma.agentAction.findMany({
      where: { status: AgentActionStatus.APPROVED },
      include: { agentConfig: true },
    })

    for (const action of approvedActions) {
      const context: AgentContext = {
        organizationId: action.agentConfig.organizationId,
        agentConfigId: action.agentConfigId,
        agentType: action.agentConfig.type,
        thresholds: (action.agentConfig.thresholds as Record<string, unknown>) || {},
        quietHours: action.agentConfig.quietHours as { start: number; end: number } | undefined,
        autoApprove: action.agentConfig.autoApprove,
      }

      try {
        const agent = AgentRegistry.getAgent(action.agentConfig.type, context)

        const decision: AgentDecision = {
          shouldAct: true,
          action: action.action,
          reasoning: action.reasoning || '',
          suggestion: action.suggestion as Record<string, unknown>,
          targetUserId: action.targetUserId || undefined,
          bottleneckId: action.bottleneckId || undefined,
          priority: 'medium',
        }

        const result = await agent.execute(decision)

        await prisma.agentAction.update({
          where: { id: action.id },
          data: {
            status: result.success ? AgentActionStatus.EXECUTED : AgentActionStatus.FAILED,
            result,
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

  private getDefaultThresholds(type: AgentType): Record<string, unknown> {
    switch (type) {
      case AgentType.TASK_REASSIGNER:
        return AGENT_DEFAULTS.taskReassigner
      case AgentType.NUDGE_SENDER:
        return AGENT_DEFAULTS.nudgeSender
      case AgentType.SCOPE_ADJUSTER:
        return AGENT_DEFAULTS.scopeAdjuster
      default:
        return {}
    }
  }
}
