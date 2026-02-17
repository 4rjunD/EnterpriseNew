'use client'

import { cn } from '@nexflow/ui/utils'
import { trpc } from '@/lib/trpc'
import { Flag, Plug, Calendar, CheckCircle2, Clock, Circle } from 'lucide-react'
import Link from 'next/link'
import { type TeamType } from '@/lib/theme'

interface Milestone {
  name: string
  description?: string
  targetDate: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  progress: number
}

function EmptyState({ hasIntegrations }: { hasIntegrations: boolean }) {
  if (!hasIntegrations) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
          <Plug className="w-8 h-8 text-[#555]" />
        </div>
        <h3 className="text-[16px] font-medium text-[#ededed] mb-2">Connect integrations to track milestones</h3>
        <p className="text-[13px] text-[#888] text-center max-w-md mb-6">
          Import milestones from Linear, GitHub, or Jira to track your key deliverables.
        </p>
        <Link
          href="/api/integrations/linear/authorize"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#ededed] text-[#000] rounded-md text-[13px] font-medium hover:bg-[#fff] transition-colors"
        >
          Connect Linear
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-[#0070f3]/10 flex items-center justify-center mb-4">
        <Flag className="w-8 h-8 text-[#0070f3]" />
      </div>
      <h3 className="text-[16px] font-medium text-[#ededed] mb-2">No milestones yet</h3>
      <p className="text-[13px] text-[#888] text-center max-w-md">
        Click <strong>Refresh</strong> in the header to generate milestones, or add them in the <strong>Context</strong> tab.
      </p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-[#1a1a1a] rounded w-48" />
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 bg-[#1a1a1a] rounded" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-[#1a1a1a] rounded" />
        ))}
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: Milestone['status'] }) {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle2 className="w-4 h-4 text-[#50e3c2]" />
    case 'IN_PROGRESS':
      return <Clock className="w-4 h-4 text-[#f5a623]" />
    default:
      return <Circle className="w-4 h-4 text-[#555]" />
  }
}

function MilestoneCard({ milestone }: { milestone: Milestone }) {
  const statusColors = {
    NOT_STARTED: { bg: 'bg-[#333]/30', text: 'text-[#888]', label: 'Not Started' },
    IN_PROGRESS: { bg: 'bg-[#f5a623]/10', text: 'text-[#f5a623]', label: 'In Progress' },
    COMPLETED: { bg: 'bg-[#50e3c2]/10', text: 'text-[#50e3c2]', label: 'Completed' },
  }

  const style = statusColors[milestone.status]
  const targetDate = new Date(milestone.targetDate)
  const isOverdue = milestone.status !== 'COMPLETED' && targetDate < new Date()
  const daysLeft = Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <div className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <StatusIcon status={milestone.status} />
          <h3 className="text-[14px] font-medium text-[#ededed]">{milestone.name}</h3>
        </div>
        <span className={cn('px-2 py-0.5 rounded text-[11px] font-medium', style.bg, style.text)}>
          {style.label}
        </span>
      </div>

      {milestone.description && (
        <p className="text-[12px] text-[#888] mb-3 ml-6.5">{milestone.description}</p>
      )}

      <div className="flex items-center gap-4 ml-6.5">
        {/* Progress bar */}
        <div className="flex-1">
          <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                milestone.status === 'COMPLETED' ? 'bg-[#50e3c2]' :
                milestone.progress > 50 ? 'bg-[#f5a623]' : 'bg-[#555]'
              )}
              style={{ width: `${milestone.progress}%` }}
            />
          </div>
        </div>
        <span className="text-[12px] font-mono text-[#555] w-8 text-right">{milestone.progress}%</span>

        {/* Date */}
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#555]" />
          <span className={cn(
            'text-[12px]',
            isOverdue ? 'text-[#ff4444]' : 'text-[#888]'
          )}>
            {isOverdue
              ? `${Math.abs(daysLeft)}d overdue`
              : milestone.status === 'COMPLETED'
                ? 'Done'
                : `${daysLeft}d left`
            }
          </span>
        </div>
      </div>
    </div>
  )
}

interface MilestonesTabProps {
  teamType?: TeamType
}

export function MilestonesTab({ teamType = 'launch' }: MilestonesTabProps) {
  const { data: context, isLoading: contextLoading } = trpc.onboarding.getProjectContext.useQuery()
  const { data: integrations, isLoading: integrationsLoading } = trpc.integrations.list.useQuery()

  if (contextLoading || integrationsLoading) {
    return <LoadingSkeleton />
  }

  const milestones = (context?.milestones as Milestone[] | null) || []
  const hasIntegrations = (integrations?.connected?.length || 0) > 0

  if (milestones.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Milestones</h2>
          <p className="text-[13px] text-[#888] mt-1">
            Track progress towards your key deliverables
          </p>
        </div>
        <EmptyState hasIntegrations={hasIntegrations} />
      </div>
    )
  }

  // Summary stats
  const completed = milestones.filter(m => m.status === 'COMPLETED').length
  const inProgress = milestones.filter(m => m.status === 'IN_PROGRESS').length
  const notStarted = milestones.filter(m => m.status === 'NOT_STARTED').length
  const overallProgress = milestones.length > 0
    ? Math.round(milestones.reduce((sum, m) => sum + m.progress, 0) / milestones.length)
    : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Milestones</h2>
        <p className="text-[13px] text-[#888] mt-1">
          Track progress towards your key deliverables
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
          <p className="text-[11px] text-[#555] uppercase tracking-wide">Overall</p>
          <p className="text-[24px] font-semibold text-[#ededed] mt-1">{overallProgress}%</p>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
          <p className="text-[11px] text-[#555] uppercase tracking-wide">Completed</p>
          <p className="text-[24px] font-semibold text-[#50e3c2] mt-1">{completed}</p>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
          <p className="text-[11px] text-[#555] uppercase tracking-wide">In Progress</p>
          <p className="text-[24px] font-semibold text-[#f5a623] mt-1">{inProgress}</p>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
          <p className="text-[11px] text-[#555] uppercase tracking-wide">Not Started</p>
          <p className="text-[24px] font-semibold text-[#888] mt-1">{notStarted}</p>
        </div>
      </div>

      {/* Milestone list */}
      <div className="space-y-3">
        {milestones.map((milestone, index) => (
          <MilestoneCard key={index} milestone={milestone} />
        ))}
      </div>
    </div>
  )
}
