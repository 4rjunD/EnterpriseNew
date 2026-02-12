'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@nexflow/ui/button'
import { toast } from '@nexflow/ui/toast'
import { cn } from '@nexflow/ui/utils'
import {
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Circle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { format, formatDistanceToNow, isPast } from 'date-fns'

interface MilestoneStats {
  name: string
  targetDate: string
  description?: string
  status?: string
  index: number
  daysRemaining: number
  isPast: boolean
  isAtRisk: boolean
  progress?: {
    tasksCompleted: number
    tasksTotal: number
    percentage: number
  } | null
}

interface MilestoneEditorProps {
  milestones: MilestoneStats[]
}

const statusConfig = {
  not_started: {
    label: 'Not Started',
    icon: Circle,
    color: 'text-foreground-muted',
    bgColor: 'bg-foreground-muted/10',
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    color: 'text-foreground',
    bgColor: 'bg-accent-light',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-status-healthy',
    bgColor: 'bg-status-healthy-light',
  },
  at_risk: {
    label: 'At Risk',
    icon: AlertTriangle,
    color: 'text-status-critical',
    bgColor: 'bg-status-critical-light',
  },
}

export function MilestoneEditor({ milestones }: MilestoneEditorProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newMilestone, setNewMilestone] = useState({ name: '', targetDate: '', description: '' })
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const utils = trpc.useUtils()

  const addMutation = trpc.context.addMilestone.useMutation({
    onSuccess: () => {
      toast({ title: 'Milestone added' })
      utils.context.invalidate()
      setIsAdding(false)
      setNewMilestone({ name: '', targetDate: '', description: '' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateStatusMutation = trpc.context.updateMilestone.useMutation({
    onSuccess: () => {
      toast({ title: 'Milestone updated' })
      utils.context.invalidate()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const removeMutation = trpc.context.removeMilestone.useMutation({
    onSuccess: () => {
      toast({ title: 'Milestone removed' })
      utils.context.invalidate()
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const handleAdd = () => {
    if (!newMilestone.name || !newMilestone.targetDate) {
      toast({ title: 'Error', description: 'Name and target date are required', variant: 'destructive' })
      return
    }

    addMutation.mutate({
      name: newMilestone.name,
      targetDate: newMilestone.targetDate,
      description: newMilestone.description || undefined,
    })
  }

  const handleStatusChange = (index: number, status: string) => {
    updateStatusMutation.mutate({
      milestoneIndex: index,
      status: status as any,
    })
  }

  const handleRemove = (index: number) => {
    if (confirm('Remove this milestone?')) {
      removeMutation.mutate({ milestoneIndex: index })
    }
  }

  if (milestones.length === 0 && !isAdding) {
    return (
      <div className="text-center py-6">
        <Calendar className="w-8 h-8 text-foreground-muted mx-auto mb-2" />
        <p className="text-sm text-foreground-muted mb-3">No milestones set</p>
        <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add Milestone
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Existing milestones */}
      {milestones.map((milestone, idx) => {
        const status = milestone.status || 'not_started'
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_started
        const StatusIcon = config.icon
        const isExpanded = expandedIndex === idx

        return (
          <div
            key={idx}
            className={cn(
              'p-3 rounded-lg border transition-colors',
              milestone.isAtRisk && milestone.status !== 'completed'
                ? 'border-status-critical/30 bg-status-critical-light'
                : 'border-border bg-background-secondary/50'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <StatusIcon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', config.color)} />
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{milestone.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={cn(
                        'text-xs',
                        milestone.isPast && milestone.status !== 'completed'
                          ? 'text-status-critical'
                          : milestone.daysRemaining <= 7
                            ? 'text-status-warning'
                            : 'text-foreground-muted'
                      )}
                    >
                      {milestone.status === 'completed'
                        ? 'Completed'
                        : milestone.isPast
                          ? `${Math.abs(milestone.daysRemaining)} days overdue`
                          : milestone.daysRemaining === 0
                            ? 'Due today'
                            : `${milestone.daysRemaining} days left`}
                    </span>
                    <span className="text-xs text-foreground-muted">
                      {format(new Date(milestone.targetDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="p-1 rounded hover:bg-background-secondary"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-foreground-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-foreground-muted" />
                  )}
                </button>
              </div>
            </div>

            {/* Progress bar */}
            {milestone.progress && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-foreground-muted">Progress</span>
                  <span className="text-foreground">{milestone.progress.percentage}%</span>
                </div>
                <div className="h-1.5 bg-background rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      milestone.progress.percentage >= 100
                        ? 'bg-status-healthy'
                        : milestone.isAtRisk
                          ? 'bg-status-critical'
                          : 'bg-foreground'
                    )}
                    style={{ width: `${Math.min(100, milestone.progress.percentage)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Expanded content */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-border space-y-3">
                {milestone.description && (
                  <p className="text-sm text-foreground-muted">{milestone.description}</p>
                )}

                {/* Status selector */}
                <div>
                  <label className="text-xs text-foreground-muted mb-1 block">Status</label>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(statusConfig).map(([key, cfg]) => {
                      const Icon = cfg.icon
                      return (
                        <button
                          key={key}
                          onClick={() => handleStatusChange(idx, key)}
                          disabled={updateStatusMutation.isLoading}
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                            status === key
                              ? cn(cfg.bgColor, cfg.color, 'ring-1 ring-current')
                              : 'bg-background hover:bg-background-secondary text-foreground-muted'
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(idx)}
                  disabled={removeMutation.isLoading}
                  className="text-status-critical hover:text-status-critical hover:bg-status-critical-light"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            )}
          </div>
        )
      })}

      {/* Add milestone form */}
      {isAdding ? (
        <div className="p-3 rounded-lg border border-dashed border-accent/30 bg-accent-light space-y-3">
          <input
            type="text"
            placeholder="Milestone name"
            value={newMilestone.name}
            onChange={(e) => setNewMilestone({ ...newMilestone, name: e.target.value })}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <input
            type="date"
            value={newMilestone.targetDate}
            onChange={(e) => setNewMilestone({ ...newMilestone, targetDate: e.target.value })}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <textarea
            placeholder="Description (optional)"
            value={newMilestone.description}
            onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false)
                setNewMilestone({ name: '', targetDate: '', description: '' })
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={addMutation.isLoading}
              className="bg-accent hover:bg-accent/80"
            >
              {addMutation.isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="w-full border-dashed"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Milestone
        </Button>
      )}
    </div>
  )
}
