'use client'

import { trpc } from '@/lib/trpc'
import { Users, Plug } from 'lucide-react'
import Link from 'next/link'

function EmptyState({ hasIntegrations }: { hasIntegrations: boolean }) {
  if (!hasIntegrations) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
          <Plug className="w-8 h-8 text-[#555]" />
        </div>
        <h3 className="text-[16px] font-medium text-[#ededed] mb-2">Connect integrations to track clients</h3>
        <p className="text-[13px] text-[#888] text-center max-w-md mb-6">
          Import client projects from Linear or your project management tool to track billable work.
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
        <Users className="w-8 h-8 text-[#0070f3]" />
      </div>
      <h3 className="text-[16px] font-medium text-[#ededed] mb-2">No clients yet</h3>
      <p className="text-[13px] text-[#888] text-center max-w-md">
        Create client projects in your connected tools to track work and utilization by client.
      </p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-[#1a1a1a] rounded w-48" />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-[#1a1a1a] rounded" />
        ))}
      </div>
    </div>
  )
}

export function ClientsTab() {
  const { data: integrations, isLoading } = trpc.integrations.list.useQuery()

  if (isLoading) {
    return <LoadingSkeleton />
  }

  const hasIntegrations = (integrations?.connected?.length || 0) > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Clients</h2>
        <p className="text-[13px] text-[#888] mt-1">
          Track billable work and client project health
        </p>
      </div>

      <EmptyState hasIntegrations={hasIntegrations} />
    </div>
  )
}
