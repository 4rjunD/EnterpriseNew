'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@nexflow/ui/button'
import { Skeleton } from '@nexflow/ui/skeleton'
import { Sparkles, X, RefreshCw, MessageSquare, CheckCircle2 } from 'lucide-react'
import { cn } from '@nexflow/ui/utils'

export function ImpactBanner() {
  const [dismissed, setDismissed] = useState(false)
  const { data: stats, isLoading } = trpc.agents.getStats.useQuery()

  // Don't show if dismissed or no meaningful activity
  if (dismissed) {
    return null
  }

  if (isLoading) {
    return <BannerSkeleton />
  }

  // Only show if there's actual impact to show
  const hoursSaved = stats?.hoursSaved ?? 0
  const actionsThisWeek = stats?.actionsThisWeek ?? 0
  const byAgent = stats?.byAgent ?? {}
  const reassignments = byAgent['TASK_REASSIGNER'] ?? 0
  const nudges = byAgent['NUDGE_SENDER'] ?? 0

  if (hoursSaved === 0 && actionsThisWeek === 0) {
    return null
  }

  return (
    <div className="relative flex items-center justify-between gap-4 rounded-lg border border-accent/20 bg-gradient-to-r from-accent/5 to-accent/10 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        <div className="flex items-center gap-6">
          <p className="text-sm font-medium text-foreground">
            NexFlow saved your team ~{hoursSaved} hours this week
          </p>
          <div className="hidden items-center gap-4 text-xs text-foreground-muted md:flex">
            {reassignments > 0 && (
              <StatPill icon={RefreshCw} value={reassignments} label="reassigned" />
            )}
            {nudges > 0 && (
              <StatPill icon={MessageSquare} value={nudges} label="nudges sent" />
            )}
            {actionsThisWeek > 0 && (
              <StatPill icon={CheckCircle2} value={actionsThisWeek} label="actions" />
            )}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-foreground-muted hover:text-foreground"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

function StatPill({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: number
  label: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" />
      <span>
        <span className="font-medium text-foreground">{value}</span> {label}
      </span>
    </div>
  )
}

function BannerSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-background-secondary px-4 py-3">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-4 w-64" />
    </div>
  )
}
