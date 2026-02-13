'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/nf/card'
import { Badge } from '@/components/nf/badge'
import { BreathingDot } from '@/components/nf/breathing-dot'
import { AnimPercent, StatCounter } from '@/components/nf/anim-num'
import { Progress } from '@/components/nf/progress'

// Milestone type
interface Milestone {
  id: string
  name: string
  description?: string
  dueDate: Date
  progress: number
  tasksTotal: number
  tasksCompleted: number
  riskLevel: 'on-track' | 'at-risk' | 'delayed'
  predictedCompletion?: Date
  blockers: number
}

// Mock milestones
const mockMilestones: Milestone[] = [
  {
    id: '1',
    name: 'MVP Launch',
    description: 'Core features ready for beta users',
    dueDate: new Date('2024-03-15'),
    progress: 68,
    tasksTotal: 45,
    tasksCompleted: 31,
    riskLevel: 'at-risk',
    predictedCompletion: new Date('2024-03-19'),
    blockers: 3,
  },
  {
    id: '2',
    name: 'Auth System Complete',
    description: 'OAuth, SSO, and team invites',
    dueDate: new Date('2024-03-08'),
    progress: 85,
    tasksTotal: 18,
    tasksCompleted: 15,
    riskLevel: 'on-track',
    predictedCompletion: new Date('2024-03-07'),
    blockers: 0,
  },
  {
    id: '3',
    name: 'Payment Integration',
    description: 'Stripe integration for subscriptions',
    dueDate: new Date('2024-03-22'),
    progress: 42,
    tasksTotal: 24,
    tasksCompleted: 10,
    riskLevel: 'at-risk',
    predictedCompletion: new Date('2024-03-25'),
    blockers: 1,
  },
  {
    id: '4',
    name: 'Beta Onboarding Flow',
    description: 'Complete onboarding experience for beta users',
    dueDate: new Date('2024-03-10'),
    progress: 25,
    tasksTotal: 12,
    tasksCompleted: 3,
    riskLevel: 'delayed',
    predictedCompletion: new Date('2024-03-18'),
    blockers: 2,
  },
]

// Helper to format date
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

