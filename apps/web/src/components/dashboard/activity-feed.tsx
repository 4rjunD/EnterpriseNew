'use client'

import { formatDistanceToNow } from 'date-fns'
import {
  GitPullRequest,
  CheckSquare,
  AlertTriangle,
  User,
} from 'lucide-react'
import { cn } from '@nexflow/ui/utils'

interface Activity {
  id: string
  type: 'task' | 'pr' | 'bottleneck'
  action: string
  title: string
  user: string
  timestamp: Date
}

interface ActivityFeedProps {
  activities: Activity[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  // Defensive check: ensure activities is a valid array
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-foreground-muted">
        No recent activity
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  )
}

function ActivityItem({ activity }: { activity: Activity }) {
  const icons = {
    task: CheckSquare,
    pr: GitPullRequest,
    bottleneck: AlertTriangle,
  }
  const Icon = icons[activity.type]

  const colors = {
    task: 'text-accent',
    pr: 'text-status-healthy',
    bottleneck: 'text-status-warning',
  }

  const actionLabels = {
    completed: 'completed',
    updated: 'updated',
    merged: 'merged',
    detected: 'detected',
  }

  return (
    <div className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-background-secondary">
      <div
        className={cn(
          'mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-background-secondary',
          colors[activity.type]
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-medium text-foreground">
            {activity.title}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <User className="h-3 w-3" />
          <span>{activity.user}</span>
          <span>•</span>
          <span>{actionLabels[activity.action as keyof typeof actionLabels]}</span>
          <span>•</span>
          <span>
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
    </div>
  )
}
