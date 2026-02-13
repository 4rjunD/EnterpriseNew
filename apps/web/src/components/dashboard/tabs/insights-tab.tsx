'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'

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
  productivity: { label: 'Productivity', color: '#50e3c2' },
  process: { label: 'Process', color: '#f5a623' },
  team: { label: 'Team', color: '#a78bfa' },
  trend: { label: 'Trend', color: '#0070f3' },
}

// Insight card - clean, minimal
function InsightCard({ insight }: { insight: Insight }) {
  const category = CATEGORY_CONFIG[insight.category]
  const [expanded, setExpanded] = useState(false)

  const borderColor = {
    info: 'border-l-[#555]',
    warning: 'border-l-[#f5a623]',
    critical: 'border-l-[#ff4444]',
  }[insight.severity]

  return (
    <div
      className={cn(
        'bg-[#0a0a0a] border border-[#1a1a1a] rounded-md cursor-pointer transition-colors hover:border-[#252525]',
        'border-l-2',
        borderColor
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            {/* Category label - minimal, text only */}
            <span
              className="text-[10px] font-mono font-medium uppercase tracking-[0.5px]"
              style={{ color: category.color }}
            >
              {category.label}
            </span>
            {insight.actionable && (
              <span className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] border border-[#1a1a1a] px-1.5 py-0.5 rounded">
                Actionable
              </span>
            )}
          </div>

          {/* Metric - right aligned */}
          {insight.metric && (
            <div className="text-right flex-shrink-0">
              <div className="text-base font-mono font-semibold text-[#ededed]">
                {insight.metric.value}
              </div>
              <div className="flex items-center justify-end gap-1 text-[11px] font-mono text-[#555]">
                <span>{insight.metric.label}</span>
                <span className={cn(
                  insight.metric.trend === 'up' && insight.severity !== 'info' && 'text-[#ff4444]',
                  insight.metric.trend === 'up' && insight.severity === 'info' && 'text-[#50e3c2]',
                  insight.metric.trend === 'down' && 'text-[#ff4444]',
                  insight.metric.trend === 'stable' && 'text-[#555]'
                )}>
                  {insight.metric.trend === 'up' ? '↑' : insight.metric.trend === 'down' ? '↓' : '→'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[14px] font-medium text-[#ededed] mb-1">{insight.title}</h3>

        {/* Description */}
        <p className={cn(
          'text-[13px] text-[#888] leading-[1.5]',
          !expanded && 'line-clamp-2'
        )}>
          {insight.description}
        </p>

        {/* Expanded action */}
        {expanded && insight.action && (
          <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4a574]" />
              <span className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#d4a574]">Suggested Action</span>
            </div>
            <p className="text-[13px] text-[#888]">{insight.action}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Stats overview - 4 columns max, clean
function InsightsStats() {
  const stats = [
    { value: '78%', label: 'Team Health', trend: 'up', good: true },
    { value: '4.2', label: 'Avg Velocity', trend: 'stable', good: true },
    { value: '32%', label: 'Meeting Load', trend: 'up', good: false },
    { value: '+18%', label: 'This Week', trend: 'up', good: true },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <div key={i} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[20px] font-mono font-semibold text-[#ededed]">{stat.value}</span>
            <span className={cn(
              'text-[11px] font-mono',
              stat.good ? 'text-[#50e3c2]' : 'text-[#ff4444]'
            )}>
              {stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '→'}
            </span>
          </div>
          <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">{stat.label}</div>
        </div>
      ))}
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
      <InsightsStats />

      {/* Category filters */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={() => setCategoryFilter(null)}
          className={cn(
            'px-3 py-1.5 text-[13px] rounded-md transition-colors',
            categoryFilter === null
              ? 'bg-[#ededed] text-[#000] font-medium'
              : 'text-[#888] hover:text-[#ededed]'
          )}
        >
          All
        </button>
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setCategoryFilter(key)}
            className={cn(
              'px-3 py-1.5 text-[13px] rounded-md transition-colors',
              categoryFilter === key
                ? 'font-medium'
                : 'text-[#888] hover:text-[#ededed]'
            )}
            style={{
              backgroundColor: categoryFilter === key ? `${config.color}15` : undefined,
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

      {/* Explanation box - minimal */}
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
