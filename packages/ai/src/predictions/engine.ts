import OpenAI from 'openai'
import { prisma, PredictionType, TaskStatus, BottleneckSeverity } from '@nexflow/database'

interface PredictionContext {
  organizationId: string
  projectId?: string
}

interface DeadlineRiskPrediction {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  probability: number
  estimatedDelay?: number // days
  factors: string[]
  recommendations: string[]
}

interface BurnoutIndicator {
  userId: string
  riskLevel: 'low' | 'medium' | 'high'
  factors: string[]
  recommendations: string[]
}

interface VelocityForecast {
  predictedVelocity: number
  confidenceInterval: { low: number; high: number }
  trend: 'increasing' | 'stable' | 'decreasing'
}

interface ScopeCreepIndicator {
  detected: boolean
  severity: 'minor' | 'moderate' | 'severe'
  percentageIncrease: number
  factors: string[]
}

export class PredictionEngine {
  private openai: OpenAI
  private context: PredictionContext

  constructor(context: PredictionContext) {
    this.context = context
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    })
  }

  private async generateReasoning(type: string, data: object): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a project management AI assistant. Provide concise 2-3 sentence insights about project predictions. Be specific and actionable. Do not use markdown formatting.',
          },
          {
            role: 'user',
            content: `Explain this ${type} prediction in plain language for a project manager: ${JSON.stringify(data)}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      })
      return response.choices[0]?.message?.content || ''
    } catch (error) {
      console.error('OpenAI API error:', error)
      return this.generateFallbackReasoning(type, data)
    }
  }

  private generateFallbackReasoning(type: string, data: object): string {
    const d = data as Record<string, unknown>
    switch (type) {
      case 'deadline_risk':
        return `Based on current velocity and ${d.factors ? (d.factors as string[]).length : 0} risk factors, there is a ${Math.round((d.probability as number || 0) * 100)}% probability of delay.`
      case 'burnout':
        return `Elevated workload detected with ${d.factors ? (d.factors as string[]).length : 0} contributing factors. Consider redistributing tasks.`
      case 'velocity':
        return `Team velocity is ${d.trend || 'stable'} with a predicted rate of ${d.predictedVelocity || 'N/A'} tasks per sprint.`
      case 'scope_creep':
        return `Scope has increased by ${d.percentageIncrease || 0}% since project start, indicating potential scope creep.`
      default:
        return 'Analysis complete. Review the detailed metrics for more information.'
    }
  }

  async runAllPredictions(): Promise<void> {
    await Promise.all([
      this.predictDeadlineRisk(),
      this.detectBurnoutIndicators(),
      this.forecastVelocity(),
      this.detectScopeCreep(),
    ])
  }

  async predictDeadlineRisk(): Promise<void> {
    const { projectId } = this.context

    if (!projectId) return

    // Gather project data
    const [project, tasks, prs, bottlenecks] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.task.findMany({
        where: { projectId },
        include: { assignee: true },
      }),
      prisma.pullRequest.findMany({ where: { projectId } }),
      prisma.bottleneck.findMany({
        where: { projectId, status: 'ACTIVE' },
      }),
    ])

    if (!project?.targetDate) return

    // Calculate metrics
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE).length
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0

    const daysUntilDeadline = Math.ceil(
      (project.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    const remainingTasks = totalTasks - completedTasks
    const requiredDailyVelocity = remainingTasks / Math.max(daysUntilDeadline, 1)

    // Calculate historical velocity (tasks completed per day over last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentlyCompletedTasks = tasks.filter(
      (t) => t.status === TaskStatus.DONE && t.updatedAt > thirtyDaysAgo
    ).length
    const historicalVelocity = recentlyCompletedTasks / 30

    // Determine risk level
    let riskLevel: DeadlineRiskPrediction['riskLevel'] = 'low'
    let probability = 0.1

    if (requiredDailyVelocity > historicalVelocity * 2) {
      riskLevel = 'critical'
      probability = 0.9
    } else if (requiredDailyVelocity > historicalVelocity * 1.5) {
      riskLevel = 'high'
      probability = 0.7
    } else if (requiredDailyVelocity > historicalVelocity) {
      riskLevel = 'medium'
      probability = 0.4
    }

    // Adjust for bottlenecks
    const criticalBottlenecks = bottlenecks.filter(
      (b) => b.severity === BottleneckSeverity.CRITICAL
    ).length
    if (criticalBottlenecks > 0) {
      probability = Math.min(1, probability + 0.1 * criticalBottlenecks)
    }

    const factors: string[] = []
    if (requiredDailyVelocity > historicalVelocity) {
      factors.push(`Required velocity (${requiredDailyVelocity.toFixed(1)}/day) exceeds historical (${historicalVelocity.toFixed(1)}/day)`)
    }
    if (criticalBottlenecks > 0) {
      factors.push(`${criticalBottlenecks} critical bottleneck(s) detected`)
    }
    if (completionRate < 0.3 && daysUntilDeadline < 14) {
      factors.push(`Low completion rate (${Math.round(completionRate * 100)}%) with limited time remaining`)
    }

    const recommendations: string[] = []
    if (riskLevel !== 'low') {
      recommendations.push('Consider scope reduction or deadline extension')
      if (criticalBottlenecks > 0) {
        recommendations.push('Prioritize resolving critical bottlenecks')
      }
      if (requiredDailyVelocity > historicalVelocity * 1.5) {
        recommendations.push('Add resources or redistribute workload')
      }
    }

    const predictionData: DeadlineRiskPrediction = {
      riskLevel,
      probability,
      estimatedDelay: riskLevel !== 'low' ? Math.ceil((remainingTasks / historicalVelocity) - daysUntilDeadline) : undefined,
      factors,
      recommendations,
    }

    // Generate AI reasoning
    const reasoning = await this.generateReasoning('deadline_risk', {
      riskLevel,
      probability,
      daysUntilDeadline,
      remainingTasks,
      historicalVelocity,
      criticalBottlenecks,
      factors,
    })

    // Store prediction
    await this.storePrediction(PredictionType.DEADLINE_RISK, probability, predictionData, reasoning)
  }

  async detectBurnoutIndicators(): Promise<void> {
    const { organizationId } = this.context

    // Get users with behavioral metrics
    const users = await prisma.user.findMany({
      where: { organizationId },
      include: {
        behavioralMetrics: {
          where: {
            date: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { date: 'desc' },
        },
        assignedTasks: {
          where: { status: { not: 'DONE' } },
        },
      },
    })

    for (const user of users) {
      const factors: string[] = []
      let riskScore = 0

      // Check workload
      const activeTasks = user.assignedTasks.length
      if (activeTasks > 8) {
        factors.push(`High workload: ${activeTasks} active tasks`)
        riskScore += 30
      } else if (activeTasks > 5) {
        factors.push(`Elevated workload: ${activeTasks} active tasks`)
        riskScore += 15
      }

      // Check for weekend activity
      const weekendActivity = user.behavioralMetrics.filter((m) => m.weekendActivity).length
      if (weekendActivity > 2) {
        factors.push(`Frequent weekend activity (${weekendActivity} days in 2 weeks)`)
        riskScore += 25
      }

      // Check for extended hours
      const extendedHours = user.behavioralMetrics.filter(
        (m) => m.activeHoursEnd && m.activeHoursEnd > 20
      ).length
      if (extendedHours > 5) {
        factors.push(`Frequent late working hours`)
        riskScore += 20
      }

      // Determine risk level
      let riskLevel: BurnoutIndicator['riskLevel'] = 'low'
      if (riskScore >= 50) {
        riskLevel = 'high'
      } else if (riskScore >= 25) {
        riskLevel = 'medium'
      }

      if (riskLevel !== 'low') {
        const recommendations = [
          'Consider redistributing workload',
          'Encourage taking breaks and time off',
        ]
        if (weekendActivity > 2) {
          recommendations.push('Review deadline expectations')
        }

        const predictionData: BurnoutIndicator = {
          userId: user.id,
          riskLevel,
          factors,
          recommendations,
        }

        // Generate AI reasoning
        const reasoning = await this.generateReasoning('burnout', {
          userName: user.name,
          riskLevel,
          activeTasks,
          weekendActivity,
          extendedHours,
          factors,
        })

        await this.storePrediction(PredictionType.BURNOUT_INDICATOR, riskScore / 100, predictionData, reasoning)
      }
    }
  }

  async forecastVelocity(): Promise<void> {
    const { projectId, organizationId } = this.context

    // Get historical completion data
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const tasks = await prisma.task.findMany({
      where: {
        ...(projectId ? { projectId } : { project: { organizationId } }),
        status: TaskStatus.DONE,
        updatedAt: { gte: thirtyDaysAgo },
      },
    })

    // Group by week
    const weeklyVelocity: number[] = [0, 0, 0, 0]
    tasks.forEach((task) => {
      const weekIndex = Math.floor(
        (Date.now() - task.updatedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
      )
      if (weekIndex < 4) {
        weeklyVelocity[3 - weekIndex]++
      }
    })

    const avgVelocity = weeklyVelocity.reduce((a, b) => a + b, 0) / 4
    const stdDev = Math.sqrt(
      weeklyVelocity.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / 4
    )

    // Determine trend
    const recentAvg = (weeklyVelocity[2] + weeklyVelocity[3]) / 2
    const olderAvg = (weeklyVelocity[0] + weeklyVelocity[1]) / 2
    let trend: VelocityForecast['trend'] = 'stable'
    if (recentAvg > olderAvg * 1.1) {
      trend = 'increasing'
    } else if (recentAvg < olderAvg * 0.9) {
      trend = 'decreasing'
    }

    const confidence = Math.min(0.9, 0.5 + (tasks.length / 100) * 0.4)

    const predictionData: VelocityForecast = {
      predictedVelocity: avgVelocity,
      confidenceInterval: {
        low: Math.max(0, avgVelocity - stdDev),
        high: avgVelocity + stdDev,
      },
      trend,
    }

    // Generate AI reasoning
    const reasoning = await this.generateReasoning('velocity', {
      predictedVelocity: avgVelocity,
      trend,
      weeklyVelocity,
      totalTasksAnalyzed: tasks.length,
    })

    await this.storePrediction(PredictionType.VELOCITY_FORECAST, confidence, predictionData, reasoning)
  }

  async detectScopeCreep(): Promise<void> {
    const { projectId } = this.context

    if (!projectId) return

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          select: { id: true, createdAt: true },
        },
      },
    })

    if (!project?.startDate) return

    // Count tasks created after project start
    const tasksAtStart = project.tasks.filter(
      (t) => t.createdAt <= project.startDate!
    ).length
    const currentTasks = project.tasks.length

    if (tasksAtStart === 0) return

    const percentageIncrease = ((currentTasks - tasksAtStart) / tasksAtStart) * 100

    let severity: ScopeCreepIndicator['severity'] = 'minor'
    let detected = false

    if (percentageIncrease > 50) {
      severity = 'severe'
      detected = true
    } else if (percentageIncrease > 25) {
      severity = 'moderate'
      detected = true
    } else if (percentageIncrease > 10) {
      severity = 'minor'
      detected = true
    }

    if (detected) {
      const predictionData: ScopeCreepIndicator = {
        detected,
        severity,
        percentageIncrease,
        factors: [
          `${currentTasks - tasksAtStart} new tasks added since project start`,
          `${Math.round(percentageIncrease)}% increase from original scope`,
        ],
      }

      // Generate AI reasoning
      const reasoning = await this.generateReasoning('scope_creep', {
        severity,
        percentageIncrease,
        tasksAtStart,
        currentTasks,
        newTasks: currentTasks - tasksAtStart,
      })

      await this.storePrediction(PredictionType.SCOPE_CREEP, 0.8, predictionData, reasoning)
    }
  }

  private async storePrediction(
    type: PredictionType,
    confidence: number,
    value: object,
    reasoning?: string
  ): Promise<void> {
    // Deactivate old predictions of same type
    await prisma.prediction.updateMany({
      where: {
        type,
        projectId: this.context.projectId,
        isActive: true,
      },
      data: { isActive: false },
    })

    // Create new prediction
    await prisma.prediction.create({
      data: {
        type,
        confidence,
        value: value as object,
        reasoning,
        projectId: this.context.projectId,
        isActive: true,
      },
    })
  }
}
