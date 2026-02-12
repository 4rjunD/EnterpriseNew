'use client'

import { cn } from '@nexflow/ui/utils'
import { CheckCircle2, AlertTriangle, Clock, Target, TrendingUp, Calendar } from 'lucide-react'

interface Analytics {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  taskCompletionRate: number
  totalPoints: number
  completedPoints: number
  pointsCompletionRate: number
  milestoneStats: any[]
  nextMilestone?: any
  onTrackPercentage: number
  projectCount: number
  activeProjects: number
}

interface SummaryStatsProps {
  analytics: Analytics
}

export function SummaryStats({ analytics }: SummaryStatsProps) {
  const {
    totalTasks,
    completedTasks,
    taskCompletionRate,
    completedPoints,
    totalPoints,
    pointsCompletionRate,
    milestoneStats,
    nextMilestone,
    onTrackPercentage,
  } = analytics

  const completedMilestones = milestoneStats.filter((m) => m.status === 'completed').length
  const atRiskMilestones = milestoneStats.filter((m) => m.isAtRisk && m.status !== 'completed').length

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {/* Tasks Completed */}
      <StatCard
        icon={<CheckCircle2 className="w-5 h-5" />}
        iconColor="text-status-healthy"
        iconBg="bg-status-healthy-light"
        label="Tasks Completed"
        value={`${completedTasks}/${totalTasks}`}
        subValue={`${taskCompletionRate}%`}
        progress={taskCompletionRate}
        progressColor="bg-status-healthy"
      />

      {/* Points Completed */}
      <StatCard
        icon={<TrendingUp className="w-5 h-5" />}
        iconColor="text-foreground"
        iconBg="bg-accent-light"
        label="Points Completed"
        value={`${completedPoints}/${totalPoints}`}
        subValue={`${pointsCompletionRate}%`}
        progress={pointsCompletionRate}
        progressColor="bg-foreground"
      />

      {/* Milestones */}
      <StatCard
        icon={<Target className="w-5 h-5" />}
        iconColor={atRiskMilestones > 0 ? 'text-status-critical' : 'text-foreground'}
        iconBg={atRiskMilestones > 0 ? 'bg-status-critical-light' : 'bg-accent-light'}
        label="Milestones"
        value={`${completedMilestones}/${milestoneStats.length}`}
        subValue={atRiskMilestones > 0 ? `${atRiskMilestones} at risk` : 'On track'}
        progress={milestoneStats.length > 0 ? (completedMilestones / milestoneStats.length) * 100 : 0}
        progressColor={atRiskMilestones > 0 ? 'bg-status-critical' : 'bg-foreground'}
      />

      {/* Next Milestone */}
      <StatCard
        icon={<Calendar className="w-5 h-5" />}
        iconColor={
          nextMilestone?.isAtRisk
            ? 'text-status-critical'
            : nextMilestone?.daysRemaining <= 7
              ? 'text-status-warning'
              : 'text-foreground-muted'
        }
        iconBg={
          nextMilestone?.isAtRisk
            ? 'bg-status-critical-light'
            : nextMilestone?.daysRemaining <= 7
              ? 'bg-status-warning-light'
              : 'bg-background-secondary'
        }
        label="Next Milestone"
        value={nextMilestone?.name || 'None'}
        subValue={
          nextMilestone
            ? nextMilestone.daysRemaining === 0
              ? 'Due today'
              : nextMilestone.daysRemaining < 0
                ? `${Math.abs(nextMilestone.daysRemaining)} days overdue`
                : `${nextMilestone.daysRemaining} days left`
            : 'All complete!'
        }
        truncateValue
      />
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  label: string
  value: string
  subValue: string
  progress?: number
  progressColor?: string
  truncateValue?: boolean
}

function StatCard({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  subValue,
  progress,
  progressColor,
  truncateValue,
}: StatCardProps) {
  return (
    <div className="p-4 rounded-lg border border-border bg-background-secondary/50">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2 rounded-lg', iconBg)}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-foreground-muted">{label}</p>
        <p
          className={cn(
            'text-lg font-semibold text-foreground',
            truncateValue && 'truncate'
          )}
          title={truncateValue ? value : undefined}
        >
          {value}
        </p>
        <p
          className={cn(
            'text-xs',
            subValue.includes('at risk') || subValue.includes('overdue')
              ? 'text-status-critical'
              : subValue.includes('left') && parseInt(subValue) <= 7
                ? 'text-status-warning'
                : 'text-foreground-muted'
          )}
        >
          {subValue}
        </p>
      </div>

      {progress !== undefined && (
        <div className="mt-3">
          <div className="h-1.5 bg-background rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', progressColor || 'bg-foreground')}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
