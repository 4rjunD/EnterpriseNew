'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'
import { INTEGRATIONS, type TeamType } from '@/lib/theme'

// Severity levels
const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: '#ff4444' },
  warning: { label: 'Warning', color: '#f5a623' },
  info: { label: 'Info', color: '#0070f3' },
  resolved: { label: 'Resolved', color: '#50e3c2' },
}

type Severity = keyof typeof SEVERITY_CONFIG

// Risk type
interface Risk {
  id: string
  severity: Severity
  title: string
  description: string
  impact: string
  sources: string[]
  detectedAt: Date
  affectedItems: Array<{ type: 'task' | 'pr' | 'milestone' | 'user'; label: string }>
  mitigation?: string
  status: 'active' | 'monitoring' | 'resolved'
}

// Mock risks
const mockRisks: Risk[] = [
  {
    id: '1',
    severity: 'critical',
    title: 'MVP deadline at risk',
    description: 'Current velocity indicates March 15 deadline will be missed by 3-5 days.',
    impact: '73% probability of slip',
    sources: ['linear', 'github'],
    detectedAt: new Date(Date.now() - 2 * 3600000),
    affectedItems: [
      { type: 'milestone', label: 'MVP Launch' },
      { type: 'task', label: '14 tasks remaining' },
    ],
    mitigation: 'Cut offline mode feature to save 4 days',
    status: 'active',
  },
  {
    id: '2',
    severity: 'critical',
    title: 'Review bottleneck forming',
    description: '5 PRs waiting for review averaging 2.3 days wait time.',
    impact: 'Blocking 3 developers',
    sources: ['github'],
    detectedAt: new Date(Date.now() - 4 * 3600000),
    affectedItems: [
      { type: 'user', label: 'Alex Chen (reviewer)' },
      { type: 'pr', label: '#142, #145, #148, #151, #154' },
    ],
    mitigation: 'Redistribute reviews to Jordan and Sam',
    status: 'active',
  },
  {
    id: '3',
    severity: 'warning',
    title: 'Scope creep in onboarding epic',
    description: '6 new tasks added since sprint start. Original: 18, Current: 24.',
    impact: '34% scope increase',
    sources: ['linear'],
    detectedAt: new Date(Date.now() - 24 * 3600000),
    affectedItems: [
      { type: 'task', label: 'ONB-12, ONB-18, ONB-22' },
    ],
    mitigation: 'Re-scope with stakeholder or defer to next sprint',
    status: 'monitoring',
  },
  {
    id: '4',
    severity: 'warning',
    title: 'Test coverage declining',
    description: 'Coverage dropped from 78% to 71% over the last sprint.',
    impact: 'Increased regression risk',
    sources: ['github'],
    detectedAt: new Date(Date.now() - 48 * 3600000),
    affectedItems: [
      { type: 'task', label: 'Payment module (45% coverage)' },
    ],
    mitigation: 'Schedule a testing sprint or add coverage gate',
    status: 'monitoring',
  },
  {
    id: '5',
    severity: 'info',
    title: 'Jordan showing load imbalance',
    description: 'Workload 35% higher than team average this sprint.',
    impact: 'Potential burnout risk',
    sources: ['linear', 'slack'],
    detectedAt: new Date(Date.now() - 72 * 3600000),
    affectedItems: [
      { type: 'user', label: 'Jordan Lee' },
    ],
    mitigation: 'Reassign 2 tasks to Sam who has capacity',
    status: 'monitoring',
  },
]

// Get integration icon
function getIntegrationIcon(id: string): string {
  return INTEGRATIONS.find(i => i.id === id)?.icon || '?'
}

