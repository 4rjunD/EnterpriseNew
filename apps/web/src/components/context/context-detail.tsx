'use client'

import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@nexflow/ui/card'
import { Skeleton } from '@nexflow/ui/skeleton'
import { ContextEditor } from './context-editor'
import { MilestoneEditor } from './milestone-editor'
import { GoalsTracker } from './goals-tracker'
import { TimelineChart } from './timeline-chart'
import { SummaryStats } from './summary-stats'
import { Target, FileText, Layers, Clock } from 'lucide-react'

export function ContextDetail() {
  const { data: context, isLoading } = trpc.context.getWithAnalytics.useQuery()

  if (isLoading) {
    return <ContextSkeleton />
  }

  // If no context exists, show the setup flow
  if (!context) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Project Context</h2>
            <p className="text-sm text-foreground-muted">
              Help NexFlow understand what you're building for better insights
            </p>
          </div>
        </div>

        <ContextEditor />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with summary stats */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Project Context</h2>
            <p className="text-sm text-foreground-muted">
              Your project vision and milestones
            </p>
          </div>
        </div>
      </div>

      {/* Summary stats row */}
      <SummaryStats analytics={context.analytics} />

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Description & Goals */}
        <div className="space-y-6 lg:col-span-2">
          {/* Project Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                What We're Building
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContextEditor initialContext={context} />
            </CardContent>
          </Card>

          {/* Timeline Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineChart />
            </CardContent>
          </Card>
        </div>

        {/* Right column - Milestones & Goals */}
        <div className="space-y-6">
          {/* Milestones */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4" />
                Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MilestoneEditor milestones={context.analytics.milestoneStats} />
            </CardContent>
          </Card>

          {/* Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Goals & Tech Stack
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GoalsTracker goals={context.goals} techStack={context.techStack} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ContextSkeleton() {
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
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
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
