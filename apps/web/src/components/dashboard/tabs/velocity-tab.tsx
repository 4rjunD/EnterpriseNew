'use client'

import { cn } from '@nexflow/ui/utils'
import { trpc } from '@/lib/trpc'
import { TrendingUp, Plug } from 'lucide-react'
import Link from 'next/link'

function EmptyState({ hasIntegrations }: { hasIntegrations: boolean }) {
  if (!hasIntegrations) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
          <Plug className="w-8 h-8 text-[#555]" />
        </div>
        <h3 className="text-[16px] font-medium text-[#ededed] mb-2">Connect GitHub to track velocity</h3>
        <p className="text-[13px] text-[#888] text-center max-w-md mb-6">
          NexFlow calculates DORA metrics from your GitHub data including deploy frequency,
          lead time, and change failure rate.
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
      <div className="w-16 h-16 rounded-full bg-[#50e3c2]/10 flex items-center justify-center mb-4">
        <TrendingUp className="w-8 h-8 text-[#50e3c2]" />
      </div>
      <h3 className="text-[16px] font-medium text-[#ededed] mb-2">Calculating velocity metrics</h3>
      <p className="text-[13px] text-[#888] text-center max-w-md">
        NexFlow needs more commit and deploy data to calculate meaningful velocity metrics.
        Keep pushing code and metrics will appear automatically.
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
      <div className="h-40 bg-[#1a1a1a] rounded" />
    </div>
  )
}

export function VelocityTab() {
  const { data: integrations, isLoading } = trpc.integrations.list.useQuery()

  if (isLoading) {
    return <LoadingSkeleton />
  }

  const hasIntegrations = (integrations?.connected?.length || 0) > 0
  const hasGitHub = integrations?.connected?.some(i => i.type === 'GITHUB') || false

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Velocity</h2>
        <p className="text-[13px] text-[#888] mt-1">
          Engineering performance metrics and DORA insights
        </p>
      </div>

      <EmptyState hasIntegrations={hasGitHub} />

      {/* DORA explanation */}
      <div className="p-4 border border-[#d4a574]/20 rounded-md">
        <div className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full bg-[#d4a574] mt-1.5 animate-pulse" />
          <div>
            <h4 className="text-[13px] font-medium text-[#d4a574] mb-1">About Velocity Metrics</h4>
            <p className="text-[12px] text-[#555] leading-[1.5]">
              These metrics are based on DORA (DevOps Research and Assessment) research.
              Elite teams deploy multiple times per day with less than 1 hour lead time
              and under 15% change failure rate. NexFlow tracks these automatically from
              your GitHub and CI/CD data.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
