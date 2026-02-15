'use client'

import { cn } from '@nexflow/ui/utils'
import { trpc } from '@/lib/trpc'
import { Calendar, Plug, LayoutGrid, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

function EmptyState({ hasIntegrations }: { hasIntegrations: boolean }) {
  if (!hasIntegrations) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
          <Plug className="w-8 h-8 text-[#555]" />
        </div>
        <h3 className="text-[16px] font-medium text-[#ededed] mb-2">Connect an integration to track sprints</h3>
        <p className="text-[13px] text-[#888] text-center max-w-md mb-6">
          Connect Linear, Jira, or GitHub to see your sprint progress and task distribution.
        </p>
        <Link
          href="/api/integrations/linear/authorize"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#ededed] text-[#000] rounded-md text-[13px] font-medium hover:bg-[#fff] transition-colors"
        >
          Connect Linear
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
        <LayoutGrid className="w-8 h-8 text-[#555]" />
      </div>
      <h3 className="text-[16px] font-medium text-[#ededed] mb-2">No active tasks</h3>
      <p className="text-[13px] text-[#888] text-center max-w-md">
        Sync your integrations to import tasks, or create tasks manually to track your sprint progress.
      </p>
    </div>
  )
}

interface TaskCardProps {
  task: {
    id: string
    title: string
    status: string
    priority: string
    assigneeId?: string | null
    storyPoints?: number | null
    source: string
    externalId?: string | null
  }
}

function TaskCard({ task }: TaskCardProps) {
  return (
    <div className="p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-md hover:border-[#252525] transition-colors">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[11px] font-mono text-[#555]">{task.externalId || task.id.slice(0, 8)}</span>
        {task.storyPoints && (
          <span className="text-[10px] font-mono bg-[#1a1a1a] px-1.5 py-0.5 rounded text-[#888]">
            {task.storyPoints} pts
          </span>
        )}
      </div>
      <p className="text-[13px] text-[#ededed] line-clamp-2">{task.title}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] font-mono text-[#555] uppercase">{task.source}</span>
        <span className={cn(
          'text-[10px] font-mono uppercase',
          task.priority === 'URGENT' && 'text-[#ff4444]',
          task.priority === 'HIGH' && 'text-[#f5a623]',
          task.priority === 'MEDIUM' && 'text-[#888]',
          task.priority === 'LOW' && 'text-[#555]'
        )}>
          {task.priority}
        </span>
      </div>
    </div>
  )
}

const STATUS_CONFIG = {
  TODO: { label: 'To Do', color: 'bg-[#555]' },
  BACKLOG: { label: 'Backlog', color: 'bg-[#333]' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-[#0070f3]' },
  IN_REVIEW: { label: 'Review', color: 'bg-[#a78bfa]' },
  BLOCKED: { label: 'Blocked', color: 'bg-[#ff4444]' },
  DONE: { label: 'Done', color: 'bg-[#50e3c2]' },
  CANCELLED: { label: 'Cancelled', color: 'bg-[#333]' },
}

function SprintColumn({ status, label, tasks }: { status: string; label: string; tasks: TaskCardProps['task'][] }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.TODO
  const points = tasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0)

  return (
    <div className="flex-1 min-w-[220px]">
      <div className="flex items-center gap-2 mb-3">
        <span className={cn('w-2 h-2 rounded-full', config.color)} />
        <span className="text-[13px] font-medium text-[#ededed]">{label}</span>
        <span className="text-[11px] text-[#555]">{tasks.length}</span>
        {points > 0 && <span className="text-[11px] text-[#555]">· {points} pts</span>}
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <div className="p-4 border border-dashed border-[#1a1a1a] rounded-md text-center text-[12px] text-[#555]">
            No tasks
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-[#1a1a1a] rounded w-48" />
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 bg-[#1a1a1a] rounded" />
        ))}
      </div>
      <div className="flex gap-4 overflow-x-auto">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 min-w-[220px] space-y-2">
            <div className="h-6 bg-[#1a1a1a] rounded w-24" />
            {[1, 2, 3].map(j => (
              <div key={j} className="h-24 bg-[#1a1a1a] rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SprintTab() {
  const { data: integrations, isLoading: integrationsLoading } = trpc.integrations.list.useQuery()
  const { data: tasksData, isLoading: tasksLoading } = trpc.tasks.list.useQuery({
    status: ['TODO', 'BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE'],
    limit: 100,
  })

  const isLoading = integrationsLoading || tasksLoading

  if (isLoading) {
    return <LoadingSkeleton />
  }

  const hasIntegrations = (integrations?.connected?.length || 0) > 0
  const tasks = tasksData?.tasks || []

  // Group tasks by status
  const todoTasks = tasks.filter(t => t.status === 'TODO' || t.status === 'BACKLOG')
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS')
  const reviewTasks = tasks.filter(t => t.status === 'IN_REVIEW' || t.status === 'BLOCKED')
  const doneTasks = tasks.filter(t => t.status === 'DONE').slice(0, 10) // Limit done tasks

  // Calculate stats
  const totalPoints = tasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0)
  const donePoints = doneTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0)
  const completionRate = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Sprint Board</h2>
        <p className="text-[13px] text-[#888] mt-1">
          Track task progress across your workflow
        </p>
      </div>

      {/* Stats */}
      {hasIntegrations && tasks.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
            <div className="text-[20px] font-mono font-semibold text-[#ededed]">{tasks.length}</div>
            <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Total Tasks</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
            <div className="text-[20px] font-mono font-semibold text-[#0070f3]">{inProgressTasks.length}</div>
            <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">In Progress</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
            <div className="text-[20px] font-mono font-semibold text-[#50e3c2]">{doneTasks.length}</div>
            <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Completed</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
            <div className="text-[20px] font-mono font-semibold text-[#ededed]">{completionRate}%</div>
            <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Done</div>
          </div>
        </div>
      )}

      {/* Kanban board or empty state */}
      {!hasIntegrations || tasks.length === 0 ? (
        <EmptyState hasIntegrations={hasIntegrations} />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          <SprintColumn status="TODO" label="To Do" tasks={todoTasks} />
          <SprintColumn status="IN_PROGRESS" label="In Progress" tasks={inProgressTasks} />
          <SprintColumn status="IN_REVIEW" label="Review" tasks={reviewTasks} />
          <SprintColumn status="DONE" label="Done" tasks={doneTasks} />
        </div>
      )}
    </div>
  )
}
