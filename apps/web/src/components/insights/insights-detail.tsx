'use client'

import { trpc } from '@/lib/trpc'
import { Card } from '@nexflow/ui/card'
import { Badge } from '@nexflow/ui/badge'
import { Button } from '@nexflow/ui/button'
import { Skeleton } from '@nexflow/ui/skeleton'
import { toast } from '@nexflow/ui/toast'
import {
  Bot,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  Play,
  Loader2,
  Target,
  Users,
  BarChart3,
} from 'lucide-react'

export function InsightsDetail() {
  const utils = trpc.useUtils()
  const { data: agentStats, isLoading: agentLoading } = trpc.agents.getStats.useQuery()
  const { data: predictions } = trpc.predictions.getStats.useQuery()
  const { data: bottleneckStats } = trpc.bottlenecks.getStats.useQuery()
  const { data: predictionsList } = trpc.predictions.list.useQuery({})

  const runAnalysis = trpc.agents.runAnalysis.useMutation({
    onSuccess: (data) => {
      utils.agents.getStats.invalidate()
      utils.agents.getPendingActions.invalidate()
      utils.bottlenecks.getStats.invalidate()
      utils.predictions.getStats.invalidate()
      utils.predictions.list.invalidate()
      utils.dashboard.invalidate()
      const successCount = data.steps.filter(s => s.status === 'success').length
      toast({
        title: 'Analysis Complete',
        description: `${successCount}/${data.steps.length} steps completed successfully.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Analysis Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  if (agentLoading) {
    return <InsightsSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Impact Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <ImpactCard
          label="Hours Saved"
          value="24h"
          description="This week"
          icon={Clock}
          trend="+12%"
        />
        <ImpactCard
          label="Actions Executed"
          value={agentStats?.actionsThisWeek ?? 0}
          description="By agents"
          icon={Bot}
        />
        <ImpactCard
          label="Blockers Resolved"
          value={bottleneckStats?.resolved24h ?? 0}
          description="Today"
          icon={CheckCircle}
        />
        <ImpactCard
          label="Acceptance Rate"
          value={`${agentStats?.acceptanceRate ?? 0}%`}
          description="Agent suggestions"
          icon={TrendingUp}
          trend={agentStats?.acceptanceRate && agentStats.acceptanceRate > 80 ? '↑' : undefined}
        />
      </div>

      {/* Run Analysis Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">AI Insights</h3>
        <Button
          onClick={() => runAnalysis.mutate()}
          disabled={runAnalysis.isLoading}
          size="sm"
        >
          {runAnalysis.isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {runAnalysis.isLoading ? 'Analyzing...' : 'Run Analysis'}
        </Button>
      </div>

      {/* Recent Insights */}
      <div>
        <h3 className="mb-4 text-lg font-medium">Recent Insights</h3>
        <div className="space-y-3">
          {predictionsList && predictionsList.length > 0 ? (
            predictionsList.map((prediction) => (
              <InsightCard
                key={prediction.id}
                title={formatPredictionTitle(prediction)}
                description={prediction.reasoning || 'Analysis complete.'}
                type={getPredictionInsightType(prediction)}
                icon={getPredictionIcon(prediction.type)}
              />
            ))
          ) : (
            <Card className="p-6 text-center">
              <p className="text-foreground-muted">
                No insights yet. Click <strong>Run Analysis</strong> to sync your integrations and generate AI-powered insights.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Agent Performance */}
      <div>
        <h3 className="mb-4 text-lg font-medium">Agent Performance</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <AgentCard
            name="Task Reassigner"
            actions={agentStats?.byAgent?.TASK_REASSIGNER ?? 0}
            enabled={true}
          />
          <AgentCard
            name="Nudge Sender"
            actions={agentStats?.byAgent?.NUDGE_SENDER ?? 0}
            enabled={true}
          />
          <AgentCard
            name="Scope Adjuster"
            actions={agentStats?.byAgent?.SCOPE_ADJUSTER ?? 0}
            enabled={false}
          />
        </div>
      </div>
    </div>
  )
}

function ImpactCard({
  label,
  value,
  description,
  icon: Icon,
  trend,
}: {
  label: string
  value: string | number
  description: string
  icon: React.ComponentType<{ className?: string }>
  trend?: string
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold">{value}</span>
            {trend && (
              <span className="text-sm text-status-healthy">{trend}</span>
            )}
          </div>
          <div className="text-sm text-foreground-muted">{label}</div>
          <div className="text-xs text-foreground-muted">{description}</div>
        </div>
        <div className="rounded-lg bg-accent-light p-2 text-accent">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}

function InsightCard({
  title,
  description,
  type,
  icon: Icon,
}: {
  title: string
  description: string
  type: 'positive' | 'warning' | 'negative'
  icon: React.ComponentType<{ className?: string }>
}) {
  const colors = {
    positive: {
      bg: 'bg-status-healthy-light',
      text: 'text-status-healthy',
      border: 'border-l-status-healthy',
    },
    warning: {
      bg: 'bg-status-warning-light',
      text: 'text-status-warning',
      border: 'border-l-status-warning',
    },
    negative: {
      bg: 'bg-status-critical-light',
      text: 'text-status-critical',
      border: 'border-l-status-critical',
    },
  }

  const color = colors[type]

  return (
    <Card className={`border-l-4 p-4 ${color.border}`}>
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2 ${color.bg} ${color.text}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="font-medium text-foreground">{title}</div>
          <p className="mt-1 text-sm text-foreground-muted">{description}</p>
        </div>
      </div>
    </Card>
  )
}

function AgentCard({
  name,
  actions,
  enabled,
}: {
  name: string
  actions: number
  enabled: boolean
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-background-secondary p-2">
            <Bot className="h-5 w-5 text-foreground-muted" />
          </div>
          <div>
            <div className="font-medium">{name}</div>
            <div className="text-sm text-foreground-muted">
              {actions} actions this week
            </div>
          </div>
        </div>
        <Badge variant={enabled ? 'healthy' : 'secondary'}>
          {enabled ? 'Active' : 'Disabled'}
        </Badge>
      </div>
    </Card>
  )
}

function formatPredictionTitle(prediction: { type: string; confidence: number; value: unknown; project?: { name: string; key: string } | null }): string {
  const value = prediction.value as Record<string, unknown>
  const projectLabel = prediction.project ? `[${prediction.project.key}] ` : ''

  switch (prediction.type) {
    case 'DEADLINE_RISK':
      return `${projectLabel}Deadline risk: ${value.riskLevel} (${Math.round(prediction.confidence * 100)}% confidence)`
    case 'BURNOUT_INDICATOR':
      return `${projectLabel}Burnout risk: ${value.riskLevel}`
    case 'VELOCITY_FORECAST':
      return `${projectLabel}Velocity ${value.trend}: ~${typeof value.predictedVelocity === 'number' ? value.predictedVelocity.toFixed(1) : value.predictedVelocity} tasks/week`
    case 'SCOPE_CREEP':
      return `${projectLabel}Scope creep: ${value.severity} (+${typeof value.percentageIncrease === 'number' ? Math.round(value.percentageIncrease) : value.percentageIncrease}%)`
    default:
      return `${projectLabel}Prediction (${Math.round(prediction.confidence * 100)}% confidence)`
  }
}

function getPredictionInsightType(prediction: { type: string; confidence: number; value: unknown }): 'positive' | 'warning' | 'negative' {
  const value = prediction.value as Record<string, unknown>

  switch (prediction.type) {
    case 'DEADLINE_RISK': {
      const risk = value.riskLevel as string
      if (risk === 'critical' || risk === 'high') return 'negative'
      if (risk === 'medium') return 'warning'
      return 'positive'
    }
    case 'BURNOUT_INDICATOR': {
      const risk = value.riskLevel as string
      if (risk === 'high') return 'negative'
      if (risk === 'medium') return 'warning'
      return 'positive'
    }
    case 'VELOCITY_FORECAST': {
      const trend = value.trend as string
      if (trend === 'increasing') return 'positive'
      if (trend === 'decreasing') return 'negative'
      return 'warning'
    }
    case 'SCOPE_CREEP': {
      const severity = value.severity as string
      if (severity === 'severe') return 'negative'
      if (severity === 'moderate') return 'warning'
      return 'positive'
    }
    default:
      return prediction.confidence >= 0.7 ? 'warning' : 'positive'
  }
}

function getPredictionIcon(type: string): React.ComponentType<{ className?: string }> {
  switch (type) {
    case 'DEADLINE_RISK':
      return Clock
    case 'BURNOUT_INDICATOR':
      return Users
    case 'VELOCITY_FORECAST':
      return BarChart3
    case 'SCOPE_CREEP':
      return Target
    default:
      return TrendingUp
  }
}

function InsightsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-6 w-40" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  )
}
