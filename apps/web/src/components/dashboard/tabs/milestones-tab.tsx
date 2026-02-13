'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'
import { TEAM_TYPES, type TeamType } from '@/lib/theme'

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

// Milestone card - clean
function MilestoneCard({ milestone }: { milestone: Milestone }) {
  const days = daysRemaining(milestone.dueDate)
  const predictedDays = milestone.predictedCompletion
    ? daysRemaining(milestone.predictedCompletion)
    : days

  const riskConfig = {
    'on-track': { label: 'On Track', color: '#50e3c2' },
    'at-risk': { label: 'At Risk', color: '#f5a623' },
    'delayed': { label: 'Delayed', color: '#ff4444' },
  }[milestone.riskLevel]

  const accentColor = milestone.riskLevel === 'delayed' ? '#ff4444' : milestone.riskLevel === 'at-risk' ? '#f5a623' : undefined

  return (
    <div
      className={cn(
        'bg-[#0a0a0a] border border-[#1a1a1a] rounded-md transition-colors hover:border-[#252525]',
        accentColor && 'border-l-2'
      )}
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-[14px] font-medium text-[#ededed]">{milestone.name}</h3>
            {milestone.description && (
              <p className="text-[12px] text-[#555] mt-0.5">{milestone.description}</p>
            )}
          </div>
          <span
            className="text-[10px] font-mono font-medium uppercase tracking-[0.5px]"
            style={{ color: riskConfig.color }}
          >
            {riskConfig.label}
          </span>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-[11px] font-mono mb-1.5">
            <span className="text-[#555]">
              {milestone.tasksCompleted}/{milestone.tasksTotal} tasks
            </span>
            <span className="text-[#ededed]">{milestone.progress}%</span>
          </div>
          <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                milestone.riskLevel === 'on-track' ? 'bg-[#50e3c2]' :
                milestone.riskLevel === 'at-risk' ? 'bg-[#f5a623]' :
                'bg-[#ff4444]'
              )}
              style={{ width: `${milestone.progress}%` }}
            />
          </div>
        </div>

        {/* Timeline - grid with border dividers */}
        <div className="grid grid-cols-2 gap-px bg-[#1a1a1a] rounded overflow-hidden">
          <div className="bg-[#0a0a0a] p-2">
            <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mb-1">Due Date</div>
            <div className="text-[13px] font-medium text-[#ededed]">
              {formatDate(milestone.dueDate)}
            </div>
            <div className={cn(
              'text-[11px] font-mono',
              days <= 0 ? 'text-[#ff4444]' :
              days <= 3 ? 'text-[#f5a623]' :
              'text-[#555]'
            )}>
              {days <= 0 ? 'Overdue' : `${days}d left`}
            </div>
          </div>
          {milestone.predictedCompletion && (
            <div className="bg-[#0a0a0a] p-2">
              <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mb-1">Predicted</div>
              <div className={cn(
                'text-[13px] font-medium',
                predictedDays > days ? 'text-[#ff4444]' : 'text-[#50e3c2]'
              )}>
                {formatDate(milestone.predictedCompletion)}
              </div>
              <div className="text-[11px] font-mono text-[#555]">
                {predictedDays > days
                  ? `${predictedDays - days}d late`
                  : predictedDays < days
                  ? `${days - predictedDays}d early`
                  : 'On time'}
              </div>
            </div>
          )}
        </div>

        {/* Blockers */}
        {milestone.blockers > 0 && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-[#ff4444]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff4444] animate-pulse" />
            <span>{milestone.blockers} blocker{milestone.blockers > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Summary stats
function MilestoneStats({ milestones }: { milestones: Milestone[] }) {
  const onTrack = milestones.filter(m => m.riskLevel === 'on-track').length
  const atRisk = milestones.filter(m => m.riskLevel === 'at-risk').length
  const delayed = milestones.filter(m => m.riskLevel === 'delayed').length

  const stats = [
    { value: milestones.length.toString(), label: 'Active', color: '#ededed' },
    { value: onTrack.toString(), label: 'On Track', color: onTrack > 0 ? '#50e3c2' : '#ededed' },
    { value: atRisk.toString(), label: 'At Risk', color: atRisk > 0 ? '#f5a623' : '#ededed' },
    { value: delayed.toString(), label: 'Delayed', color: delayed > 0 ? '#ff4444' : '#ededed' },
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

interface MilestonesTabProps {
  teamType?: TeamType
}

export function MilestonesTab({ teamType = 'launch' }: MilestonesTabProps) {
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
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Milestones</h2>
        <p className="text-[13px] text-[#888] mt-1">
          Track progress towards your key deliverables
        </p>
      </div>

      {/* Stats */}
      <MilestoneStats milestones={milestones} />

      {/* Filter tabs */}
      <div className="flex items-center gap-1 pt-2">
        {(['all', 'on-track', 'at-risk', 'delayed'] as const).map(f => (
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
             f === 'on-track' ? 'On Track' :
             f === 'at-risk' ? 'At Risk' : 'Delayed'}
          </button>
        ))}
      </div>

      {/* Milestones grid - 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sortedMilestones.map(milestone => (
          <MilestoneCard key={milestone.id} milestone={milestone} />
        ))}

        {sortedMilestones.length === 0 && (
          <div className="md:col-span-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-8 text-center">
            <div className="text-[#555]">No milestones matching this filter</div>
          </div>
        )}
      </div>

      {/* NexFlow insights - minimal */}
      {milestones.some(m => m.riskLevel !== 'on-track') && (
        <div className="p-4 border border-[#d4a574]/20 rounded-md">
          <div className="flex items-start gap-3">
            <span className="w-2 h-2 rounded-full bg-[#d4a574] mt-1.5 animate-pulse" />
            <div>
              <h4 className="text-[13px] font-medium text-[#d4a574] mb-1">Milestone Risk Analysis</h4>
              <p className="text-[12px] text-[#555] leading-[1.5]">
                NexFlow predicts completion dates by analyzing task velocity, blockers, and
                historical patterns. Consider cutting scope or reassigning resources for at-risk milestones.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
