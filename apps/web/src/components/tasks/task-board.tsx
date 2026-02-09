'use client'

import { trpc } from '@/lib/trpc'
import { Card } from '@nexflow/ui/card'
import { Badge } from '@nexflow/ui/badge'
import { AvatarWithStatus } from '@nexflow/ui/avatar'
import { cn } from '@nexflow/ui/utils'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  isStale: boolean
  assignee?: { id: string; name: string | null; image: string | null } | null
  project?: { id: string; name: string; key: string } | null
}

interface TaskBoardProps {
  tasks: Task[]
  onRefresh: () => void
}

const COLUMNS = [
  { id: 'BACKLOG', title: 'Backlog' },
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'IN_REVIEW', title: 'In Review' },
  { id: 'DONE', title: 'Done' },
]

export function TaskBoard({ tasks, onRefresh }: TaskBoardProps) {
  const utils = trpc.useUtils()
  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => utils.tasks.invalidate(),
  })

  // Defensive check: ensure tasks is a valid array
  const safeTasks = tasks && Array.isArray(tasks) ? tasks : []

  const getTasksByStatus = (status: string) =>
    safeTasks.filter((task) => task.status === status)

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId)
  }

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    if (taskId) {
      updateMutation.mutate({ id: taskId, status: status as any })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div className="grid grid-cols-5 gap-4">
      {COLUMNS.map((column) => {
        const columnTasks = getTasksByStatus(column.id)
        return (
          <div
            key={column.id}
            className="rounded-lg bg-background-secondary p-3"
            onDrop={(e) => handleDrop(e, column.id)}
            onDragOver={handleDragOver}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">{column.title}</h3>
              <span className="text-xs text-foreground-muted">{columnTasks.length}</span>
            </div>
            <div className="space-y-2">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDragStart={(e) => handleDragStart(e, task.id)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TaskCard({
  task,
  onDragStart,
}: {
  task: Task
  onDragStart: (e: React.DragEvent) => void
}) {
  const priorityColors = {
    URGENT: 'border-l-status-critical',
    HIGH: 'border-l-status-critical',
    MEDIUM: 'border-l-status-warning',
    LOW: 'border-l-border',
  }

  return (
    <Card
      className={cn(
        'cursor-grab p-3 border-l-4 active:cursor-grabbing',
        priorityColors[task.priority as keyof typeof priorityColors],
        task.isStale && 'bg-status-warning-light/30'
      )}
      draggable
      onDragStart={onDragStart}
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground line-clamp-2">
          {task.title}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {task.project && (
              <Badge variant="outline" className="text-xs">
                {task.project.key}
              </Badge>
            )}
          </div>
          {task.assignee && (
            <AvatarWithStatus
              src={task.assignee.image || undefined}
              fallback={getInitials(task.assignee.name || '')}
              className="h-6 w-6"
            />
          )}
        </div>
      </div>
    </Card>
  )
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'
}
