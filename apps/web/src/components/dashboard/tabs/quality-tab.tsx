'use client'

import { trpc } from '@/lib/trpc'
import { Shield, Plug } from 'lucide-react'
import Link from 'next/link'

function EmptyState({ hasIntegrations }: { hasIntegrations: boolean }) {
  if (!hasIntegrations) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
          <Plug className="w-8 h-8 text-[#555]" />
        </div>
        <h3 className="text-[16px] font-medium text-[#ededed] mb-2">Connect GitHub to track code quality</h3>
        <p className="text-[13px] text-[#888] text-center max-w-md mb-6">
          NexFlow analyzes PR reviews, test coverage, and code patterns to surface quality metrics.
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
        <Shield className="w-8 h-8 text-[#50e3c2]" />
      </div>
      <h3 className="text-[16px] font-medium text-[#ededed] mb-2">Analyzing code quality</h3>
      <p className="text-[13px] text-[#888] text-center max-w-md">
        NexFlow needs more PR and commit data to calculate quality metrics.
        Keep pushing code and quality insights will appear automatically.
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
    </div>
  )
}

export function QualityTab() {
  const { data: integrations, isLoading } = trpc.integrations.list.useQuery()

  if (isLoading) {
    return <LoadingSkeleton />
  }

  const hasGitHub = integrations?.connected?.some(i => i.type === 'GITHUB') || false

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Code Quality</h2>
        <p className="text-[13px] text-[#888] mt-1">
          PR review metrics, test coverage, and code health indicators
        </p>
      </div>

      <EmptyState hasIntegrations={hasGitHub} />
    </div>
  )
}
