'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'
import { trpc } from '@/lib/trpc'
import { AlertTriangle, AlertCircle, Info, Shield, ChevronDown, ChevronRight } from 'lucide-react'

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-[#50e3c2]/10 flex items-center justify-center mb-4">
        <Shield className="w-8 h-8 text-[#50e3c2]" />
      </div>
      <h3 className="text-[16px] font-medium text-[#ededed] mb-2">No risks detected</h3>
      <p className="text-[13px] text-[#888] text-center max-w-md">
        Click <strong>Refresh</strong> in the header to analyze your project for risks and bottlenecks.
      </p>
    </div>
  )
}

const SEVERITY_CONFIG = {
  CRITICAL: { icon: AlertTriangle, color: '#ff4444', bg: 'rgba(255,68,68,0.1)', label: 'Critical' },
  HIGH: { icon: AlertCircle, color: '#f5a623', bg: 'rgba(245,166,35,0.1)', label: 'High' },
  MEDIUM: { icon: Info, color: '#888', bg: 'rgba(136,136,136,0.1)', label: 'Medium' },
  LOW: { icon: Info, color: '#555', bg: 'rgba(85,85,85,0.05)', label: 'Low' },
}

const TYPE_LABELS: Record<string, string> = {
  STUCK_PR: 'Stuck PR',
  STALE_TASK: 'Stale Task',
  DEPENDENCY_BLOCK: 'Dependency Block',
  REVIEW_DELAY: 'Review Delay',
  CI_FAILURE: 'CI Failure',
}

function RiskCard({ risk }: {
  risk: {
    id: string
    type: string
    severity: string
    title: string
    description: string | null
    impact: string | null
    status: string
    project?: { id: string; name: string; key: string } | null
    detectedAt: string | Date
    impactScore: number
  }
}) {
  const [expanded, setExpanded] = useState(false)
  const config = SEVERITY_CONFIG[risk.severity as keyof typeof SEVERITY_CONFIG]
    || SEVERITY_CONFIG.MEDIUM
  const Icon = config.icon

  const detectedDate = new Date(risk.detectedAt)
  const daysAgo = Math.floor((Date.now() - detectedDate.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div
      className={cn(
        'bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg hover:border-[#252525] transition-colors cursor-pointer',
        risk.severity === 'CRITICAL' && 'border-l-2 border-l-[#ff4444]',
        risk.severity === 'HIGH' && 'border-l-2 border-l-[#f5a623]'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: config.bg }}
          >
            <Icon className="w-4 h-4" style={{ color: config.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] font-mono font-medium uppercase tracking-[0.5px] px-1.5 py-0.5 rounded"
                style={{ color: config.color, backgroundColor: config.bg }}
              >
                {config.label}
              </span>
              <span className="text-[10px] font-mono text-[#555] uppercase">
                {TYPE_LABELS[risk.type] || risk.type.replace(/_/g, ' ')}
              </span>
              {risk.project && (
                <>
                  <span className="text-[#333]">·</span>
                  <span className="text-[10px] font-mono text-[#555]">{risk.project.key}</span>
                </>
              )}
            </div>
            <p className="text-[13px] text-[#ededed]">{risk.title}</p>
            {!expanded && risk.description && (
              <p className="text-[12px] text-[#888] mt-1 line-clamp-1">{risk.description}</p>
            )}
          </div>
          <div className="flex-shrink-0 text-[#555]">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#1a1a1a]">
          <div className="pt-3 space-y-3 ml-11">
            {risk.description && (
              <p className="text-[12px] text-[#888]">{risk.description}</p>
            )}

            <div className="flex flex-wrap gap-3">
              <div className="bg-[#111] px-3 py-1.5 rounded">
                <span className="text-[10px] text-[#555] block">Impact Score</span>
                <span className={cn(
                  'text-[13px] font-mono',
                  risk.impactScore >= 70 ? 'text-[#ff4444]' : risk.impactScore >= 40 ? 'text-[#f5a623]' : 'text-[#888]'
                )}>{risk.impactScore}/100</span>
              </div>
              <div className="bg-[#111] px-3 py-1.5 rounded">
                <span className="text-[10px] text-[#555] block">Detected</span>
                <span className="text-[13px] font-mono text-[#888]">
                  {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
                </span>
              </div>
            </div>

            {risk.impact && (
              <div className="bg-[#f5a623]/5 border border-[#f5a623]/20 rounded p-3">
                <span className="text-[10px] text-[#f5a623] uppercase tracking-wide block mb-1">Impact</span>
                <p className="text-[12px] text-[#f5a623]">{risk.impact}</p>
              </div>
            )}
          </div>
        </div>
      )}
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
          <div key={i} className="h-24 bg-[#1a1a1a] rounded" />
        ))}
      </div>
    </div>
  )
}

export function RisksTab() {
  const { data: bottlenecks, isLoading } = trpc.bottlenecks.list.useQuery({})

  if (isLoading) {
    return <LoadingSkeleton />
  }

  const risks = bottlenecks || []
  const activeRisks = risks.filter(r => r.status === 'ACTIVE')
  const resolvedCount = risks.filter(r => r.status === 'RESOLVED').length

  // Calculate stats
  const criticalCount = activeRisks.filter(r => r.severity === 'CRITICAL').length
  const highCount = activeRisks.filter(r => r.severity === 'HIGH').length
  const mediumCount = activeRisks.filter(r => r.severity === 'MEDIUM').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Risks & Bottlenecks</h2>
        <p className="text-[13px] text-[#888] mt-1">
          AI-detected issues that may impact delivery
        </p>
      </div>

      {activeRisks.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
              <div className={cn(
                'text-[20px] font-mono font-semibold',
                criticalCount > 0 ? 'text-[#ff4444]' : 'text-[#ededed]'
              )}>
                {criticalCount}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Critical</div>
            </div>
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
              <div className={cn(
                'text-[20px] font-mono font-semibold',
                highCount > 0 ? 'text-[#f5a623]' : 'text-[#ededed]'
              )}>
                {highCount}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">High</div>
            </div>
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
              <div className="text-[20px] font-mono font-semibold text-[#ededed]">{mediumCount}</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Medium</div>
            </div>
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
              <div className="text-[20px] font-mono font-semibold text-[#50e3c2]">{resolvedCount}</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Resolved</div>
            </div>
          </div>

          {/* Risks list */}
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
        </>
      )}
    </div>
  )
}
