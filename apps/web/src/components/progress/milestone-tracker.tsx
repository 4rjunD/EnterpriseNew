'use client'

import { cn } from '@nexflow/ui/utils'
import { format } from 'date-fns'
import { CheckCircle2, AlertTriangle, Clock, Circle, Calendar } from 'lucide-react'

interface Milestone {
  name: string
  targetDate: Date
  status?: string
  daysRemaining: number
  isPast: boolean
  isCompleted: boolean
  isAtRisk: boolean
  isOnTrack: boolean
}

interface MilestoneTrackerProps {
  milestones: Milestone[]
}

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    color: 'text-status-healthy',
    bgColor: 'bg-status-healthy-light',
    borderColor: 'border-status-healthy/30',
    label: 'Completed',
  },
  at_risk: {
    icon: AlertTriangle,
    color: 'text-status-critical',
    bgColor: 'bg-status-critical-light',
    borderColor: 'border-status-critical/30',
    label: 'At Risk',
  },
  in_progress: {
    icon: Clock,
    color: 'text-foreground',
    bgColor: 'bg-accent-light',
    borderColor: 'border-foreground/30',
    label: 'In Progress',
  },
  not_started: {
    icon: Circle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    label: 'Not Started',
  },
}

export function MilestoneTracker({ milestones }: MilestoneTrackerProps) {
  if (milestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-foreground-muted">
        <Calendar className="w-8 h-8 mb-2" />
        <p className="text-sm">No milestones defined</p>
        <p className="text-xs">Add milestones in the Context tab</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {milestones.map((milestone, idx) => {
        const status = milestone.isCompleted
          ? 'completed'
          : milestone.isAtRisk
            ? 'at_risk'
            : milestone.status || 'not_started'
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_started
        const StatusIcon = config.icon

        return (
          <div
            key={idx}
            className={cn(
              'flex items-center gap-4 p-3 rounded-lg border transition-colors',
              config.bgColor,
              config.borderColor
            )}
          >
            {/* Status icon */}
            <div className={cn('p-2 rounded-full', config.bgColor)}>
              <StatusIcon className={cn('w-4 h-4', config.color)} />
            </div>

            {/* Milestone info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm text-foreground truncate">
                  {milestone.name}
                </p>
                <span className={cn('text-xs px-2 py-0.5 rounded', config.bgColor, config.color)}>
                  {config.label}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-foreground-muted">
                  {format(new Date(milestone.targetDate), 'MMM d, yyyy')}
                </span>
                <span className="text-foreground-muted">•</span>
                <span
                  className={cn(
                    'text-xs',
                    milestone.isCompleted
                      ? 'text-status-healthy'
                      : milestone.isPast
                        ? 'text-status-critical'
                        : milestone.daysRemaining <= 7
                          ? 'text-status-warning'
                          : 'text-foreground-muted'
                  )}
                >
                  {milestone.isCompleted
                    ? 'Done'
                    : milestone.isPast
                      ? `${Math.abs(milestone.daysRemaining)} days overdue`
                      : milestone.daysRemaining === 0
                        ? 'Due today'
                        : `${milestone.daysRemaining} days left`}
                </span>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="flex-shrink-0 w-24">
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    milestone.isCompleted
                      ? 'bg-status-healthy w-full'
                      : milestone.isAtRisk
                        ? 'bg-status-critical'
                        : status === 'in_progress'
                          ? 'bg-foreground'
                          : 'bg-gray-500'
                  )}
                  style={{
                    width: milestone.isCompleted
                      ? '100%'
                      : status === 'in_progress'
                        ? '50%'
                        : status === 'not_started'
                          ? '0%'
                          : '30%',
                  }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
