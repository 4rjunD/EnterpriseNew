'use client'

import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@nexflow/ui/card'
import { Badge } from '@nexflow/ui/badge'
import { Button } from '@nexflow/ui/button'
import { Skeleton } from '@nexflow/ui/skeleton'
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Target,
  X,
} from 'lucide-react'
import { cn } from '@nexflow/ui/utils'

export function PredictionsDetail() {
  const { data: predictions, isLoading } = trpc.predictions.list.useQuery({})
  const { data: stats } = trpc.predictions.getStats.useQuery()

  const utils = trpc.useUtils()
  const dismissMutation = trpc.predictions.dismiss.useMutation({
    onSuccess: () => utils.predictions.invalidate(),
  })

  const predictionsList = Array.isArray(predictions) ? predictions : []

  if (isLoading) {
    return <PredictionsSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Active Predictions"
          value={stats?.total ?? 0}
          icon={TrendingUp}
        />
        <StatCard
          label="High Confidence"
          value={stats?.highConfidence ?? 0}
          icon={Target}
        />
        <StatCard
          label="At Risk Projects"
          value={stats?.atRisk ?? 0}
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          label="Avg Confidence"
          value={`${Math.round((stats?.avgConfidence ?? 0) * 100)}%`}
          icon={TrendingUp}
        />
      </div>

      {/* Predictions List */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground-muted uppercase tracking-wide">Active Predictions</h3>
        {predictionsList.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-foreground-muted">
            No active predictions
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {predictionsList.map((prediction) => (
              <PredictionCard
                key={prediction.id}
                prediction={prediction}
                onDismiss={() => dismissMutation.mutate({ id: prediction.id })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'warning'
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'rounded-lg p-2',
            variant === 'warning'
              ? 'bg-status-warning-light text-status-warning'
              : 'bg-accent-light text-accent'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold">{value}</div>
          <div className="text-xs text-foreground-muted">{label}</div>
        </div>
      </div>
    </Card>
  )
}

function PredictionCard({
  prediction,
  onDismiss,
}: {
  prediction: {
    id: string
    type: string
    confidence: number
    value: Record<string, unknown>
    reasoning?: string | null
    project?: { name: string; key: string } | null
  }
  onDismiss: () => void
}) {
  const typeConfig = {
    DEADLINE_RISK: {
      icon: Clock,
      label: 'Deadline Risk',
      color: 'text-status-critical',
      bgColor: 'bg-status-critical-light',
    },
    BURNOUT_INDICATOR: {
      icon: Users,
      label: 'Burnout Indicator',
      color: 'text-status-warning',
      bgColor: 'bg-status-warning-light',
    },
    VELOCITY_FORECAST: {
      icon: TrendingUp,
      label: 'Velocity Forecast',
      color: 'text-accent',
      bgColor: 'bg-accent-light',
    },
    SCOPE_CREEP: {
      icon: Target,
      label: 'Scope Creep',
      color: 'text-status-warning',
      bgColor: 'bg-status-warning-light',
    },
  }

  const config = typeConfig[prediction.type as keyof typeof typeConfig] || {
    icon: TrendingUp,
    label: prediction.type,
    color: 'text-foreground-muted',
    bgColor: 'bg-background-secondary',
  }
  const Icon = config.icon

  const confidenceLevel =
    prediction.confidence >= 0.8
      ? 'High'
      : prediction.confidence >= 0.6
        ? 'Medium'
        : 'Low'

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={cn('rounded-lg p-2', config.bgColor, config.color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{config.label}</span>
              <Badge
                variant={
                  prediction.confidence >= 0.8
                    ? 'healthy'
                    : prediction.confidence >= 0.6
                      ? 'warning'
                      : 'secondary'
                }
              >
                {confidenceLevel} ({Math.round(prediction.confidence * 100)}%)
              </Badge>
            </div>
            {prediction.project && (
              <span className="text-sm text-foreground-muted">
                {prediction.project.name}
              </span>
            )}
            {prediction.reasoning && (
              <p className="mt-2 text-sm text-foreground-secondary">
                {prediction.reasoning}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}

function PredictionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-6 w-40" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  )
}
