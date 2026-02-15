'use client'

import { cn } from '@nexflow/ui/utils'
import { trpc } from '@/lib/trpc'
import { AlertTriangle, CheckCircle2, AlertCircle, Info, Shield, Plug } from 'lucide-react'
import Link from 'next/link'

function EmptyState({ hasIntegrations }: { hasIntegrations: boolean }) {
  if (!hasIntegrations) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
          <Plug className="w-8 h-8 text-[#555]" />
        </div>
        <h3 className="text-[16px] font-medium text-[#ededed] mb-2">Connect integrations to detect risks</h3>
        <p className="text-[13px] text-[#888] text-center max-w-md mb-6">
          NexFlow analyzes your codebase and project data to identify potential risks and bottlenecks.
          Connect GitHub or Linear to get started.
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
      <h3 className="text-[16px] font-medium text-[#ededed] mb-2">No risks detected</h3>
      <p className="text-[13px] text-[#888] text-center max-w-md">
        Your project looks healthy! NexFlow will alert you when potential risks are identified.
      </p>
    </div>
  )
}

function RiskCard({ risk }: {
  risk: {
    id: string
    type: string
    severity: string
    description: string
    impact?: string | null
    suggestedAction?: string | null
    status: string
  }
}) {
  const severityConfig = {
    CRITICAL: { icon: AlertTriangle, color: '#ff4444', bg: 'rgba(255,68,68,0.1)', label: 'Critical' },
    HIGH: { icon: AlertCircle, color: '#f5a623', bg: 'rgba(245,166,35,0.1)', label: 'High' },
    MEDIUM: { icon: Info, color: '#888', bg: 'rgba(136,136,136,0.1)', label: 'Medium' },
    LOW: { icon: Info, color: '#555', bg: 'transparent', label: 'Low' },
  }[risk.severity] || { icon: Info, color: '#555', bg: 'transparent', label: risk.severity }

  const Icon = severityConfig.icon

  return (
    <div
      className={cn(
        'p-4 border border-[#1a1a1a] rounded-md',
        risk.severity === 'CRITICAL' && 'border-l-2 border-l-[#ff4444] bg-[#ff4444]/5'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: severityConfig.bg }}
        >
          <Icon className="w-4 h-4" style={{ color: severityConfig.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-mono font-medium uppercase tracking-[0.5px] px-1.5 py-0.5 rounded"
              style={{ color: severityConfig.color, backgroundColor: severityConfig.bg }}
            >
              {severityConfig.label}
            </span>
            <span className="text-[10px] font-mono text-[#555] uppercase">{risk.type.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-[13px] text-[#ededed] mb-2">{risk.description}</p>
          {risk.impact && (
            <p className="text-[12px] text-[#888] mb-2">
              <span className="text-[#555]">Impact:</span> {risk.impact}
            </p>
          )}
          {risk.suggestedAction && (
            <p className="text-[12px] text-[#d4a574]">
              <span className="text-[#555]">Suggested:</span> {risk.suggestedAction}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-[#1a1a1a] rounded w-48" />
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 bg-[#1a1a1a] rounded" />
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

export function RisksTab() {
  const { data: integrations, isLoading: integrationsLoading } = trpc.integrations.list.useQuery()
  const { data: bottlenecks, isLoading: bottlenecksLoading } = trpc.bottlenecks.list.useQuery({})

  const isLoading = integrationsLoading || bottlenecksLoading

  if (isLoading) {
    return <LoadingSkeleton />
  }

  const hasIntegrations = (integrations?.connected?.length || 0) > 0
  const risks = bottlenecks || []
  const activeRisks = risks.filter(r => r.status === 'ACTIVE')

  // Calculate stats
  const criticalCount = activeRisks.filter(r => r.severity === 'CRITICAL').length
  const highCount = activeRisks.filter(r => r.severity === 'HIGH').length
  const mediumCount = activeRisks.filter(r => r.severity === 'MEDIUM').length
  const resolvedCount = risks.filter(r => r.status === 'RESOLVED').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Risks & Bottlenecks</h2>
        <p className="text-[13px] text-[#888] mt-1">
          AI-detected issues that may impact delivery
        </p>
      </div>

      {/* Stats */}
      {hasIntegrations && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
            <div className={cn(
              'text-[20px] font-mono font-semibold',
              criticalCount > 0 ? 'text-[#ff4444]' : 'text-[#ededed]'
            )}>
              {criticalCount}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Critical</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
            <div className={cn(
              'text-[20px] font-mono font-semibold',
              highCount > 0 ? 'text-[#f5a623]' : 'text-[#ededed]'
            )}>
              {highCount}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">High</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
            <div className="text-[20px] font-mono font-semibold text-[#ededed]">{mediumCount}</div>
            <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Medium</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
            <div className="text-[20px] font-mono font-semibold text-[#50e3c2]">{resolvedCount}</div>
            <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Resolved</div>
          </div>
        </div>
      )}

      {/* Risks list or empty state */}
      {!hasIntegrations || activeRisks.length === 0 ? (
        <EmptyState hasIntegrations={hasIntegrations} />
      ) : (
        <div className="space-y-3">
          {activeRisks
            .sort((a, b) => {
              const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
              return (order[a.severity as keyof typeof order] ?? 3) - (order[b.severity as keyof typeof order] ?? 3)
            })
            .map(risk => (
              <RiskCard key={risk.id} risk={risk} />
            ))}
        </div>
      )}
    </div>
  )
}
