'use client'

import { useState, useMemo } from 'react'
import { cn } from '@nexflow/ui/utils'
import { trpc } from '@/lib/trpc'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/nf/card'
import { Button } from '@/components/nf/button'
import { Badge, UrgencyBadge } from '@/components/nf/badge'
import { BreathingDot, NexFlowStatus } from '@/components/nf/breathing-dot'
import { AnimPercent } from '@/components/nf/anim-num'
import { ACTION_TYPES, URGENCY_LEVELS, INTEGRATIONS, TEAM_TYPES, LAYOUT, type TeamType } from '@/lib/theme'

// Action item type
interface ActionItem {
  id: string
  type: keyof typeof ACTION_TYPES
  urgency: keyof typeof URGENCY_LEVELS
  title: string
  subtitle?: string
  source: string[]  // Integration IDs
  impact: number    // 0-100 impact on ship date
  agentStatus?: 'pending' | 'processing' | 'waiting'
  agentAction?: string
  relatedId?: string
  relatedType?: 'task' | 'pr' | 'bottleneck'
}

// Generate actions based on team type
function getActionsForTeamType(teamType: TeamType): ActionItem[] {
  const config = TEAM_TYPES[teamType]
  const urgencies: Array<keyof typeof URGENCY_LEVELS> = ['now', 'now', 'today', 'today', 'this-week']
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

// Action row component
function ActionRow({ action, onDone, onSnooze }: {
  action: ActionItem
  onDone: (id: string) => void
  onSnooze: (id: string) => void
}) {
  const typeConfig = ACTION_TYPES[action.type]
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={cn(
        'group relative p-4 border-b border-border last:border-b-0',
        'hover:bg-background-secondary transition-colors',
        action.urgency === 'now' && 'bg-status-critical-muted/20'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-4">
        {/* Type icon */}
        <div className={cn(
          'w-8 h-8 rounded-md flex items-center justify-center text-sm',
          'bg-background-tertiary text-foreground-secondary'
        )}>
          {typeConfig.icon}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <UrgencyBadge urgency={action.urgency} />
            <span className="text-sm font-medium text-foreground truncate">
              {action.title}
            </span>
          </div>

          {action.subtitle && (
            <p className="text-xs text-foreground-secondary mb-2">{action.subtitle}</p>
          )}

          {/* Source integrations */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {action.source.map(sourceId => (
                <span
                  key={sourceId}
                  className="w-5 h-5 rounded bg-background-tertiary flex items-center justify-center text-xs text-foreground-tertiary"
                  title={INTEGRATIONS.find(i => i.id === sourceId)?.name}
                >
                  {getIntegrationIcon(sourceId)}
                </span>
              ))}
            </div>

            {/* Impact score */}
            <div className={cn(
              'px-1.5 py-0.5 rounded text-xs font-mono',
              action.impact >= 80 ? 'bg-status-critical-muted text-status-critical' :
              action.impact >= 60 ? 'bg-status-warning-muted text-status-warning' :
              'bg-foreground/5 text-foreground-secondary'
            )}>
              {action.impact}% impact
            </div>
          </div>

          {/* Agent status */}
          {action.agentStatus && action.agentAction && (
            <div className="mt-2 flex items-center gap-2 px-2 py-1.5 bg-nf-muted rounded-md">
              <BreathingDot variant="nf" size="sm" />
              <span className="text-xs text-nf">{action.agentAction}</span>
            </div>
          )}
        </div>

        {/* Actions (show on hover) */}
        <div className={cn(
          'flex items-center gap-2 transition-opacity',
          isHovered ? 'opacity-100' : 'opacity-0'
        )}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSnooze(action.id)}
            className="text-foreground-secondary"
          >
            Snooze
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDone(action.id)}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}

// Summary stats
function TodayStats({ actions }: { actions: ActionItem[] }) {
  const nowCount = actions.filter(a => a.urgency === 'now').length
  const todayCount = actions.filter(a => a.urgency === 'today').length
  const weekCount = actions.filter(a => a.urgency === 'this-week').length
  const avgImpact = Math.round(actions.reduce((acc, a) => acc + a.impact, 0) / actions.length) || 0

  return (
    <div className="flex items-center gap-6 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-status-critical animate-pulse" />
        <span className="text-foreground-secondary">{nowCount} urgent</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-status-warning" />
        <span className="text-foreground-secondary">{todayCount} today</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-foreground-tertiary" />
        <span className="text-foreground-secondary">{weekCount} this week</span>
      </div>
      <div className="ml-auto text-foreground-tertiary">
        Avg. impact: <span className="font-mono text-foreground">{avgImpact}%</span>
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
  const [filter, setFilter] = useState<'all' | 'now' | 'today' | 'this-week'>('all')
  const teamConfig = TEAM_TYPES[teamType]

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
    // Move to next urgency level
    setActions(prev => prev.map(a => {
      if (a.id !== id) return a
      const newUrgency = a.urgency === 'now' ? 'today' : 'this-week'
      return { ...a, urgency: newUrgency as keyof typeof URGENCY_LEVELS }
    }))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Your Action Queue</h2>
          <p className="text-sm text-foreground-secondary mt-1">
            Actions ranked by impact on your {teamType === 'launch' ? 'launch date' : teamType === 'product' ? 'sprint goals' : teamType === 'agency' ? 'client deliverables' : 'deploy velocity'}
          </p>
        </div>
        <NexFlowStatus />
      </div>

      {/* Stats bar */}
      <TodayStats actions={actions} />

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 bg-background-secondary rounded-lg w-fit">
        {(['all', 'now', 'today', 'this-week'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              filter === f
                ? 'bg-foreground text-background font-medium'
                : 'text-foreground-secondary hover:text-foreground'
            )}
          >
            {f === 'all' ? 'All' :
             f === 'now' ? 'Urgent' :
             f === 'today' ? 'Today' : 'This Week'}
          </button>
        ))}
      </div>

      {/* Action list */}
      <Card padding="none">
        <CardContent className="p-0">
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
              <div className="w-12 h-12 rounded-full bg-status-success-muted flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-status-success">
                  <path d="M5 12L10 17L19 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-foreground font-medium mb-1">All clear</h3>
              <p className="text-sm text-foreground-secondary">
                No {filter === 'all' ? '' : filter === 'now' ? 'urgent ' : filter === 'today' ? "today's " : "this week's "}actions remaining
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* NexFlow explanation */}
      <div className="p-4 bg-nf-muted border border-nf/20 rounded-lg">
        <div className="flex items-start gap-3">
          <BreathingDot variant="nf" size="md" />
          <div>
            <h4 className="text-sm font-medium text-nf mb-1">How NexFlow ranks your actions</h4>
            <p className="text-xs text-foreground-secondary leading-relaxed">
              NexFlow analyzes your codebase, project tracker, and comms to calculate impact scores.
              Actions blocking other work or affecting your ship date are ranked highest.
              The AI continuously re-ranks as you complete actions and new information arrives.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
