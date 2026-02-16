'use client'

import { cn } from '@nexflow/ui/utils'
import { trpc } from '@/lib/trpc'
import { Brain, Plug, Lightbulb } from 'lucide-react'
import Link from 'next/link'

function EmptyState({ hasIntegrations }: { hasIntegrations: boolean }) {
  if (!hasIntegrations) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
          <Plug className="w-8 h-8 text-[#555]" />
        </div>
        <h3 className="text-[16px] font-medium text-[#ededed] mb-2">Connect integrations for insights</h3>
        <p className="text-[13px] text-[#888] text-center max-w-md mb-6">
          NexFlow analyzes your team's work patterns to surface strategic insights.
          Connect your tools to get started.
        </p>
        <Link
          href="/api/integrations/github/authorize"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#ededed] text-[#000] rounded-md text-[13px] font-medium hover:bg-[#fff] transition-colors"
        >
          Connect GitHub
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-[#a78bfa]/10 flex items-center justify-center mb-4">
        <Brain className="w-8 h-8 text-[#a78bfa]" />
      </div>
      <h3 className="text-[16px] font-medium text-[#ededed] mb-2">Building your insights</h3>
      <p className="text-[13px] text-[#888] text-center max-w-md">
        NexFlow needs more data to generate strategic insights. Keep syncing your integrations
        and insights will appear as patterns emerge.
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
          <div key={i} className="h-32 bg-[#1a1a1a] rounded" />
        ))}
      </div>
    </div>
  )
}

export function InsightsTab() {
  const { data: integrations, isLoading: integrationsLoading } = trpc.integrations.list.useQuery()
  const { data: bottlenecks, isLoading: bottlenecksLoading } = trpc.bottlenecks.list.useQuery({})
  const { data: predictions, isLoading: predictionsLoading } = trpc.predictions.list.useQuery({})

  const isLoading = integrationsLoading || bottlenecksLoading || predictionsLoading

  if (isLoading) {
    return <LoadingSkeleton />
  }

  const hasIntegrations = (integrations?.connected?.length || 0) > 0

  // Combine bottlenecks and predictions for insights
  const activeBottlenecks = bottlenecks?.filter(b => b.status === 'ACTIVE') || []
  const activePredictions = predictions?.filter(p => p.status === 'ACTIVE') || []
  const hasInsights = activeBottlenecks.length > 0 || activePredictions.length > 0

  if (!hasIntegrations || !hasInsights) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Strategic Insights</h2>
              <span className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#a78bfa] border border-[#a78bfa]/30 bg-[#a78bfa]/10 px-2 py-0.5 rounded-full">
                Co-founder Only
              </span>
            </div>
            <p className="text-[13px] text-[#888]">
              Cross-team patterns, productivity signals, and process intelligence
            </p>
          </div>
        </div>
        <EmptyState hasIntegrations={hasIntegrations} />
      </div>
    )
  }

  // Calculate stats from real data
  const criticalCount = activeBottlenecks.filter(b => b.severity === 'CRITICAL').length
  const warningCount = activeBottlenecks.filter(b => b.severity === 'HIGH').length
  const totalInsights = activeBottlenecks.length + activePredictions.length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Strategic Insights</h2>
            <span className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#a78bfa] border border-[#a78bfa]/30 bg-[#a78bfa]/10 px-2 py-0.5 rounded-full">
              Co-founder Only
            </span>
          </div>
          <p className="text-[13px] text-[#888]">
            Cross-team patterns, productivity signals, and process intelligence
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
          <div className="text-[20px] font-mono font-semibold text-[#ededed]">{totalInsights}</div>
          <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Active Insights</div>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
          <div className={cn('text-[20px] font-mono font-semibold', criticalCount > 0 ? 'text-[#ff4444]' : 'text-[#ededed]')}>
            {criticalCount}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Critical</div>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
          <div className={cn('text-[20px] font-mono font-semibold', warningCount > 0 ? 'text-[#f5a623]' : 'text-[#ededed]')}>
            {warningCount}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Warnings</div>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
          <div className="text-[20px] font-mono font-semibold text-[#50e3c2]">{activePredictions.length}</div>
          <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Predictions</div>
        </div>
      </div>

      {/* Insights list */}
      <div className="space-y-3">
        {activeBottlenecks.map(bottleneck => (
          <div
            key={bottleneck.id}
            className={cn(
              'bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4 border-l-2',
              bottleneck.severity === 'CRITICAL' ? 'border-l-[#ff4444]' : 'border-l-[#f5a623]'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[10px] font-mono font-medium uppercase tracking-[0.5px]"
                style={{ color: bottleneck.severity === 'CRITICAL' ? '#ff4444' : '#f5a623' }}
              >
                {bottleneck.type.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-[13px] text-[#ededed] mb-2">{bottleneck.description}</p>
            {bottleneck.suggestedAction && (
              <p className="text-[12px] text-[#d4a574]">
                <span className="text-[#555]">Suggested:</span> {bottleneck.suggestedAction}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Explanation box */}
      <div className="p-4 border border-[#a78bfa]/20 rounded-md">
        <div className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full bg-[#a78bfa] mt-1.5 animate-pulse" />
          <div>
            <h4 className="text-[13px] font-medium text-[#a78bfa] mb-1">About Strategic Insights</h4>
            <p className="text-[12px] text-[#555] leading-[1.5]">
              This tab shows intelligence that only co-founders can see: burnout signals,
              productivity patterns, process inefficiencies, and cross-team trends.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
