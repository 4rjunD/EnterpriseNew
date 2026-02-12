'use client'

import { trpc } from '@/lib/trpc'
import { cn } from '@nexflow/ui/utils'
import { Skeleton } from '@nexflow/ui/skeleton'
import { format, differenceInDays } from 'date-fns'
import { CheckCircle2, AlertTriangle, Clock, Circle, Calendar } from 'lucide-react'

const statusConfig = {
  not_started: {
    color: 'bg-gray-500',
    icon: Circle,
    iconColor: 'text-gray-400',
  },
  in_progress: {
    color: 'bg-blue-500',
    icon: Clock,
    iconColor: 'text-blue-400',
  },
  completed: {
    color: 'bg-green-500',
    icon: CheckCircle2,
    iconColor: 'text-green-400',
  },
  at_risk: {
    color: 'bg-red-500',
    icon: AlertTriangle,
    iconColor: 'text-red-400',
  },
}

export function TimelineChart() {
  const { data, isLoading } = trpc.context.getTimeline.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!data || data.milestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-foreground-muted">
        <Calendar className="w-8 h-8 mb-2" />
        <p className="text-sm">No milestones to display</p>
        <p className="text-xs">Add milestones to see your project timeline</p>
      </div>
    )
  }

  const { milestones, timeRange } = data
  const now = new Date()

  // Calculate positions
  const getPosition = (date: Date) => {
    if (!timeRange) return 0
    const start = new Date(timeRange.start).getTime()
    const end = new Date(timeRange.end).getTime()
    const current = new Date(date).getTime()
    return Math.max(0, Math.min(100, ((current - start) / (end - start)) * 100))
  }

  const todayPosition = getPosition(now)

  return (
    <div className="space-y-6">
      {/* Timeline header with date range */}
      <div className="flex justify-between text-xs text-foreground-muted">
        <span>{timeRange && format(new Date(timeRange.start), 'MMM d')}</span>
        <span>{timeRange && format(new Date(timeRange.end), 'MMM d, yyyy')}</span>
      </div>

      {/* Timeline track */}
      <div className="relative">
        {/* Background track */}
        <div className="h-2 bg-background-secondary rounded-full" />

        {/* Today marker */}
        <div
          className="absolute top-0 w-0.5 h-6 -mt-2 bg-amber-400 rounded"
          style={{ left: `${todayPosition}%` }}
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-amber-400 whitespace-nowrap">
            Today
          </div>
        </div>

        {/* Milestone markers */}
        {milestones.map((milestone, idx) => {
          const position = getPosition(new Date(milestone.targetDate))
          const status = milestone.status || 'not_started'
          const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_started
          const Icon = config.icon

          return (
            <div
              key={idx}
              className="absolute top-0 -translate-x-1/2 group"
              style={{ left: `${position}%` }}
            >
              {/* Milestone dot */}
              <div
                className={cn(
                  'w-4 h-4 rounded-full border-2 border-background flex items-center justify-center -mt-1 cursor-pointer transition-transform hover:scale-125',
                  config.color
                )}
              />

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-background-secondary border border-border rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn('w-3 h-3', config.iconColor)} />
                    <span className="text-sm font-medium text-foreground">{milestone.name}</span>
                  </div>
                  <div className="text-xs text-foreground-muted">
                    {format(new Date(milestone.targetDate), 'MMM d, yyyy')}
                  </div>
                </div>
                {/* Arrow */}
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-background-secondary border-r border-b border-border rotate-45" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Milestone legend/list */}
      <div className="space-y-2 mt-8">
        {milestones.map((milestone, idx) => {
          const status = milestone.status || 'not_started'
          const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_started
          const Icon = config.icon
          const targetDate = new Date(milestone.targetDate)
          const daysUntil = differenceInDays(targetDate, now)
          const isPast = targetDate < now

          return (
            <div
              key={idx}
              className={cn(
                'flex items-center justify-between p-2 rounded-lg',
                status === 'completed'
                  ? 'bg-green-500/5'
                  : status === 'at_risk' || (isPast && status !== 'completed')
                    ? 'bg-red-500/5'
                    : 'bg-background-secondary/50'
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', config.color)} />
                <span className="text-sm text-foreground">{milestone.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-xs',
                    status === 'completed'
                      ? 'text-green-400'
                      : isPast
                        ? 'text-red-400'
                        : daysUntil <= 7
                          ? 'text-amber-400'
                          : 'text-foreground-muted'
                  )}
                >
                  {status === 'completed'
                    ? 'Done'
                    : isPast
                      ? `${Math.abs(daysUntil)} days ago`
                      : daysUntil === 0
                        ? 'Today'
                        : `in ${daysUntil} days`}
                </span>
                <span className="text-xs text-foreground-muted">
                  {format(targetDate, 'MMM d')}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