// Format time ago
function timeAgo(date: Date): string {
  const hours = Math.floor((new Date().getTime() - date.getTime()) / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// Risk card - clean
function RiskCard({
  risk,
  onResolve,
  onMonitor,
}: {
  risk: Risk
  onResolve: (id: string) => void
  onMonitor: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const severityConfig = SEVERITY_CONFIG[risk.severity]

  const accentColor = risk.severity === 'critical' ? '#ff4444' : risk.severity === 'warning' ? '#f5a623' : undefined

  return (
    <div
      className={cn(
        'bg-[#0a0a0a] border border-[#1a1a1a] rounded-md cursor-pointer transition-colors hover:border-[#252525]',
        accentColor && 'border-l-2',
        risk.status === 'resolved' && 'opacity-60'
      )}
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-2">
          {/* Severity indicator */}
          <span
            className={cn(
              'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
              risk.severity === 'critical' && 'animate-pulse'
            )}
            style={{ backgroundColor: severityConfig.color }}
          />

          <div className="flex-1 min-w-0">
            {/* Labels row */}
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] font-mono font-medium uppercase tracking-[0.5px]"
                style={{ color: severityConfig.color }}
              >
                {severityConfig.label}
              </span>
              <span className={cn(
                'text-[10px] font-mono uppercase tracking-[0.5px] px-1.5 py-0.5 rounded',
                risk.status === 'active' && 'text-[#ff4444] bg-[#ff4444]/10',
                risk.status === 'monitoring' && 'text-[#f5a623] bg-[#f5a623]/10',
                risk.status === 'resolved' && 'text-[#50e3c2] bg-[#50e3c2]/10'
              )}>
                {risk.status}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-[14px] font-medium text-[#ededed] mb-1">{risk.title}</h3>
            <p className="text-[12px] text-[#888]">{risk.description}</p>
          </div>

          {/* Impact */}
          <div className="text-right flex-shrink-0">
            <div className="text-[13px] font-medium text-[#ededed]">{risk.impact}</div>
            <div className="text-[10px] font-mono text-[#555]">{timeAgo(risk.detectedAt)}</div>
          </div>
        </div>

        {/* Sources */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555]">Sources:</span>
          <div className="flex items-center gap-1">
            {risk.sources.map(source => (
              <span
                key={source}
                className="w-5 h-5 rounded bg-[#1a1a1a] flex items-center justify-center text-[11px] text-[#555]"
                title={INTEGRATIONS.find(i => i.id === source)?.name}
              >
                {getIntegrationIcon(source)}
              </span>
            ))}
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="pt-3 mt-3 border-t border-[#1a1a1a] space-y-3">
            {/* Affected items */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555]">Affected:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {risk.affectedItems.map((item, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-[#1a1a1a] rounded text-[11px] font-mono text-[#888]"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Mitigation */}
            {risk.mitigation && risk.status !== 'resolved' && (
              <div className="p-3 border border-[#d4a574]/20 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4a574] animate-pulse" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#d4a574]">Suggested Mitigation</span>
                </div>
                <p className="text-[12px] text-[#888]">{risk.mitigation}</p>
              </div>
            )}

            {/* Actions */}
            {risk.status !== 'resolved' && (
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onMonitor(risk.id)
                  }}
                  disabled={risk.status === 'monitoring'}
                  className={cn(
                    'text-[12px] px-3 py-1 rounded border transition-colors',
                    risk.status === 'monitoring'
                      ? 'text-[#555] border-[#1a1a1a] cursor-not-allowed'
                      : 'text-[#888] border-[#1a1a1a] hover:border-[#252525] hover:text-[#ededed]'
                  )}
                >
                  {risk.status === 'monitoring' ? 'Monitoring' : 'Monitor'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onResolve(risk.id)
                  }}
                  className="text-[12px] text-[#000] bg-[#ededed] hover:bg-[#d9d9d9] px-3 py-1 rounded transition-colors"
                >
                  Mark Resolved
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Stats
function RiskStats({ risks }: { risks: Risk[] }) {
  const active = risks.filter(r => r.status === 'active')
  const critical = active.filter(r => r.severity === 'critical').length
  const warnings = active.filter(r => r.severity === 'warning').length
  const monitoring = risks.filter(r => r.status === 'monitoring').length
  const resolved = risks.filter(r => r.status === 'resolved').length

  const stats = [
    { value: critical.toString(), label: 'Critical', color: critical > 0 ? '#ff4444' : '#ededed' },
    { value: warnings.toString(), label: 'Warnings', color: warnings > 0 ? '#f5a623' : '#ededed' },
    { value: monitoring.toString(), label: 'Monitoring', color: '#ededed' },
    { value: resolved.toString(), label: 'Resolved', color: resolved > 0 ? '#50e3c2' : '#ededed' },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <div key={i} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
          <div className="text-[20px] font-mono font-semibold" style={{ color: stat.color }}>{stat.value}</div>
          <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

interface RisksTabProps {
  teamType?: TeamType
}

export function RisksTab({ teamType = 'launch' }: RisksTabProps) {
  const [risks, setRisks] = useState<Risk[]>(mockRisks)
  const [filter, setFilter] = useState<'all' | 'active' | 'monitoring' | 'resolved'>('all')

  const handleResolve = (id: string) => {
    setRisks(prev => prev.map(r =>
      r.id === id ? { ...r, status: 'resolved' as const, severity: 'resolved' as Severity } : r
    ))
  }

  const handleMonitor = (id: string) => {
    setRisks(prev => prev.map(r =>
      r.id === id ? { ...r, status: 'monitoring' as const } : r
    ))
  }

  // Filter risks
  const filteredRisks = filter === 'all'
    ? risks
    : risks.filter(r => r.status === filter)

  // Sort by severity
  const sortedRisks = [...filteredRisks].sort((a, b) => {
    const severityOrder = { critical: 4, warning: 3, info: 2, resolved: 1 }
    return severityOrder[b.severity] - severityOrder[a.severity]
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Risks</h2>
        <p className="text-[13px] text-[#888] mt-1">
          Active risks and blockers detected by NexFlow
        </p>
      </div>

      {/* Stats */}
      <RiskStats risks={risks} />

      {/* Filter tabs */}
      <div className="flex items-center gap-1 pt-2">
        {(['all', 'active', 'monitoring', 'resolved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 text-[13px] rounded-md transition-colors capitalize',
              filter === f
                ? 'bg-[#ededed] text-[#000] font-medium'
                : 'text-[#888] hover:text-[#ededed]'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Risks list */}
      <div className="space-y-3">
        {sortedRisks.map(risk => (
          <RiskCard
            key={risk.id}
            risk={risk}
            onResolve={handleResolve}
            onMonitor={handleMonitor}
          />
        ))}

        {sortedRisks.length === 0 && (
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-[#50e3c2]/10 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#50e3c2]">
                <path d="M5 12L10 17L19 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-[14px] font-medium text-[#ededed] mb-1">All clear</h3>
            <p className="text-[12px] text-[#555]">
              No {filter !== 'all' ? `${filter} ` : ''}risks detected
            </p>
          </div>
        )}
      </div>

      {/* Risk detection explanation - minimal */}
      <div className="p-4 border border-[#1a1a1a] rounded-md">
        <div className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full bg-[#d4a574] mt-1.5 animate-pulse" />
          <div>
            <h4 className="text-[13px] font-medium text-[#ededed] mb-1">How NexFlow detects risks</h4>
            <p className="text-[12px] text-[#555] leading-[1.5]">
              NexFlow continuously analyzes your connected integrations to identify blocking PRs,
              stale tasks, velocity drops, scope creep, and other patterns that indicate risk.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
