'use client'

import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@nexflow/ui/card'
import { Skeleton } from '@nexflow/ui/skeleton'
import { BurndownChart } from './burndown-chart'
import { MilestoneTracker } from './milestone-tracker'
import { ScheduleAlerts } from './schedule-alerts'
import { AIRecommendations } from './ai-recommendations'
import { TrendingUp, Target, AlertTriangle, Lightbulb } from 'lucide-react'

export function ProgressDetail() {
  const { data: burndown, isLoading: burndownLoading } = trpc.progress.getBurndown.useQuery()
  const { data: milestones, isLoading: milestonesLoading } = trpc.progress.getMilestoneProgress.useQuery()
  const { data: alerts, isLoading: alertsLoading } = trpc.progress.getScheduleAlerts.useQuery()

  const isLoading = burndownLoading || milestonesLoading || alertsLoading

  if (isLoading) {
    return <ProgressSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <TrendingUp className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Progress Tracking</h2>
          <p className="text-sm text-foreground-muted">
            Track your team's progress against planned targets
          </p>
        </div>
      </div>

      {/* Summary stats */}
      {burndown?.summary && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Points"
            value={burndown.summary.totalPoints}
            subValue="in scope"
            color="text-foreground"
          />
          <StatCard
            label="Completed"
            value={burndown.summary.completedPoints}
            subValue={`${burndown.summary.completionPercentage}%`}
            color="text-green-400"
          />
          <StatCard
            label="Remaining"
            value={burndown.summary.remainingPoints}
            subValue="points left"
            color="text-amber-400"
          />
          <StatCard
            label="Avg Velocity"
            value={burndown.summary.averageVelocity}
            subValue="pts/day"
            color="text-blue-400"
          />
        </div>
      )}

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Charts */}
        <div className="space-y-6 lg:col-span-2">
          {/* Burndown Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Burndown Chart
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BurndownChart data={burndown} />
            </CardContent>
          </Card>

          {/* Milestone Tracker */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Milestone Progress
                </CardTitle>
                {milestones && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-400">{milestones.completedCount} done</span>
                    {milestones.atRiskCount > 0 && (
                      <span className="text-red-400">{milestones.atRiskCount} at risk</span>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <MilestoneTracker milestones={milestones?.milestones || []} />
            </CardContent>
          </Card>
        </div>

        {/* Right column - Alerts & Recommendations */}
        <div className="space-y-6">
          {/* Schedule Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Schedule Alerts
                {alerts && alerts.counts.total > 0 && (
                  <span className="ml-auto text-xs font-normal bg-red-500/10 text-red-400 px-2 py-0.5 rounded">
                    {alerts.counts.total}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScheduleAlerts alerts={alerts?.alerts || []} />
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AIRecommendations />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  subValue,
  color,
}: {
  label: string
  value: number
  subValue: string
  color: string
}) {
  return (
    <div className="p-4 rounded-lg border border-border bg-background-secondary/50">
      <p className="text-xs text-foreground-muted">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-foreground-muted">{subValue}</p>
    </div>
  )
}

function ProgressSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
