'use client'

import { trpc } from '@/lib/trpc'
import { Skeleton } from '@nexflow/ui/skeleton'
import { EmptyState, emptyStateConfigs } from '../shared/empty-state'
import { formatDistanceToNow } from 'date-fns'
import {
  Bot,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@nexflow/ui/utils'

export function NexFlowActivityFeed() {
  const { data: activities, isLoading } = trpc.dashboard.getNexFlowActivity.useQuery({ limit: 8 })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (!activities || activities.length === 0) {
    return <EmptyState config={emptyStateConfigs.activity} className="h-full min-h-[200px]" />
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  )
}

function ActivityItem({
  activity,
}: {
  activity: {
    id: string
    type: 'agent_action' | 'bottleneck' | 'prediction' | 'sync'
    title: string
    description: string
    timestamp: Date
    icon: string
    status?: string
  }
}) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    bot: Bot,
    alert: AlertTriangle,
    trending: TrendingUp,
    refresh: RefreshCw,
  }

  const typeColors: Record<string, { bg: string; text: string }> = {
    agent_action: { bg: 'bg-accent/10', text: 'text-accent' },
    bottleneck: { bg: 'bg-status-warning-light', text: 'text-status-warning' },
    prediction: { bg: 'bg-status-critical-light', text: 'text-status-critical' },
    sync: { bg: 'bg-status-healthy-light', text: 'text-status-healthy' },
  }

  const Icon = icons[activity.icon] || Bot
  const colors = typeColors[activity.type] || typeColors.agent_action

  return (
    <div className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-background-secondary">
      <div
        className={cn(
          'mt-0.5 flex h-7 w-7 items-center justify-center rounded-full',
          colors.bg
        )}
      >
        <Icon className={cn('h-3.5 w-3.5', colors.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {activity.title}
          </span>
          {activity.status && (
            <StatusBadge status={activity.status} />
          )}
        </div>
        <p className="text-xs text-foreground-muted truncate">{activity.description}</p>
        <span className="text-xs text-foreground-muted">
          {(() => {
            try {
              const date = new Date(activity.timestamp)
              if (isNaN(date.getTime())) return 'Unknown'
              return formatDistanceToNow(date, { addSuffix: true })
            } catch {
              return 'Unknown'
            }
          })()}
        </span>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    ACTIVE: 'bg-status-warning-light text-status-warning',
    RESOLVED: 'bg-status-healthy-light text-status-healthy',
    EXECUTED: 'bg-status-healthy-light text-status-healthy',
    PENDING: 'bg-status-warning-light text-status-warning',
    APPROVED: 'bg-accent/10 text-accent',
  }

  const style = statusStyles[status] || 'bg-background-secondary text-foreground-muted'

  return (
    <span
      className={cn(
        'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase',
        style
      )}
    >
      {status.toLowerCase()}
    </span>
  )
}
