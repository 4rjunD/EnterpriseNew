'use client'

import { cn } from '@nexflow/ui/utils'
import { trpc } from '@/lib/trpc'
import { CheckCircle2, Circle, AlertCircle, Clock, Inbox, Plug } from 'lucide-react'
import Link from 'next/link'

function EmptyState({ hasIntegrations }: { hasIntegrations: boolean }) {
  if (!hasIntegrations) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
          <Plug className="w-8 h-8 text-[#555]" />
        </div>
        <h3 className="text-[16px] font-medium text-[#ededed] mb-2">Connect an integration to get started</h3>
        <p className="text-[13px] text-[#888] text-center max-w-md mb-6">
          NexFlow needs access to your GitHub, Linear, or other tools to show your daily actions and priorities.
        </p>
        <Link
          href="/api/integrations/github/authorize"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#ededed] text-[#000] rounded-md text-[13px] font-medium hover:bg-[#fff] transition-colors"
        >
          Connect GitHub
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8 text-[#50e3c2]" />
      </div>
      <h3 className="text-[16px] font-medium text-[#ededed] mb-2">All clear!</h3>
      <p className="text-[13px] text-[#888] text-center max-w-md">
        No urgent actions right now. Check back later or sync your integrations to see the latest updates.
      </p>
    </div>
  )
}

function TaskRow({ task }: { task: { id: string; title: string; status: string; priority: string; dueDate: string | null; source: string } }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()
  const isDueToday = task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString()

  const urgencyConfig = isOverdue
    ? { label: 'OVERDUE', color: '#ff4444', bg: 'rgba(255,68,68,0.1)' }
    : isDueToday
    ? { label: 'TODAY', color: '#f5a623', bg: 'rgba(245,166,35,0.1)' }
    : task.priority === 'URGENT'
    ? { label: 'URGENT', color: '#ff4444', bg: 'rgba(255,68,68,0.1)' }
    : task.priority === 'HIGH'
    ? { label: 'HIGH', color: '#f5a623', bg: 'rgba(245,166,35,0.1)' }
    : { label: 'NORMAL', color: '#555', bg: 'transparent' }

  return (
    <div className={cn(
      'flex items-center gap-3 p-4 border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#111] transition-colors',
      isOverdue && 'bg-[#ff4444]/5'
    )}>
      <div className="w-5 h-5 rounded-full border border-[#333] flex items-center justify-center flex-shrink-0">
        {task.status === 'DONE' ? (
          <CheckCircle2 className="w-4 h-4 text-[#50e3c2]" />
        ) : (
          <Circle className="w-4 h-4 text-[#555]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-mono font-medium uppercase tracking-[0.5px] px-1.5 py-0.5 rounded"
            style={{ color: urgencyConfig.color, backgroundColor: urgencyConfig.bg }}
          >
            {urgencyConfig.label}
          </span>
          <span className="text-[13px] text-[#ededed] truncate">{task.title}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-[#555] font-mono uppercase">{task.source}</span>
          {task.dueDate && (
            <>
              <span className="text-[#333]">·</span>
              <span className={cn(
                'text-[11px] font-mono',
                isOverdue ? 'text-[#ff4444]' : 'text-[#555]'
              )}>
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-[#1a1a1a] rounded" />
        ))}
      </div>
      <div className="border border-[#1a1a1a] rounded-md overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 border-b border-[#1a1a1a] last:border-b-0 bg-[#0a0a0a]" />
        ))}
      </div>
    </div>
  )
}

export function TodayTab() {
  const { data: integrations, isLoading: integrationsLoading } = trpc.integrations.list.useQuery()
  const { data: tasks, isLoading: tasksLoading } = trpc.tasks.list.useQuery({
    status: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED'],
    limit: 20,
  })

  const isLoading = integrationsLoading || tasksLoading

  if (isLoading) {
    return <LoadingSkeleton />
  }

  const hasIntegrations = (integrations?.connected?.length || 0) > 0
  const taskList = tasks?.tasks || []

  // Sort by priority and due date
  const sortedTasks = [...taskList].sort((a, b) => {
    const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2

    if (aPriority !== bPriority) return aPriority - bPriority

    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    }
    return a.dueDate ? -1 : 1
  })

  // Calculate stats
  const overdueTasks = taskList.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length
  const todayTasks = taskList.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString()).length
  const urgentTasks = taskList.filter(t => t.priority === 'URGENT' || t.priority === 'HIGH').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Today</h2>
        <p className="text-[13px] text-[#888] mt-1">
          Your prioritized action queue
        </p>
      </div>

      {/* Stats */}
      {hasIntegrations && taskList.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
            <div className={cn(
              'text-[20px] font-mono font-semibold',
              overdueTasks > 0 ? 'text-[#ff4444]' : 'text-[#ededed]'
            )}>
              {overdueTasks}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Overdue</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
            <div className={cn(
              'text-[20px] font-mono font-semibold',
              todayTasks > 0 ? 'text-[#f5a623]' : 'text-[#ededed]'
            )}>
              {todayTasks}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Due Today</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
            <div className="text-[20px] font-mono font-semibold text-[#ededed]">{urgentTasks}</div>
            <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">High Priority</div>
          </div>
        </div>
      )}

      {/* Task list or empty state */}
      {!hasIntegrations || taskList.length === 0 ? (
        <EmptyState hasIntegrations={hasIntegrations} />
      ) : (
        <div className="border border-[#1a1a1a] rounded-md overflow-hidden">
          {sortedTasks.slice(0, 10).map(task => (
            <TaskRow
              key={task.id}
              task={{
                id: task.id,
                title: task.title,
                status: task.status,
                priority: task.priority,
                dueDate: task.dueDate,
                source: task.source,
              }}
            />
          ))}
          {taskList.length > 10 && (
            <div className="p-3 text-center text-[12px] text-[#555] bg-[#0a0a0a]">
              +{taskList.length - 10} more tasks
            </div>
          )}
        </div>
      )}
    </div>
  )
}
