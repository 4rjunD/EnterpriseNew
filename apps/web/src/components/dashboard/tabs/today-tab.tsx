'use client'

import { useState, useMemo } from 'react'
import { cn } from '@nexflow/ui/utils'
import { TEAM_TYPES, INTEGRATIONS, type TeamType } from '@/lib/theme'

// Action types
const ACTION_TYPES = {
  review: { icon: '○', label: 'Review' },
  decision: { icon: '◆', label: 'Decision' },
  code: { icon: '◇', label: 'Code' },
  scope: { icon: '◈', label: 'Scope' },
  planning: { icon: '□', label: 'Planning' },
}

// Urgency types
type Urgency = 'now' | 'today' | 'this-week'

// Action item type
interface ActionItem {
  id: string
  type: keyof typeof ACTION_TYPES
  urgency: Urgency
  title: string
  subtitle?: string
  source: string[]
  impact: number
  agentStatus?: 'pending' | 'processing' | 'waiting'
  agentAction?: string
}

// Generate actions based on team type
function getActionsForTeamType(teamType: TeamType): ActionItem[] {
  const config = TEAM_TYPES[teamType]
  const urgencies: Urgency[] = ['now', 'now', 'today', 'today', 'this-week']
  const sources = [['github'], ['linear', 'slack'], ['github', 'linear'], ['linear'], ['linear', 'calendar']]
  const impacts = [95, 88, 72, 65, 45]

  return config.sampleActions.map((action, i) => ({
    id: String(i + 1),
    type: action.type as keyof typeof ACTION_TYPES,
    urgency: urgencies[i] || 'today',
    title: action.title,
    subtitle: action.subtitle,
    source: sources[i] || ['github'],
    impact: impacts[i] || 50,
    agentStatus: i === 0 ? 'pending' as const : i === 3 ? 'processing' as const : undefined,
    agentAction: i === 0 ? 'NexFlow can auto-assign reviewer' : i === 3 ? 'Analyzing velocity data...' : undefined,
  }))
}

// Get integration icon
function getIntegrationIcon(id: string): string {
  const integration = INTEGRATIONS.find(i => i.id === id)
  return integration?.icon || '?'
}

