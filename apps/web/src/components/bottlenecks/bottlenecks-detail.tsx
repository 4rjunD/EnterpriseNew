'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Card } from '@nexflow/ui/card'
import { Badge } from '@nexflow/ui/badge'
import { Button } from '@nexflow/ui/button'
import { Skeleton } from '@nexflow/ui/skeleton'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
} from '@nexflow/ui/modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@nexflow/ui/select'
import { Label } from '@nexflow/ui/label'
import { toast } from '@nexflow/ui/toast'
import {
  AlertTriangle,
  GitPullRequest,
  Clock,
  Link as LinkIcon,
  UserPlus,
  MessageSquare,
  Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@nexflow/ui/utils'

export function BottlenecksDetail() {
  const [filter, setFilter] = useState<'all' | 'STUCK_PR' | 'STALE_TASK' | 'DEPENDENCY_BLOCK'>('all')
  const [reassignModalOpen, setReassignModalOpen] = useState(false)
  const [selectedBottleneck, setSelectedBottleneck] = useState<{
    id: string
    taskId?: string
    title: string
  } | null>(null)

  const { data: bottlenecks, isLoading } = trpc.bottlenecks.list.useQuery({
    type: filter === 'all' ? undefined : filter,
    status: 'ACTIVE',
  })

  const { data: stats } = trpc.bottlenecks.getStats.useQuery()
  const { data: members } = trpc.team.listMembers.useQuery({})

  const utils = trpc.useUtils()
  const resolveMutation = trpc.bottlenecks.resolve.useMutation({
    onSuccess: () => {
      toast({ title: 'Bottleneck resolved', description: 'The bottleneck has been marked as resolved.' })
      utils.bottlenecks.invalidate()
    },
    onError: (error: { message: string }) => {
      toast({ title: 'Failed to resolve', description: error.message, variant: 'destructive' })
    },
  })

  const triggerActionMutation = trpc.bottlenecks.triggerAction.useMutation({
    onSuccess: (_, variables) => {
      if (variables.action === 'nudge') {
        toast({
          title: 'Nudge sent',
          description: 'A reminder has been sent to the assignee.'
        })
      } else if (variables.action === 'reassign') {
        toast({
          title: 'Reassignment initiated',
          description: 'The task reassignment has been queued.'
        })
      }
      utils.bottlenecks.invalidate()
    },
    onError: (error: { message: string }) => {
      toast({ title: 'Action failed', description: error.message, variant: 'destructive' })
    },
  })

  const updateTaskMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Task reassigned', description: 'The task has been reassigned successfully.' })
      setReassignModalOpen(false)
      setSelectedBottleneck(null)
      utils.bottlenecks.invalidate()
      utils.tasks.invalidate()
    },
    onError: (error: { message: string }) => {
      toast({ title: 'Reassignment failed', description: error.message, variant: 'destructive' })
    },
  })

  const handleReassign = (bottleneck: { id: string; task?: { id: string; title: string } }) => {
    if (bottleneck.task) {
      setSelectedBottleneck({
        id: bottleneck.id,
        taskId: bottleneck.task.id,
        title: bottleneck.task.title,
      })
      setReassignModalOpen(true)
    } else {
      // For non-task bottlenecks, just trigger the agent action
      triggerActionMutation.mutate({
        bottleneckId: bottleneck.id,
        action: 'reassign',
      })
    }
  }

  const handleConfirmReassign = (newAssigneeId: string) => {
    if (selectedBottleneck?.taskId) {
      updateTaskMutation.mutate({
        id: selectedBottleneck.taskId,
        assigneeId: newAssigneeId,
      })
      // Also trigger the agent action for logging
      triggerActionMutation.mutate({
        bottleneckId: selectedBottleneck.id,
        action: 'reassign',
        targetUserId: newAssigneeId,
      })
    }
  }

  const bottlenecksList = Array.isArray(bottlenecks) ? bottlenecks : []

  if (isLoading) {
    return <BottlenecksSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Total Active"
          value={stats?.total ?? 0}
          icon={AlertTriangle}
          color="warning"
        />
        <StatCard
          label="Stuck PRs"
          value={stats?.byType?.STUCK_PR ?? 0}
          icon={GitPullRequest}
          color="critical"
        />
        <StatCard
          label="Stale Tasks"
          value={stats?.byType?.STALE_TASK ?? 0}
          icon={Clock}
          color="warning"
        />
        <StatCard
          label="Resolved Today"
          value={stats?.resolved24h ?? 0}
          icon={LinkIcon}
          color="healthy"
        />
      </div>

      {/* Vercel-style filter tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-6">
          {[
            { value: 'all', label: 'All', count: stats?.total ?? 0 },
            { value: 'STUCK_PR', label: 'Stuck PRs', count: stats?.byType?.STUCK_PR ?? 0 },
            { value: 'STALE_TASK', label: 'Stale Tasks', count: stats?.byType?.STALE_TASK ?? 0 },
            { value: 'DEPENDENCY_BLOCK', label: 'Dependencies', count: stats?.byType?.DEPENDENCY_BLOCK ?? 0 },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as typeof filter)}
              className={cn(
                'whitespace-nowrap border-b-2 py-2 text-sm font-medium transition-colors',
                filter === tab.value
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-foreground-muted hover:text-foreground'
              )}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Bottleneck List */}
      <div className="space-y-3">
        {bottlenecksList.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-foreground-muted">
            No active bottlenecks
          </div>
        ) : (
          bottlenecksList.map((bottleneck) => (
            <BottleneckItem
              key={bottleneck.id}
              bottleneck={bottleneck}
              isLoading={resolveMutation.isPending || triggerActionMutation.isPending}
              onResolve={() => resolveMutation.mutate({ id: bottleneck.id })}
              onNudge={() =>
                triggerActionMutation.mutate({
                  bottleneckId: bottleneck.id,
                  action: 'nudge',
                })
              }
              onReassign={() => handleReassign(bottleneck)}
            />
          ))
        )}
      </div>

      {/* Reassign Modal */}
      <ReassignModal
        open={reassignModalOpen}
        onClose={() => {
          setReassignModalOpen(false)
          setSelectedBottleneck(null)
        }}
        taskTitle={selectedBottleneck?.title || ''}
        members={members || []}
        isLoading={updateTaskMutation.isPending}
        onConfirm={handleConfirmReassign}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: 'critical' | 'warning' | 'healthy'
}) {
  const colors = {
    critical: 'text-status-critical',
    warning: 'text-status-warning',
    healthy: 'text-status-healthy',
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn('rounded-lg p-2 bg-background-secondary', colors[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold">{value}</div>
          <div className="text-xs text-foreground-muted">{label}</div>
        </div>
      </div>
    </Card>
  )
}

function BottleneckItem({
  bottleneck,
  isLoading,
  onResolve,
  onNudge,
  onReassign,
}: {
  bottleneck: {
    id: string
    type: string
    severity: string
    title: string
    description?: string | null
    detectedAt: Date
    project?: { name: string; key: string } | null
    task?: { id: string; title: string; assignee?: { name: string | null } | null } | null
    pullRequest?: { id: string; title: string; number: number; author?: { name: string | null } | null } | null
  }
  isLoading?: boolean
  onResolve: () => void
  onNudge: () => void
  onReassign: () => void
}) {
  const severityColors = {
    CRITICAL: 'critical',
    HIGH: 'critical',
    MEDIUM: 'warning',
    LOW: 'secondary',
  } as const

  const typeIcons = {
    STUCK_PR: GitPullRequest,
    STALE_TASK: Clock,
    DEPENDENCY_BLOCK: LinkIcon,
    REVIEW_DELAY: Clock,
    CI_FAILURE: AlertTriangle,
  }
  const Icon = typeIcons[bottleneck.type as keyof typeof typeIcons] || AlertTriangle

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-lg bg-background-secondary p-2">
            <Icon className="h-4 w-4 text-foreground-muted" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{bottleneck.title}</span>
              <Badge variant={severityColors[bottleneck.severity as keyof typeof severityColors]}>
                {bottleneck.severity}
              </Badge>
            </div>
            {bottleneck.description && (
              <p className="text-sm text-foreground-muted">{bottleneck.description}</p>
            )}
            {/* Show assignee for tasks */}
            {bottleneck.task?.assignee?.name && (
              <p className="text-sm text-foreground-muted">
                Assigned to: <span className="font-medium">{bottleneck.task.assignee.name}</span>
              </p>
            )}
            {/* Show author for PRs */}
            {bottleneck.pullRequest?.author?.name && (
              <p className="text-sm text-foreground-muted">
                Author: <span className="font-medium">{bottleneck.pullRequest.author.name}</span>
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-foreground-muted">
              {bottleneck.project && (
                <span className="font-medium">{bottleneck.project.key}</span>
              )}
              <span>
                {(() => {
                  try {
                    const date = new Date(bottleneck.detectedAt)
                    if (isNaN(date.getTime())) return 'Unknown'
                    return `Detected ${formatDistanceToNow(date, { addSuffix: true })}`
                  } catch {
                    return 'Unknown'
                  }
                })()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onNudge} disabled={isLoading}>
            <MessageSquare className="mr-1 h-3 w-3" />
            Nudge
          </Button>
          <Button variant="outline" size="sm" onClick={onReassign} disabled={isLoading}>
            <UserPlus className="mr-1 h-3 w-3" />
            Reassign
          </Button>
          <Button variant="secondary" size="sm" onClick={onResolve} disabled={isLoading}>
            Resolve
          </Button>
        </div>
      </div>
    </Card>
  )
}

function BottlenecksSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-10 w-80" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  )
}

function ReassignModal({
  open,
  onClose,
  taskTitle,
  members,
  isLoading,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  taskTitle: string
  members: Array<{ id: string; name: string | null; email: string; workload: { activeTasks: number } }>
  isLoading: boolean
  onConfirm: (userId: string) => void
}) {
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  const handleConfirm = () => {
    if (selectedUserId) {
      onConfirm(selectedUserId)
    }
  }

  // Sort members by workload (least busy first)
  const sortedMembers = [...members].sort(
    (a, b) => a.workload.activeTasks - b.workload.activeTasks
  )

  return (
    <Modal open={open} onOpenChange={onClose}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Reassign Task</ModalTitle>
        </ModalHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-foreground-muted">
              Select a new assignee for:
            </p>
            <p className="mt-1 font-medium text-foreground">{taskTitle}</p>
          </div>

          <div className="space-y-2">
            <Label>New Assignee</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {sortedMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{member.name || member.email}</span>
                      <span className="text-xs text-foreground-muted">
                        {member.workload.activeTasks} tasks
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-foreground-muted">
              Members are sorted by workload (least busy first)
            </p>
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedUserId || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reassigning...
              </>
            ) : (
              'Reassign Task'
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
