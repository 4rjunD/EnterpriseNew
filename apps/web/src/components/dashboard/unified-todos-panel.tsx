'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@nexflow/ui/card'
import { Button } from '@nexflow/ui/button'
import { Skeleton } from '@nexflow/ui/skeleton'
import { cn } from '@nexflow/ui/utils'
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  ListTodo,
} from 'lucide-react'
import { formatDistanceToNow, format, isToday, isTomorrow } from 'date-fns'

type FilterType = 'all' | 'due_today' | 'due_this_week' | 'overdue'

const filterLabels: Record<FilterType, string> = {
  all: 'All',
  overdue: 'Overdue',
  due_today: 'Today',
  due_this_week: 'This Week',
}

export function UnifiedTodosPanel() {
  const [filter, setFilter] = useState<FilterType>('all')

  const { data, isLoading } = trpc.sync.getUnifiedTodos.useQuery({ filter })

  if (isLoading) {
    return <TodosSkeleton />
  }

  if (!data || data.tasks.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ListTodo className="w-4 h-4" />
            Todos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-foreground-muted">
            <CheckCircle2 className="w-8 h-8 mb-2 text-green-400" />
            <p className="text-sm">All caught up!</p>
            <p className="text-xs">No pending todos across your integrations</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ListTodo className="w-4 h-4" />
            Todos
            <span className="text-xs font-normal text-foreground-muted bg-background-secondary px-1.5 py-0.5 rounded">
              {data.counts.total}
            </span>
          </CardTitle>

          {/* Quick stats */}
          <div className="flex items-center gap-3 text-xs">
            {data.counts.overdue > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <AlertTriangle className="w-3 h-3" />
                {data.counts.overdue} overdue
              </span>
            )}
            {data.counts.dueToday > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                <Clock className="w-3 h-3" />
                {data.counts.dueToday} today
              </span>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mt-3">
          {(Object.keys(filterLabels) as FilterType[]).map((f) => (
            <Button
              key={f}
              variant="ghost"
              size="sm"
              onClick={() => setFilter(f)}
              className={cn(
                'text-xs h-7 px-2',
                filter === f
                  ? 'bg-foreground/10 text-foreground'
                  : 'text-foreground-muted hover:text-foreground'
              )}
            >
              {filterLabels[f]}
              {f === 'overdue' && data.counts.overdue > 0 && (
                <span className="ml-1 text-red-400">{data.counts.overdue}</span>
              )}
              {f === 'due_today' && data.counts.dueToday > 0 && (
                <span className="ml-1 text-amber-400">{data.counts.dueToday}</span>
              )}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
          {/* Grouped display */}
          {filter === 'all' ? (
            <>
              {data.grouped.overdue.length > 0 && (
                <TodoGroup title="Overdue" tasks={data.grouped.overdue} variant="overdue" />
              )}
              {data.grouped.dueToday.length > 0 && (
                <TodoGroup title="Due Today" tasks={data.grouped.dueToday} variant="today" />
              )}
              {data.grouped.dueThisWeek.length > 0 && (
                <TodoGroup title="Due This Week" tasks={data.grouped.dueThisWeek} variant="week" />
              )}
              {data.grouped.later.length > 0 && (
                <TodoGroup title="Later" tasks={data.grouped.later} variant="later" />
              )}
              {data.grouped.noDueDate.length > 0 && (
                <TodoGroup title="No Due Date" tasks={data.grouped.noDueDate} variant="none" />
              )}
            </>
          ) : (
            <div className="space-y-2">
              {data.tasks.map((task) => (
                <TodoItem key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function TodoGroup({
  title,
  tasks,
  variant,
}: {
  title: string
  tasks: any[]
  variant: 'overdue' | 'today' | 'week' | 'later' | 'none'
}) {
  const variantStyles = {
    overdue: 'text-red-400',
    today: 'text-amber-400',
    week: 'text-blue-400',
    later: 'text-foreground-muted',
    none: 'text-foreground-muted',
  }

  return (
    <div>
      <h4 className={cn('text-xs font-medium mb-2 flex items-center gap-1', variantStyles[variant])}>
        {variant === 'overdue' && <AlertTriangle className="w-3 h-3" />}
        {variant === 'today' && <Clock className="w-3 h-3" />}
        {variant === 'week' && <Calendar className="w-3 h-3" />}
        {title}
        <span className="text-foreground-muted">({tasks.length})</span>
      </h4>
      <div className="space-y-2">
        {tasks.slice(0, 5).map((task) => (
          <TodoItem key={task.id} task={task} />
        ))}
        {tasks.length > 5 && (
          <p className="text-xs text-foreground-muted pl-2">+{tasks.length - 5} more</p>
        )}
      </div>
    </div>
  )
}

function TodoItem({ task }: { task: any }) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null
  const isOverdue = dueDate && dueDate < new Date()
  const isDueToday = dueDate && isToday(dueDate)
  const isDueTomorrow = dueDate && isTomorrow(dueDate)

  const priorityColors = {
    URGENT: 'border-l-red-500',
    HIGH: 'border-l-orange-500',
    MEDIUM: 'border-l-yellow-500',
    LOW: 'border-l-green-500',
  }

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-2 rounded-lg border-l-2 bg-background-secondary/50 hover:bg-background-secondary transition-colors',
        priorityColors[task.priority as keyof typeof priorityColors] || 'border-l-border'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
          {task.externalUrl && (
            <a
              href={task.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ExternalLink className="w-3 h-3 text-foreground-muted hover:text-foreground" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1">
          {task.project && (
            <span className="text-xs text-foreground-muted">{task.project.key}</span>
          )}

          {dueDate && (
            <span
              className={cn(
                'text-xs flex items-center gap-1',
                isOverdue
                  ? 'text-red-400'
                  : isDueToday
                    ? 'text-amber-400'
                    : isDueTomorrow
                      ? 'text-blue-400'
                      : 'text-foreground-muted'
              )}
            >
              <Calendar className="w-3 h-3" />
              {isOverdue
                ? `${formatDistanceToNow(dueDate)} overdue`
                : isDueToday
                  ? 'Today'
                  : isDueTomorrow
                    ? 'Tomorrow'
                    : format(dueDate, 'MMM d')}
            </span>
          )}

          {task.assignee && (
            <span className="text-xs text-foreground-muted flex items-center gap-1">
              {task.assignee.image ? (
                <img
                  src={task.assignee.image}
                  alt={task.assignee.name || ''}
                  className="w-4 h-4 rounded-full"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-foreground/20 flex items-center justify-center text-[10px]">
                  {task.assignee.name?.[0] || '?'}
                </div>
              )}
              {task.assignee.name?.split(' ')[0]}
            </span>
          )}

          {task.storyPoints && (
            <span className="text-xs text-foreground-muted bg-background px-1 rounded">
              {task.storyPoints}pt
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

function TodosSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-24" />
        <div className="flex gap-1 mt-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-7 w-16" />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
