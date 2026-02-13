'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/nf/card'
import { Badge, SeverityBadge } from '@/components/nf/badge'
import { Button } from '@/components/nf/button'
import { BreathingDot } from '@/components/nf/breathing-dot'
import { Progress } from '@/components/nf/progress'
import { SEVERITY_LEVELS, INTEGRATIONS } from '@/lib/theme'

// Risk type
interface Risk {
  id: string
  severity: keyof typeof SEVERITY_LEVELS
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

// Risk card
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
  const severityConfig = SEVERITY_LEVELS[risk.severity]

  return (
    <Card
      hover
      glow={risk.severity === 'critical' ? 'critical' : risk.severity === 'warning' ? 'warning' : 'none'}
      className={cn(
        'cursor-pointer',
        risk.status === 'resolved' && 'opacity-60'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Severity indicator */}
          <div className={cn(
            'w-2 h-2 rounded-full mt-2 flex-shrink-0',
            risk.severity === 'critical' && 'bg-status-critical animate-pulse',
            risk.severity === 'warning' && 'bg-status-warning',
            risk.severity === 'info' && 'bg-status-info',
            risk.severity === 'resolved' && 'bg-status-success'
          )} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <SeverityBadge severity={risk.severity} />
              <Badge
                variant="default"
                size="sm"
                className={cn(
                  risk.status === 'active' && 'bg-status-critical-muted text-status-critical',
                  risk.status === 'monitoring' && 'bg-status-warning-muted text-status-warning',
                  risk.status === 'resolved' && 'bg-status-success-muted text-status-success'
                )}
              >
                {risk.status}
              </Badge>
            </div>

            <h3 className="text-sm font-medium text-foreground mb-1">{risk.title}</h3>
            <p className="text-xs text-foreground-secondary">{risk.description}</p>
          </div>

          {/* Impact */}
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-medium text-foreground">{risk.impact}</div>
            <div className="text-xs text-foreground-tertiary">{timeAgo(risk.detectedAt)}</div>
          </div>
        </div>

        {/* Sources */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-foreground-tertiary">Sources:</span>
          <div className="flex items-center gap-1">
            {risk.sources.map(source => (
              <span
                key={source}
                className="w-5 h-5 rounded bg-background-secondary flex items-center justify-center text-xs text-foreground-tertiary"
                title={INTEGRATIONS.find(i => i.id === source)?.name}
              >
                {getIntegrationIcon(source)}
              </span>
            ))}
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="pt-3 border-t border-border space-y-3 animate-fade-in-up">
            {/* Affected items */}
            <div>
              <span className="text-xs text-foreground-tertiary">Affected:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {risk.affectedItems.map((item, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-background-secondary rounded text-xs text-foreground-secondary"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Mitigation */}
            {risk.mitigation && risk.status !== 'resolved' && (
              <div className="p-3 bg-nf-muted border border-nf/20 rounded-md">
                <div className="flex items-center gap-2 mb-1">
                  <BreathingDot variant="nf" size="sm" />
                  <span className="text-xs font-medium text-nf">Suggested Mitigation</span>
                </div>
                <p className="text-xs text-foreground-secondary">{risk.mitigation}</p>
              </div>
            )}

            {/* Actions */}
            {risk.status !== 'resolved' && (
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onMonitor(risk.id)
                  }}
                  disabled={risk.status === 'monitoring'}
                >
                  {risk.status === 'monitoring' ? 'Monitoring' : 'Monitor'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onResolve(risk.id)
                  }}
                >
                  Mark Resolved
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Stats
function RiskStats({ risks }: { risks: Risk[] }) {
  const active = risks.filter(r => r.status === 'active')
  const critical = active.filter(r => r.severity === 'critical').length
  const warnings = active.filter(r => r.severity === 'warning').length
  const monitoring = risks.filter(r => r.status === 'monitoring').length
  const resolved = risks.filter(r => r.status === 'resolved').length

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card padding="sm" glow={critical > 0 ? 'critical' : 'none'}>
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-status-critical">{critical}</div>
          <div className="text-xs text-foreground-secondary">Critical</div>
        </CardContent>
      </Card>
      <Card padding="sm" glow={warnings > 0 ? 'warning' : 'none'}>
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-status-warning">{warnings}</div>
          <div className="text-xs text-foreground-secondary">Warnings</div>
        </CardContent>
      </Card>
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-foreground">{monitoring}</div>
          <div className="text-xs text-foreground-secondary">Monitoring</div>
        </CardContent>
      </Card>
      <Card padding="sm" glow={resolved > 0 ? 'success' : 'none'}>
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-status-success">{resolved}</div>
          <div className="text-xs text-foreground-secondary">Resolved</div>
        </CardContent>
      </Card>
    </div>
  )
}

export function RisksTab() {
  const [risks, setRisks] = useState<Risk[]>(mockRisks)
  const [filter, setFilter] = useState<'all' | 'active' | 'monitoring' | 'resolved'>('all')

  const handleResolve = (id: string) => {
    setRisks(prev => prev.map(r =>
      r.id === id ? { ...r, status: 'resolved' as const, severity: 'resolved' as const } : r
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Risks</h2>
        <p className="text-sm text-foreground-secondary mt-1">
          Active risks and blockers detected by NexFlow
        </p>
      </div>

      {/* Stats */}
      <RiskStats risks={risks} />

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 bg-background-secondary rounded-lg w-fit">
        {(['all', 'active', 'monitoring', 'resolved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors capitalize',
              filter === f
                ? 'bg-foreground text-background font-medium'
                : 'text-foreground-secondary hover:text-foreground'
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
          <Card padding="lg">
            <CardContent className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-status-success-muted flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-status-success">
                  <path d="M5 12L10 17L19 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-foreground font-medium mb-1">All clear</h3>
              <p className="text-sm text-foreground-secondary">
                No {filter !== 'all' ? `${filter} ` : ''}risks detected
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Risk detection explanation */}
      <div className="p-4 bg-background-secondary border border-border rounded-lg">
        <div className="flex items-start gap-3">
          <BreathingDot variant="nf" size="md" />
          <div>
            <h4 className="text-sm font-medium text-foreground mb-1">How NexFlow detects risks</h4>
            <p className="text-xs text-foreground-secondary leading-relaxed">
              NexFlow continuously analyzes your connected integrations to identify blocking PRs,
              stale tasks, velocity drops, scope creep, and other patterns that indicate risk.
              Critical risks require immediate attention, while warnings can be monitored.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
