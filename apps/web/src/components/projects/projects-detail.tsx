'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@nexflow/ui/card'
import { Badge } from '@nexflow/ui/badge'
import { Button } from '@nexflow/ui/button'
import { Input } from '@nexflow/ui/input'
import { Skeleton } from '@nexflow/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@nexflow/ui/select'
import {
  FolderOpen,
  Search,
  Plus,
  Calendar,
  Users,
  CheckSquare,
  GitPullRequest,
  AlertTriangle,
} from 'lucide-react'
import { format } from 'date-fns'
import { ProjectCreateModal } from './project-create-modal'

export function ProjectsDetail() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const utils = trpc.useUtils()
  const { data: projects, isLoading } = trpc.projects.list.useQuery({
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : (statusFilter as any),
  })

  const projectsList = Array.isArray(projects) ? projects : []

  const handleProjectCreated = () => {
    setShowCreateModal(false)
    utils.projects.invalidate()
  }

  if (isLoading) {
    return <ProjectsSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PLANNING">Planning</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ON_HOLD">On Hold</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <ProjectCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleProjectCreated}
      />

      {/* Projects Grid */}
      {projectsList.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-foreground-muted">
          No projects found
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projectsList.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({
  project,
}: {
  project: {
    id: string
    name: string
    key: string
    status: string
    description?: string | null
    startDate?: Date | null
    targetDate?: Date | null
    team?: { name: string } | null
    _count: {
      tasks: number
      pullRequests: number
      bottlenecks: number
    }
  }
}) {
  const statusColors = {
    PLANNING: 'secondary',
    ACTIVE: 'healthy',
    ON_HOLD: 'warning',
    COMPLETED: 'default',
    ARCHIVED: 'secondary',
  } as const

  return (
    <Card className="p-4 hover:shadow-card-hover transition-shadow cursor-pointer">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium text-accent">
                {project.key}
              </span>
              <Badge variant={statusColors[project.status as keyof typeof statusColors]}>
                {project.status}
              </Badge>
            </div>
            <h3 className="mt-1 font-medium text-foreground">{project.name}</h3>
            {project.description && (
              <p className="mt-1 text-sm text-foreground-muted line-clamp-2">
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-foreground-muted">
          <div className="flex items-center gap-1">
            <CheckSquare className="h-4 w-4" />
            <span>{project._count.tasks}</span>
          </div>
          <div className="flex items-center gap-1">
            <GitPullRequest className="h-4 w-4" />
            <span>{project._count.pullRequests}</span>
          </div>
          {project._count.bottlenecks > 0 && (
            <div className="flex items-center gap-1 text-status-warning">
              <AlertTriangle className="h-4 w-4" />
              <span>{project._count.bottlenecks}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-foreground-muted">
          {project.team && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{project.team.name}</span>
            </div>
          )}
          {project.targetDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                {(() => {
                  try {
                    const date = new Date(project.targetDate)
                    if (isNaN(date.getTime())) return 'No date'
                    return format(date, 'MMM d, yyyy')
                  } catch {
                    return 'No date'
                  }
                })()}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function ProjectsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  )
}
