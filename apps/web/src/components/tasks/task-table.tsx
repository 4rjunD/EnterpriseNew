'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge } from '@nexflow/ui/badge'
import { Button } from '@nexflow/ui/button'
import { AvatarWithStatus } from '@nexflow/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@nexflow/ui/dropdown-menu'
import { MoreHorizontal, ExternalLink, Trash, Edit, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@nexflow/ui/utils'
import { TaskEditModal } from './task-edit-modal'

interface Task {
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  storyPoints?: number | null
  dueDate?: Date | null
  labels?: string[]
  isStale: boolean
  source: string
  externalUrl?: string | null
  assignee?: { id: string; name: string | null; image: string | null } | null
  project?: { id: string; name: string; key: string } | null
}

interface TaskTableProps {
  tasks: Task[]
  onRefresh: () => void
}

export function TaskTable({ tasks, onRefresh }: TaskTableProps) {
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const utils = trpc.useUtils()
  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => utils.tasks.invalidate(),
  })
  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => utils.tasks.invalidate(),
  })

  const priorityColors = {
    URGENT: 'critical',
    HIGH: 'critical',
    MEDIUM: 'warning',
    LOW: 'secondary',
  } as const

  const statusColors = {
    BACKLOG: 'secondary',
    TODO: 'outline',
    IN_PROGRESS: 'default',
    IN_REVIEW: 'warning',
    DONE: 'healthy',
  } as const

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-foreground-muted">
        No tasks found
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full">
        <thead className="bg-background-secondary">
          <tr className="border-b border-border text-left text-sm text-foreground-muted">
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Priority</th>
            <th className="px-4 py-3 font-medium">Assignee</th>
            <th className="px-4 py-3 font-medium">Project</th>
            <th className="px-4 py-3 font-medium">Due Date</th>
            <th className="px-4 py-3 font-medium w-12"></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              className={cn(
                'border-b border-border transition-colors hover:bg-background-secondary',
                task.isStale && 'bg-status-warning-light/30'
              )}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {task.isStale && (
                    <AlertTriangle className="h-4 w-4 text-status-warning" />
                  )}
                  <span className="font-medium text-foreground">{task.title}</span>
                  {task.source !== 'INTERNAL' && (
                    <Badge variant="outline" className="text-xs">
                      {task.source}
                    </Badge>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant={statusColors[task.status as keyof typeof statusColors]}>
                  {task.status.replace('_', ' ')}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant={priorityColors[task.priority as keyof typeof priorityColors]}>
                  {task.priority}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <AvatarWithStatus
                      src={task.assignee.image || undefined}
                      fallback={getInitials(task.assignee.name || '')}
                      className="h-6 w-6"
                    />
                    <span className="text-sm">
                      {task.assignee.name || 'Unknown'}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-foreground-muted">Unassigned</span>
                )}
              </td>
              <td className="px-4 py-3">
                {task.project ? (
                  <span className="text-sm font-medium">{task.project.key}</span>
                ) : (
                  <span className="text-sm text-foreground-muted">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                {task.dueDate ? (
                  (() => {
                    try {
                      const dueDate = new Date(task.dueDate)
                      if (isNaN(dueDate.getTime())) return <span className="text-sm text-foreground-muted">—</span>
                      return (
                        <span
                          className={cn(
                            'text-sm',
                            dueDate < new Date() && task.status !== 'DONE'
                              ? 'text-status-critical'
                              : 'text-foreground-muted'
                          )}
                        >
                          {format(dueDate, 'MMM d')}
                        </span>
                      )
                    } catch {
                      return <span className="text-sm text-foreground-muted">—</span>
                    }
                  })()
                ) : (
                  <span className="text-sm text-foreground-muted">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingTask(task)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    {task.externalUrl && (
                      <DropdownMenuItem asChild>
                        <a href={task.externalUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View in {task.source}
                        </a>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => deleteMutation.mutate({ id: task.id })}
                      className="text-status-critical"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <TaskEditModal
        open={!!editingTask}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSuccess={() => {
          setEditingTask(null)
          utils.tasks.invalidate()
        }}
      />
    </div>
  )
}

function getInitials(name: string): string {
  if (!name || !name.trim()) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'
}
