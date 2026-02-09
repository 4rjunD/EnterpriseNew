'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import { TaskTable } from './task-table'
import { TaskBoard } from './task-board'
import { TaskCreateModal } from './task-create-modal'
import { Button } from '@nexflow/ui/button'
import { Input } from '@nexflow/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@nexflow/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@nexflow/ui/tabs'
import { Skeleton } from '@nexflow/ui/skeleton'
import { Plus, Search, Filter, LayoutGrid, Table } from 'lucide-react'

export function TasksDetail() {
  const { data: session } = useSession()
  const [view, setView] = useState<'table' | 'board'>('table')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: tasksData, isLoading, refetch } = trpc.tasks.list.useQuery({
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : (statusFilter as any),
    priority: priorityFilter === 'all' ? undefined : (priorityFilter as any),
  })

  const { data: stats, error: statsError } = trpc.tasks.getStats.useQuery({})

  // Debug logging - check browser console
  console.log('[TasksDetail] tasksData:', tasksData)
  console.log('[TasksDetail] stats:', stats)
  console.log('[TasksDetail] statsError:', statsError)

  const tasks = tasksData?.tasks ?? []

  if (isLoading) {
    return <TasksSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-foreground-muted" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="BACKLOG">Backlog</SelectItem>
              <SelectItem value="TODO">To Do</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="IN_REVIEW">In Review</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center rounded-lg border border-border p-1">
          <Button
            variant={view === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setView('table')}
          >
            <Table className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'board' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setView('board')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>

        {/* Create Button */}
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Task
        </Button>
      </div>

      {/* Stats Row */}
      <div className="flex gap-4 text-sm">
        <span className="text-foreground-muted">
          <span className="font-medium text-foreground">
            {stats?.byStatus?.BACKLOG || 0}
          </span>{' '}
          Backlog
        </span>
        <span className="text-foreground-muted">
          <span className="font-medium text-foreground">
            {stats?.byStatus?.IN_PROGRESS || 0}
          </span>{' '}
          In Progress
        </span>
        <span className="text-foreground-muted">
          <span className="font-medium text-foreground">
            {stats?.byStatus?.IN_REVIEW || 0}
          </span>{' '}
          In Review
        </span>
        <span className="text-foreground-muted">
          <span className="font-medium text-foreground">{stats?.staleCount || 0}</span>{' '}
          Stale
        </span>
      </div>

      {/* Content */}
      {view === 'table' ? (
        <TaskTable tasks={tasks} onRefresh={refetch} />
      ) : (
        <TaskBoard tasks={tasks} onRefresh={refetch} />
      )}

      {/* Create Modal */}
      <TaskCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          refetch()
          setShowCreateModal(false)
        }}
      />
    </div>
  )
}

function TasksSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-8 w-96" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}
