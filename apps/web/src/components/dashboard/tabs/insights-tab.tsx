'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/nf/card'
import { Badge } from '@/components/nf/badge'
import { BreathingDot } from '@/components/nf/breathing-dot'
import { AnimPercent, StatCounter } from '@/components/nf/anim-num'
import { Progress } from '@/components/nf/progress'

// Insight type
interface Insight {
  id: string
  category: 'productivity' | 'process' | 'team' | 'trend'
  title: string
  description: string
  metric?: { label: string; value: string; trend: 'up' | 'down' | 'stable' }
  actionable: boolean
  action?: string
  severity: 'info' | 'warning' | 'critical'
}

// Mock insights data (co-founder exclusive intelligence)
const mockInsights: Insight[] = [
  {
    id: '1',
    category: 'productivity',
    title: 'Engineering time lost to meetings',
    description: 'Your team spent 32% of last week in meetings - 15% above industry average. Most impactful: daily standups averaging 28 minutes (target: 15 min).',
    metric: { label: 'Meeting Load', value: '32%', trend: 'up' },
    actionable: true,
    action: 'Try async standups or reduce to 3x/week',
    severity: 'warning',
  },
  {
    id: '2',
    category: 'process',
    title: 'PR review bottleneck detected',
    description: 'Average PR review time increased from 4h to 12h this sprint. Alex is reviewing 60% of all PRs.',
    metric: { label: 'Avg Review Time', value: '12h', trend: 'up' },
    actionable: true,
    action: 'Distribute reviews more evenly or add CODEOWNERS',
    severity: 'critical',
  },
  {
    id: '3',
    category: 'team',
    title: 'Jordan showing burnout signals',
    description: 'Commit frequency down 40%, Slack response time up 3x, working late on 4/5 days. Consider 1:1.',
    metric: { label: 'Engagement Score', value: '45', trend: 'down' },
    actionable: true,
    action: 'Schedule a check-in conversation',
    severity: 'warning',
  },
  {
    id: '4',
    category: 'trend',
    title: 'Velocity improving week-over-week',
    description: 'Team velocity increased 18% over the last 3 weeks. Story point completion rate now at 85%.',
    metric: { label: 'Velocity', value: '+18%', trend: 'up' },
    actionable: false,
    severity: 'info',
  },
  {
    id: '5',
    category: 'process',
    title: 'Scope creep in current sprint',
    description: '6 new tasks added to sprint after planning (34% increase). Original scope: 18 tasks, current: 24.',
    metric: { label: 'Scope Creep', value: '+34%', trend: 'up' },
    actionable: true,
    action: 'Consider stricter sprint boundaries',
    severity: 'warning',
  },
  {
    id: '6',
    category: 'productivity',
    title: 'Focus time blocks effective',
    description: 'Engineers who used calendar focus blocks shipped 2.3x more code during those periods.',
    metric: { label: 'Focus Multiplier', value: '2.3x', trend: 'stable' },
    actionable: true,
    action: 'Encourage team-wide adoption of focus blocks',
    severity: 'info',
  },
]

// Category config
const CATEGORY_CONFIG = {
  productivity: { label: 'Productivity', icon: '\\u25ce', color: '#50e3c2' },
  process: { label: 'Process', icon: '\\u25c7', color: '#f5a623' },
  team: { label: 'Team', icon: '\\u25a3', color: '#a78bfa' },
  trend: { label: 'Trend', icon: '\\u25b3', color: '#0070f3' },
}

