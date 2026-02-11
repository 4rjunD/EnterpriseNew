'use client'

import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@nexflow/ui/card'
import { Badge } from '@nexflow/ui/badge'
import { Skeleton } from '@nexflow/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import {
  Bot,
  Clock,
  Zap,
  AlertCircle,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@nexflow/ui/utils'

export function AIActivityWidget() {
  const { data: stats, isLoading: statsLoading } = trpc.agents.getStats.useQuery()
  const { data: activityFeed, isLoading: feedLoading } = trpc.agents.getActivityFeed.useQuery({ limit: 5 })
  const { data: pendingActions } = trpc.agents.getPendingActions.useQuery()

  const isLoading = statsLoading || feedLoading

  if (isLoading) {
    return <AIActivitySkeleton />
  }

  const pendingCount = pendingActions?.length ?? 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">NexFlow AI</CardTitle>
        <Badge variant="secondary" className="gap-1 font-normal">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-healthy opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-status-healthy" />
          </span>
          LIVE
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Impact Stats */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
            This Week&apos;s Impact
          </p>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <StatBox
              icon={Clock}
              value={`${stats?.hoursSaved ?? 0}`}
              label="hrs saved"
              color="text-accent"
            />
            <StatBox
              icon={Zap}
              value={`${stats?.actionsThisWeek ?? 0}`}
              label="actions"
              color="text-status-healthy"
            />
            <StatBox
              icon={AlertCircle}
              value={`${pendingCount}`}
              label="pending"
              color={pendingCount > 0 ? 'text-status-warning' : 'text-foreground-muted'}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
              Recent Activity
            </p>
            <a
              href="/insights"
              className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
          <div className="mt-2 space-y-2">
            {!activityFeed || activityFeed.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-background-secondary p-3 text-sm text-foreground-muted">
                <Bot className="h-4 w-4" />
                <span>No recent AI activity</span>
              </div>
            ) : (
              activityFeed.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            )}
          </div>
        </div>

        {/* Pending Actions Alert */}
        {pendingCount > 0 && (
          <a
            href="/insights"
            className="flex items-center justify-between rounded-lg bg-status-warning-light p-3 transition-colors hover:bg-status-warning/20"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-status-warning" />
              <span className="text-sm font-medium text-status-warning">
                {pendingCount} action{pendingCount !== 1 ? 's' : ''} awaiting approval
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-status-warning" />
          </a>
        )}
      </CardContent>
    </Card>
  )
}

function StatBox({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: string
  label: string
  color: string
}) {
  return (
    <div className="rounded-lg bg-background-secondary p-3 text-center">
      <div className={cn('mx-auto mb-1 h-4 w-4', color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-lg font-semibold text-foreground">{value}</div>
      <div className="text-xs text-foreground-muted">{label}</div>
    </div>
  )
}

function ActivityItem({
  activity,
}: {
  activity: {
    id: string
    agentType: string
    action: string
    status: string
    description: string
    targetUser?: string | null
    createdAt: Date
    executedAt?: Date | null
  }
}) {
  const agentIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    TASK_REASSIGNER: RefreshCw,
    NUDGE_SENDER: Zap,
    SCOPE_ADJUSTER: AlertCircle,
  }
  const Icon = agentIcons[activity.agentType] || Bot

  const statusColors: Record<string, string> = {
    EXECUTED: 'text-status-healthy',
    PENDING: 'text-status-warning',
    APPROVED: 'text-accent',
    REJECTED: 'text-status-critical',
  }

  return (
    <div className="flex items-start gap-2 rounded-lg p-2 transition-colors hover:bg-background-secondary">
      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent/10">
        <Icon className="h-3.5 w-3.5 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm text-foreground">{activity.description}</p>
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <span className={statusColors[activity.status]}>{activity.status.toLowerCase()}</span>
          <span>•</span>
          <span>
            {(() => {
              try {
                const date = new Date(activity.executedAt || activity.createdAt)
                if (isNaN(date.getTime())) return 'Unknown'
                return formatDistanceToNow(date, { addSuffix: true })
              } catch {
                return 'Unknown'
              }
            })()}
          </span>
        </div>
      </div>
    </div>
  )
}

function AIActivitySkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-12" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Skeleton className="h-3 w-28" />
          <div className="mt-2 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="h-3 w-28" />
          <div className="mt-2 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
