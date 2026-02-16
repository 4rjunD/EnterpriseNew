'use client'

import { trpc } from '@/lib/trpc'
import { Calendar, Plug } from 'lucide-react'
import Link from 'next/link'

function EmptyState({ hasIntegrations }: { hasIntegrations: boolean }) {
  if (!hasIntegrations) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
          <Plug className="w-8 h-8 text-[#555]" />
        </div>
        <h3 className="text-[16px] font-medium text-[#ededed] mb-2">Connect integrations to see your schedule</h3>
        <p className="text-[13px] text-[#888] text-center max-w-md mb-6">
          NexFlow combines your calendar, tasks, and focus time into one unified view.
        </p>
        <Link
          href="/api/integrations/github/authorize"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#ededed] text-[#000] rounded-md text-[13px] font-medium hover:bg-[#fff] transition-colors"
        >
          Connect Integrations
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-[#0070f3]/10 flex items-center justify-center mb-4">
        <Calendar className="w-8 h-8 text-[#0070f3]" />
      </div>
      <h3 className="text-[16px] font-medium text-[#ededed] mb-2">No scheduled items</h3>
      <p className="text-[13px] text-[#888] text-center max-w-md">
        Your schedule will populate as you create tasks and set due dates in your connected tools.
      </p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-[#1a1a1a] rounded w-48" />
      <div className="h-64 bg-[#1a1a1a] rounded" />
    </div>
  )
}

export function ScheduleTab() {
  const { data: integrations, isLoading } = trpc.integrations.list.useQuery()

  if (isLoading) {
    return <LoadingSkeleton />
  }

  const hasIntegrations = (integrations?.connected?.length || 0) > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Schedule</h2>
        <p className="text-[13px] text-[#888] mt-1">
          Your unified calendar with tasks, meetings, and focus time
        </p>
      </div>

      <EmptyState hasIntegrations={hasIntegrations} />
    </div>
  )
}
