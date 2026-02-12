'use client'

import { trpc } from '@/lib/trpc'
import { cn } from '@nexflow/ui/utils'
import { Skeleton } from '@nexflow/ui/skeleton'
import {
  Lightbulb,
  Users,
  Scissors,
  Calendar,
  Settings,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

const typeConfig = {
  scope_reduction: {
    icon: Scissors,
    color: 'text-foreground',
    bgColor: 'bg-accent-light',
  },
  resource_reallocation: {
    icon: Users,
    color: 'text-foreground',
    bgColor: 'bg-accent-light',
  },
  deadline_adjustment: {
    icon: Calendar,
    color: 'text-status-warning',
    bgColor: 'bg-status-warning-light',
  },
  process_improvement: {
    icon: Settings,
    color: 'text-status-healthy',
    bgColor: 'bg-status-healthy-light',
  },
}

const priorityConfig = {
  high: {
    label: 'High Priority',
    color: 'text-status-critical',
    bgColor: 'bg-status-critical-light',
  },
  medium: {
    label: 'Medium',
    color: 'text-status-warning',
    bgColor: 'bg-status-warning-light',
  },
  low: {
    label: 'Low',
    color: 'text-status-healthy',
    bgColor: 'bg-status-healthy-light',
  },
}

export function AIRecommendations() {
  const { data, isLoading } = trpc.progress.getAIRecommendations.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (!data || data.recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-foreground-muted">
        <Sparkles className="w-8 h-8 mb-2" />
        <p className="text-sm">No recommendations yet</p>
        <p className="text-xs">AI will suggest actions as it learns your patterns</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
      {data.recommendations.map((rec, idx) => {
        const typeConf = typeConfig[rec.type as keyof typeof typeConfig] || typeConfig.process_improvement
        const priorityConf = priorityConfig[rec.priority as keyof typeof priorityConfig] || priorityConfig.medium
        const Icon = typeConf.icon

        return (
          <div
            key={idx}
            className={cn(
              'p-3 rounded-lg border border-border bg-background-secondary/50 hover:bg-background-secondary transition-colors'
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn('p-2 rounded-lg flex-shrink-0', typeConf.bgColor)}>
                <Icon className={cn('w-4 h-4', typeConf.color)} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      'text-[10px] font-medium uppercase px-1.5 py-0.5 rounded',
                      priorityConf.bgColor,
                      priorityConf.color
                    )}
                  >
                    {priorityConf.label}
                  </span>
                </div>

                <p className="text-sm font-medium text-foreground">{rec.title}</p>
                <p className="text-xs text-foreground-muted mt-1">{rec.description}</p>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1 text-xs text-foreground-muted">
                    <Lightbulb className="w-3 h-3" />
                    <span>{rec.impact}</span>
                  </div>

                  {rec.action && (
                    <button className="flex items-center gap-1 text-xs text-foreground hover:text-foreground/80">
                      {rec.action}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}

      <p className="text-[10px] text-foreground-muted text-center pt-2">
        Generated {data.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : 'just now'}
      </p>
    </div>
  )
}