// Insight card
function InsightCard({ insight }: { insight: Insight }) {
  const category = CATEGORY_CONFIG[insight.category]
  const [expanded, setExpanded] = useState(false)

  const severityConfig = {
    info: { border: 'border-l-foreground-tertiary', glow: 'none' as const },
    warning: { border: 'border-l-status-warning', glow: 'warning' as const },
    critical: { border: 'border-l-status-critical', glow: 'critical' as const },
  }[insight.severity]

  return (
    <Card
      hover
      glow={insight.severity !== 'info' ? severityConfig.glow : 'none'}
      className={cn(
        'cursor-pointer transition-all border-l-4',
        severityConfig.border
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="default"
              size="sm"
              style={{
                backgroundColor: `${category.color}20`,
                color: category.color,
              }}
            >
              {category.label}
            </Badge>
            {insight.actionable && (
              <Badge variant="nf" size="sm">Actionable</Badge>
            )}
          </div>

          {/* Metric */}
          {insight.metric && (
            <div className="text-right">
              <div className="text-lg font-mono font-medium text-foreground">
                {insight.metric.value}
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-foreground-tertiary">{insight.metric.label}</span>
                <span className={cn(
                  insight.metric.trend === 'up' && insight.severity !== 'info' && '\\u2191 text-status-critical',
                  insight.metric.trend === 'up' && insight.severity === 'info' && '\\u2191 text-status-success',
                  insight.metric.trend === 'down' && '\\u2193 text-status-critical',
                  insight.metric.trend === 'stable' && '\\u2192 text-foreground-tertiary'
                )}>
                  {insight.metric.trend === 'up' ? '\\u2191' : insight.metric.trend === 'down' ? '\\u2193' : '\\u2192'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-medium text-foreground mb-1">{insight.title}</h3>

        {/* Description */}
        <p className={cn(
          'text-xs text-foreground-secondary',
          !expanded && 'line-clamp-2'
        )}>
          {insight.description}
        </p>

        {/* Expanded action */}
        {expanded && insight.action && (
          <div className="mt-3 p-3 bg-nf-muted border border-nf/20 rounded-md animate-fade-in-up">
            <div className="flex items-center gap-2 mb-1">
              <BreathingDot variant="nf" size="sm" />
              <span className="text-xs font-medium text-nf">Suggested Action</span>
            </div>
            <p className="text-xs text-foreground-secondary">{insight.action}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Stats overview
function InsightsStats() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-status-success-muted flex items-center justify-center">
              <span className="text-status-success text-lg">\\u2191</span>
            </div>
            <div>
              <div className="text-lg font-mono font-medium text-foreground">78%</div>
              <div className="text-xs text-foreground-secondary">Team Health</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-purple-muted flex items-center justify-center">
              <span className="text-purple text-lg">\\u25a3</span>
            </div>
            <div>
              <div className="text-lg font-mono font-medium text-foreground">4.2</div>
              <div className="text-xs text-foreground-secondary">Avg Velocity</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-status-warning-muted flex items-center justify-center">
              <span className="text-status-warning text-lg">\\u25ce</span>
            </div>
            <div>
              <div className="text-lg font-mono font-medium text-foreground">32%</div>
              <div className="text-xs text-foreground-secondary">Meeting Load</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-status-info-muted flex items-center justify-center">
              <span className="text-status-info text-lg">\\u25b3</span>
            </div>
            <div>
              <div className="text-lg font-mono font-medium text-foreground">+18%</div>
              <div className="text-xs text-foreground-secondary">This Week</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function InsightsTab() {
  const [insights] = useState<Insight[]>(mockInsights)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  // Filter insights
  const filteredInsights = categoryFilter
    ? insights.filter(i => i.category === categoryFilter)
    : insights

  // Sort by severity
  const sortedInsights = [...filteredInsights].sort((a, b) => {
    const severityOrder = { critical: 3, warning: 2, info: 1 }
    return severityOrder[b.severity] - severityOrder[a.severity]
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header with co-founder badge */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-semibold text-foreground">Strategic Insights</h2>
            <Badge variant="purple" size="sm">Co-founder Only</Badge>
          </div>
          <p className="text-sm text-foreground-secondary">
            Cross-team patterns, productivity signals, and process intelligence
          </p>
        </div>
        <BreathingDot variant="nf" size="lg" />
      </div>

      {/* Stats */}
      <InsightsStats />

      {/* Category filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setCategoryFilter(null)}
          className={cn(
            'px-3 py-1.5 text-sm rounded-full transition-colors',
            categoryFilter === null
              ? 'bg-foreground text-background font-medium'
              : 'bg-background-secondary text-foreground-secondary hover:text-foreground'
          )}
        >
          All
        </button>
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setCategoryFilter(key)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-full transition-colors',
              categoryFilter === key
                ? 'font-medium'
                : 'text-foreground-secondary hover:text-foreground'
            )}
            style={{
              backgroundColor: categoryFilter === key ? `${config.color}20` : undefined,
              color: categoryFilter === key ? config.color : undefined,
            }}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* Insights list */}
      <div className="space-y-3">
        {sortedInsights.map(insight => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>

      {/* Explanation */}
      <div className="p-4 bg-purple-muted border border-purple/20 rounded-lg">
        <div className="flex items-start gap-3">
          <BreathingDot variant="purple" size="md" />
          <div>
            <h4 className="text-sm font-medium text-purple mb-1">About Strategic Insights</h4>
            <p className="text-xs text-foreground-secondary leading-relaxed">
              This tab shows intelligence that only co-founders can see: burnout signals,
              productivity patterns, process inefficiencies, and cross-team trends.
              These insights help you make strategic decisions about team health and process.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
