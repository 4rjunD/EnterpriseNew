'use client'

import { cn } from '@nexflow/ui/utils'
import { AlertTriangle, Clock, GitPullRequest, Target, Calendar, CheckCircle2 } from 'lucide-react'

interface Alert {
  type: 'overdue_task' | 'stuck_pr' | 'at_risk_milestone' | 'deadline_approaching'
  severity: 'warning' | 'critical'
  title: string
  description: string
  link?: string
  data?: any
}

interface ScheduleAlertsProps {
  alerts: Alert[]
}

const alertConfig = {
  overdue_task: {
    icon: Clock,
    label: 'Overdue Task',
  },
  stuck_pr: {
    icon: GitPullRequest,
    label: 'Stuck PR',
  },
  at_risk_milestone: {
    icon: Target,
    label: 'At Risk',
  },
  deadline_approaching: {
    icon: Calendar,
    label: 'Deadline',
  },
}

export function ScheduleAlerts({ alerts }: ScheduleAlertsProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-foreground-muted">
        <CheckCircle2 className="w-8 h-8 mb-2 text-status-healthy" />
        <p className="text-sm">No schedule alerts</p>
        <p className="text-xs">Everything is on track!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
      {alerts.map((alert, idx) => {
        const config = alertConfig[alert.type]
        const Icon = config.icon

        return (
          <div
            key={idx}
            className={cn(
              'p-3 rounded-lg border transition-colors',
              alert.severity === 'critical'
                ? 'bg-status-critical-light border-status-critical/30'
                : 'bg-status-warning-light border-status-warning/30'
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'p-1.5 rounded-md flex-shrink-0',
                  alert.severity === 'critical' ? 'bg-status-critical-light' : 'bg-status-warning-light'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4',
                    alert.severity === 'critical' ? 'text-status-critical' : 'text-status-warning'
                  )}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-[10px] font-medium uppercase px-1.5 py-0.5 rounded',
                      alert.severity === 'critical'
                        ? 'bg-status-critical-light text-status-critical'
                        : 'bg-status-warning-light text-status-warning'
                    )}
                  >
                    {alert.severity}
                  </span>
                  <span className="text-xs text-foreground-muted">{config.label}</span>
                </div>

                <p className="text-sm font-medium text-foreground mt-1 truncate">{alert.title}</p>
                <p className="text-xs text-foreground-muted mt-0.5">{alert.description}</p>

                {alert.link && (
                  <a
                    href={alert.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex items-center gap-1 mt-2 text-xs',
                      alert.severity === 'critical'
                        ? 'text-status-critical hover:text-status-critical/80'
                        : 'text-status-warning hover:text-status-warning/80'
                    )}
                  >
                    View details
                    <span className="text-[10px]">→</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