// Action row - clean, minimal design
function ActionRow({ action, onDone, onSnooze }: {
  action: ActionItem
  onDone: (id: string) => void
  onSnooze: (id: string) => void
}) {
  const typeConfig = ACTION_TYPES[action.type]
  const [isHovered, setIsHovered] = useState(false)

  const urgencyConfig = {
    now: { label: 'DO NOW', color: '#ff4444', bg: 'rgba(255,68,68,0.1)' },
    today: { label: 'TODAY', color: '#f5a623', bg: 'rgba(245,166,35,0.1)' },
    'this-week': { label: 'THIS WEEK', color: '#555', bg: 'transparent' },
  }[action.urgency]

  return (
    <div
      className={cn(
        'group p-4 border-b border-[#1a1a1a] last:border-b-0',
        'hover:bg-[#111] transition-colors',
        action.urgency === 'now' && 'bg-[#ff4444]/5'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className="w-7 h-7 rounded bg-[#1a1a1a] flex items-center justify-center text-[12px] text-[#555] flex-shrink-0">
          {typeConfig.icon}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Urgency badge - minimal */}
            <span
              className="text-[10px] font-mono font-medium uppercase tracking-[0.5px] px-1.5 py-0.5 rounded"
              style={{ color: urgencyConfig.color, backgroundColor: urgencyConfig.bg, border: action.urgency === 'this-week' ? '1px solid #1a1a1a' : 'none' }}
            >
              {urgencyConfig.label}
            </span>
            <span className="text-[13px] font-medium text-[#ededed] truncate">
              {action.title}
            </span>
          </div>

          {action.subtitle && (
            <p className="text-[12px] text-[#555] mb-2">{action.subtitle}</p>
          )}

          {/* Source integrations + impact */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {action.source.map(sourceId => (
                <span
                  key={sourceId}
                  className="w-5 h-5 rounded bg-[#1a1a1a] flex items-center justify-center text-[11px] text-[#555]"
                  title={INTEGRATIONS.find(i => i.id === sourceId)?.name}
                >
                  {getIntegrationIcon(sourceId)}
                </span>
              ))}
            </div>

            {/* Impact score */}
            <span className={cn(
              'text-[11px] font-mono',
              action.impact >= 80 ? 'text-[#ff4444]' :
              action.impact >= 60 ? 'text-[#f5a623]' :
              'text-[#555]'
            )}>
              {action.impact}% impact
            </span>
          </div>

          {/* Agent status */}
          {action.agentStatus && action.agentAction && (
            <div className="mt-2 flex items-center gap-2 px-2 py-1.5 border border-[#d4a574]/20 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4a574] animate-pulse" />
              <span className="text-[11px] text-[#d4a574]">{action.agentAction}</span>
            </div>
          )}
        </div>

        {/* Actions (show on hover) */}
        <div className={cn(
          'flex items-center gap-2 transition-opacity flex-shrink-0',
          isHovered ? 'opacity-100' : 'opacity-0'
        )}>
          <button
            onClick={() => onSnooze(action.id)}
            className="text-[12px] text-[#555] hover:text-[#888] px-2 py-1"
          >
            Snooze
          </button>
          <button
            onClick={() => onDone(action.id)}
            className="text-[12px] text-[#ededed] bg-[#1a1a1a] hover:bg-[#252525] px-3 py-1 rounded"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// Summary stats - inline, minimal
function TodayStats({ actions }: { actions: ActionItem[] }) {
  const nowCount = actions.filter(a => a.urgency === 'now').length
  const todayCount = actions.filter(a => a.urgency === 'today').length
  const weekCount = actions.filter(a => a.urgency === 'this-week').length
  const avgImpact = Math.round(actions.reduce((acc, a) => acc + a.impact, 0) / actions.length) || 0

  return (
    <div className="flex items-center gap-6 text-[12px]">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ff4444] animate-pulse" />
        <span className="text-[#888]">{nowCount} urgent</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623]" />
        <span className="text-[#888]">{todayCount} today</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#555]" />
        <span className="text-[#888]">{weekCount} this week</span>
      </div>
      <div className="ml-auto text-[#555]">
        Avg impact: <span className="font-mono text-[#ededed]">{avgImpact}%</span>
      </div>
    </div>
  )
}

interface TodayTabProps {
  teamType?: TeamType
}

export function TodayTab({ teamType = 'launch' }: TodayTabProps) {
  const initialActions = useMemo(() => getActionsForTeamType(teamType), [teamType])
  const [actions, setActions] = useState<ActionItem[]>(initialActions)
  const [filter, setFilter] = useState<'all' | Urgency>('all')

  // Filter actions
  const filteredActions = filter === 'all'
    ? actions
    : actions.filter(a => a.urgency === filter)

  // Sort by impact (highest first)
  const sortedActions = [...filteredActions].sort((a, b) => b.impact - a.impact)

  const handleDone = (id: string) => {
    setActions(prev => prev.filter(a => a.id !== id))
  }

  const handleSnooze = (id: string) => {
    setActions(prev => prev.map(a => {
      if (a.id !== id) return a
      const newUrgency: Urgency = a.urgency === 'now' ? 'today' : 'this-week'
      return { ...a, urgency: newUrgency }
    }))
  }

  // Team-specific copy
  const impactTarget = {
    launch: 'launch date',
    product: 'sprint goals',
    agency: 'client deliverables',
    engineering: 'deploy velocity',
  }[teamType]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Your Action Queue</h2>
          <p className="text-[13px] text-[#888] mt-1">
            Actions ranked by impact on your {impactTarget}
          </p>
        </div>
        {/* NexFlow status indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-[#d4a574]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d4a574] animate-pulse" />
          <span className="text-[11px] font-mono text-[#d4a574]">NexFlow AI</span>
        </div>
      </div>

      {/* Stats bar */}
      <TodayStats actions={actions} />

      {/* Filter tabs - minimal */}
      <div className="flex items-center gap-1">
        {(['all', 'now', 'today', 'this-week'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 text-[13px] rounded-md transition-colors',
              filter === f
                ? 'bg-[#ededed] text-[#000] font-medium'
                : 'text-[#888] hover:text-[#ededed]'
            )}
          >
            {f === 'all' ? 'All' :
             f === 'now' ? 'Urgent' :
             f === 'today' ? 'Today' : 'This Week'}
          </button>
        ))}
      </div>

      {/* Action list */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md overflow-hidden">
        {sortedActions.length > 0 ? (
          sortedActions.map(action => (
            <ActionRow
              key={action.id}
              action={action}
              onDone={handleDone}
              onSnooze={handleSnooze}
            />
          ))
        ) : (
          <div className="p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-[#50e3c2]/10 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#50e3c2]">
                <path d="M5 12L10 17L19 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-[14px] font-medium text-[#ededed] mb-1">All clear</h3>
            <p className="text-[12px] text-[#555]">
              No {filter === 'all' ? '' : filter === 'now' ? 'urgent ' : filter === 'today' ? "today's " : "this week's "}actions remaining
            </p>
          </div>
        )}
      </div>

      {/* NexFlow explanation - minimal */}
      <div className="p-4 border border-[#d4a574]/20 rounded-md">
        <div className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full bg-[#d4a574] mt-1.5 animate-pulse" />
          <div>
            <h4 className="text-[13px] font-medium text-[#d4a574] mb-1">How NexFlow ranks your actions</h4>
            <p className="text-[12px] text-[#555] leading-[1.5]">
              NexFlow analyzes your codebase, project tracker, and comms to calculate impact scores.
              Actions blocking other work or affecting your ship date are ranked highest.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
