'use client'

import { trpc } from '@/lib/trpc'
import { HealthScoreRing } from './health-score-ring'
import { ActivityFeed } from './activity-feed'
import { Card, CardContent, CardHeader, CardTitle } from '@nexflow/ui/card'
import { Skeleton } from '@nexflow/ui/skeleton'

export function DashboardDetail() {
  const { data: healthData, isLoading: healthLoading } =
    trpc.dashboard.getHealthScore.useQuery()
  const { data: activityData, isLoading: activityLoading } =
    trpc.dashboard.getActivityFeed.useQuery({ limit: 10 })

  if (healthLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Performance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <HealthScoreRing
            score={healthData?.healthScore ?? 0}
            trend={healthData?.trends?.healthScoreDelta ?? 0}
          />
          <div className="mt-6 grid w-full gap-4">
            <MetricRow
              label="PR Velocity"
              value={healthData?.metrics?.prVelocity ?? 0}
              max={100}
            />
            <MetricRow
              label="Task Completion"
              value={healthData?.metrics?.taskCompletionRate ?? 0}
              max={100}
            />
            <MetricRow
              label="Blocker Impact"
              value={healthData?.metrics?.blockerImpact ?? 0}
              max={100}
            />
            <MetricRow
              label="Team Capacity"
              value={healthData?.metrics?.teamCapacity ?? 0}
              max={100}
            />
            <MetricRow
              label="Burndown Accuracy"
              value={healthData?.metrics?.burndownAccuracy ?? 0}
              max={100}
            />
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading || !activityData ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <ActivityFeed activities={Array.isArray(activityData) ? activityData : []} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MetricRow({
  label,
  value,
  max,
}: {
  label: string
  value: number
  max: number
}) {
  const percentage = (value / max) * 100
  const getColor = () => {
    if (percentage >= 80) return 'bg-status-healthy'
    if (percentage >= 60) return 'bg-status-warning'
    return 'bg-status-critical'
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-foreground-secondary">{label}</span>
        <span className="font-medium text-foreground">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-background-secondary">
        <div
          className={`h-full rounded-full transition-all ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <Skeleton className="h-40 w-40 rounded-full" />
          <div className="mt-6 w-full space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
