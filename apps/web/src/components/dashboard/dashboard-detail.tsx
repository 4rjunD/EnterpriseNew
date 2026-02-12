'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { HealthScoreRing } from './health-score-ring'
import { NexFlowActivityFeed } from './nexflow-activity-feed'
import { GettingStartedChecklist } from './getting-started-checklist'
import { AIActivityWidget } from './ai-activity-widget'
import { ImpactBanner } from './impact-banner'
import { ProjectContextCard } from './project-context-card'
import { SyncStatusBar } from './sync-status-bar'
import { UnifiedTodosPanel } from './unified-todos-panel'
import { SmartPrompt } from '../shared/smart-prompt'
import { Card, CardContent, CardHeader, CardTitle } from '@nexflow/ui/card'
import { Skeleton } from '@nexflow/ui/skeleton'
import { toast } from '@nexflow/ui/toast'
import { RefreshCw } from 'lucide-react'

export function DashboardDetail() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [hasAutoSynced, setHasAutoSynced] = useState(false)

  const { data: healthData, isLoading: healthLoading } =
    trpc.dashboard.getHealthScore.useQuery()
  const { data: setupProgress } = trpc.onboarding.getSetupProgress.useQuery()
  const { data: smartPrompts } = trpc.dashboard.getSmartPrompts.useQuery()
  const { data: summaryStats } = trpc.dashboard.getSummaryStats.useQuery()

  const runAnalysis = trpc.agents.runAnalysis.useMutation()
  const utils = trpc.useUtils()

  // Auto-sync on first load if no data exists
  useEffect(() => {
    const shouldAutoSync =
      !hasAutoSynced &&
      summaryStats &&
      summaryStats.tasks.total === 0 &&
      summaryStats.integrations.connected > 0

    if (shouldAutoSync) {
      setHasAutoSynced(true)
      handleSync(true)
    }
  }, [summaryStats, hasAutoSynced])

  const handleSync = async (silent = false) => {
    if (isSyncing) return
    setIsSyncing(true)

    try {
      const result = await runAnalysis.mutateAsync()

      if (!silent) {
        if (result.success) {
          toast({ title: 'Sync complete', description: 'Data updated from your integrations' })
        } else {
          toast({
            title: 'Sync partially complete',
            description: result.steps.filter(s => s.status === 'error').map(s => s.detail).join(', '),
            variant: 'destructive'
          })
        }
      }

      // Refresh all data
      utils.dashboard.invalidate()
      utils.bottlenecks.invalidate()
      utils.predictions.invalidate()
      utils.agents.invalidate()
    } catch (error: any) {
      if (!silent) {
        toast({ title: 'Sync failed', description: error?.message, variant: 'destructive' })
      }
    } finally {
      setIsSyncing(false)
    }
  }

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

      {/* Sync status bar - shows integration sync status */}
      <SyncStatusBar />

      {/* Legacy sync indicator (when manually syncing) */}
      {isSyncing && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Syncing data from your integrations...
        </div>
      )}

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

        {/* Right column - Unified Todos + AI Activity Widget */}
        <div className="space-y-6">
          {/* Unified Todos - all tasks across integrations */}
          <UnifiedTodosPanel />

          {/* Project Context - help AI understand what you're building */}
          <ProjectContextCard />

          {/* AI Activity Widget */}
          <AIActivityWidget />

          {/* Manual Sync Button */}
          <button
            onClick={() => handleSync(false)}
            disabled={isSyncing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-background-secondary border border-border rounded-lg text-sm text-foreground-muted hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync from Integrations'}
          </button>
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
