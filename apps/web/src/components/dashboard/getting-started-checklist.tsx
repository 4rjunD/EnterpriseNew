'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@nexflow/ui/card'
import { Button } from '@nexflow/ui/button'
import { Skeleton } from '@nexflow/ui/skeleton'
import { Progress } from '@nexflow/ui/progress'
import {
  Check,
  X,
  Building2,
  Link as LinkIcon,
  Users,
  BarChart3,
  Bot,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@nexflow/ui/utils'

const stepIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  workspace: Building2,
  integration: LinkIcon,
  team: Users,
  analysis: BarChart3,
  agents: Bot,
}

const stepCtas: Record<string, { label: string; href: string }> = {
  integration: { label: 'Connect', href: '/integrations' },
  team: { label: 'Invite', href: '/team' },
  analysis: { label: 'Run', href: '/insights' },
  agents: { label: 'Enable', href: '/insights' },
}

export function GettingStartedChecklist() {
  const [dismissed, setDismissed] = useState(false)
  const { data, isLoading } = trpc.onboarding.getSetupProgress.useQuery()

  // Don't show if dismissed or fully complete
  if (dismissed || (data?.isComplete && data.completedCount === data.totalCount)) {
    return null
  }

  if (isLoading) {
    return <ChecklistSkeleton />
  }

  if (!data) {
    return null
  }

  const { steps, completedCount, totalCount, progress } = data

  return (
    <Card className="relative overflow-hidden">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-8 w-8 text-foreground-muted hover:text-foreground"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>

      <CardHeader className="pb-2">
        <CardTitle className="text-base">Getting Started</CardTitle>
        <p className="text-sm text-foreground-muted">
          Complete these steps to unlock NexFlow&apos;s full potential
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground-muted">Progress</span>
            <span className="font-medium text-foreground">
              {completedCount}/{totalCount} complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps */}
        <div className="space-y-1">
          {steps.map((step) => {
            const Icon = stepIcons[step.id] || Check
            const cta = stepCtas[step.id]

            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-center justify-between rounded-lg p-2 transition-colors',
                  step.completed
                    ? 'bg-transparent'
                    : 'bg-background-secondary hover:bg-background-tertiary'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full',
                      step.completed
                        ? 'bg-status-healthy text-white'
                        : 'border border-border bg-background'
                    )}
                  >
                    {step.completed ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5 text-foreground-muted" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-sm',
                      step.completed
                        ? 'text-foreground-muted line-through'
                        : 'text-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                </div>

                {!step.completed && cta && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    asChild
                  >
                    <a href={cta.href}>
                      {cta.label}
                      <ChevronRight className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function ChecklistSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-1 h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-2 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