// Helper to calculate days remaining
function daysRemaining(date: Date): number {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// Milestone card
function MilestoneCard({ milestone }: { milestone: Milestone }) {
  const days = daysRemaining(milestone.dueDate)
  const predictedDays = milestone.predictedCompletion
    ? daysRemaining(milestone.predictedCompletion)
    : days

  const riskConfig = {
    'on-track': { label: 'On Track', color: 'text-status-success', bg: 'bg-status-success-muted' },
    'at-risk': { label: 'At Risk', color: 'text-status-warning', bg: 'bg-status-warning-muted' },
    'delayed': { label: 'Delayed', color: 'text-status-critical', bg: 'bg-status-critical-muted' },
  }[milestone.riskLevel]

  return (
    <Card
      hover
      glow={
        milestone.riskLevel === 'delayed' ? 'critical' :
        milestone.riskLevel === 'at-risk' ? 'warning' : 'none'
      }
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-foreground">{milestone.name}</h3>
            {milestone.description && (
              <p className="text-xs text-foreground-secondary mt-0.5">{milestone.description}</p>
            )}
          </div>
          <Badge
            variant="default"
            size="sm"
            className={cn(riskConfig.bg, riskConfig.color)}
          >
            {riskConfig.label}
          </Badge>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-foreground-secondary">
              {milestone.tasksCompleted}/{milestone.tasksTotal} tasks
            </span>
            <span className="font-mono text-foreground">{milestone.progress}%</span>
          </div>
          <Progress value={milestone.progress} />
        </div>

        {/* Timeline */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-background-secondary rounded-md">
          <div>
            <div className="text-xs text-foreground-tertiary mb-1">Due Date</div>
            <div className="text-sm font-medium text-foreground">
              {formatDate(milestone.dueDate)}
            </div>
            <div className={cn(
              'text-xs',
              days <= 0 ? 'text-status-critical' :
              days <= 3 ? 'text-status-warning' :
              'text-foreground-secondary'
            )}>
              {days <= 0 ? 'Overdue' : `${days} days left`}
            </div>
          </div>
          {milestone.predictedCompletion && (
            <div>
              <div className="text-xs text-foreground-tertiary mb-1">Predicted</div>
              <div className={cn(
                'text-sm font-medium',
                predictedDays > days ? 'text-status-critical' : 'text-status-success'
              )}>
                {formatDate(milestone.predictedCompletion)}
              </div>
              <div className="text-xs text-foreground-secondary">
                {predictedDays > days
                  ? `${predictedDays - days} days late`
                  : predictedDays < days
                  ? `${days - predictedDays} days early`
                  : 'On time'}
              </div>
            </div>
          )}
        </div>

        {/* Blockers */}
        {milestone.blockers > 0 && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-status-critical-muted rounded-md">
            <span className="w-2 h-2 rounded-full bg-status-critical animate-pulse" />
            <span className="text-xs text-status-critical">
              {milestone.blockers} blocker{milestone.blockers > 1 ? 's' : ''} affecting this milestone
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Summary stats
function MilestoneStats({ milestones }: { milestones: Milestone[] }) {
  const onTrack = milestones.filter(m => m.riskLevel === 'on-track').length
  const atRisk = milestones.filter(m => m.riskLevel === 'at-risk').length
  const delayed = milestones.filter(m => m.riskLevel === 'delayed').length
  const avgProgress = Math.round(
    milestones.reduce((acc, m) => acc + m.progress, 0) / milestones.length
  )

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-foreground">{milestones.length}</div>
          <div className="text-xs text-foreground-secondary">Active Milestones</div>
        </CardContent>
      </Card>
      <Card padding="sm" glow={onTrack > 0 ? 'success' : 'none'}>
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-status-success">{onTrack}</div>
          <div className="text-xs text-foreground-secondary">On Track</div>
        </CardContent>
      </Card>
      <Card padding="sm" glow={atRisk > 0 ? 'warning' : 'none'}>
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-status-warning">{atRisk}</div>
          <div className="text-xs text-foreground-secondary">At Risk</div>
        </CardContent>
      </Card>
      <Card padding="sm" glow={delayed > 0 ? 'critical' : 'none'}>
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-status-critical">{delayed}</div>
          <div className="text-xs text-foreground-secondary">Delayed</div>
        </CardContent>
      </Card>
    </div>
  )
}

export function MilestonesTab() {
  const [milestones] = useState<Milestone[]>(mockMilestones)
  const [filter, setFilter] = useState<'all' | 'on-track' | 'at-risk' | 'delayed'>('all')

  // Filter milestones
  const filteredMilestones = filter === 'all'
    ? milestones
    : milestones.filter(m => m.riskLevel === filter)

  // Sort by due date
  const sortedMilestones = [...filteredMilestones].sort(
    (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Milestones</h2>
        <p className="text-sm text-foreground-secondary mt-1">
          Track progress towards your key deliverables
        </p>
      </div>

      {/* Stats */}
      <MilestoneStats milestones={milestones} />

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 bg-background-secondary rounded-lg w-fit">
        {(['all', 'on-track', 'at-risk', 'delayed'] as const).map(f => (
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
             f === 'on-track' ? 'On Track' :
             f === 'at-risk' ? 'At Risk' : 'Delayed'}
          </button>
        ))}
      </div>

      {/* Milestones grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedMilestones.map(milestone => (
          <MilestoneCard key={milestone.id} milestone={milestone} />
        ))}

        {sortedMilestones.length === 0 && (
          <Card padding="lg" className="md:col-span-2">
            <CardContent className="p-8 text-center">
              <div className="text-foreground-tertiary">
                No milestones matching this filter
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* NexFlow insights */}
      {milestones.some(m => m.riskLevel !== 'on-track') && (
        <div className="p-4 bg-nf-muted border border-nf/20 rounded-lg">
          <div className="flex items-start gap-3">
            <BreathingDot variant="nf" size="md" />
            <div>
              <h4 className="text-sm font-medium text-nf mb-1">Milestone Risk Analysis</h4>
              <p className="text-xs text-foreground-secondary leading-relaxed">
                NexFlow predicts completion dates by analyzing task velocity, blockers, and
                historical patterns. The "Beta Onboarding Flow" milestone needs immediate attention
                - consider cutting scope or reassigning resources.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
