'use client'

import { trpc } from '@/lib/trpc'
import { HealthScoreRing } from './health-score-ring'
import { NexFlowActivityFeed } from './nexflow-activity-feed'
import { GettingStartedChecklist } from './getting-started-checklist'
import { AIActivityWidget } from './ai-activity-widget'
import { ImpactBanner } from './impact-banner'
import { SmartPrompt } from '../shared/smart-prompt'
import { Card, CardContent, CardHeader, CardTitle } from '@nexflow/ui/card'
import { Skeleton } from '@nexflow/ui/skeleton'

export function DashboardDetail() {
  const { data: healthData, isLoading: healthLoading } =
    trpc.dashboard.getHealthScore.useQuery()
  const { data: setupProgress } = trpc.onboarding.getSetupProgress.useQuery()
  const { data: smartPrompts } = trpc.dashboard.getSmartPrompts.useQuery()

  // Show checklist if setup is not complete
  const showChecklist = setupProgress && !setupProgress.isComplete

  // Get first relevant smart prompt for dashboard
  const dashboardPrompt = smartPrompts?.find((p) => p.location === 'dashboard')

  if (healthLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Impact Banner - show value proposition */}
      <ImpactBanner />

      {/* Smart Prompt - contextual guidance */}
      {dashboardPrompt && (
        <SmartPrompt
          message={dashboardPrompt.message}
          cta={dashboardPrompt.cta}
          ctaHref={dashboardPrompt.ctaHref}
        />
      )}

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Getting Started + Team Performance */}
        <div className="space-y-6 lg:col-span-2">
          {/* Getting Started Checklist - only if not complete */}
          {showChecklist && <GettingStartedChecklist />}

          <div className="grid gap-6 md:grid-cols-2">
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

            {/* NexFlow Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">NexFlow Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <NexFlowActivityFeed />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right column - AI Activity Widget */}
        <div>
          <AIActivityWidget />
        </div>
      </div>
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
    <div className="space-y-6">
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-48 w-full" />
          <div className="grid gap-6 md:grid-cols-2">
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
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
