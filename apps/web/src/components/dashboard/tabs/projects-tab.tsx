'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/nf/card'
import { Badge } from '@/components/nf/badge'
import { Button } from '@/components/nf/button'
import { BreathingDot } from '@/components/nf/breathing-dot'

// Project type for agencies
interface Project {
  id: string
  name: string
  client: string
  status: 'active' | 'at-risk' | 'on-track' | 'completed'
  deadline: Date
  progress: number
  team: string[]
  budget: { used: number; total: number }
  health: number // 0-100
}

// Mock projects data
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Website Redesign',
    client: 'Acme Corp',
    status: 'active',
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    progress: 65,
    team: ['Sarah', 'Mike'],
    budget: { used: 48000, total: 75000 },
    health: 78,
  },
  {
    id: '2',
    name: 'Mobile App MVP',
    client: 'StartupX',
    status: 'at-risk',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    progress: 45,
    team: ['John', 'Lisa', 'Mike'],
    budget: { used: 82000, total: 100000 },
    health: 42,
  },
  {
    id: '3',
    name: 'E-commerce Platform',
    client: 'RetailCo',
    status: 'on-track',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    progress: 80,
    team: ['Sarah'],
    budget: { used: 120000, total: 150000 },
    health: 92,
  },
  {
    id: '4',
    name: 'Brand Identity',
    client: 'NewCo',
    status: 'completed',
    deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    progress: 100,
    team: ['Lisa'],
    budget: { used: 25000, total: 25000 },
    health: 100,
  },
]

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Days until deadline
function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// Project card
function ProjectCard({ project }: { project: Project }) {
  const days = daysUntil(project.deadline)
  const budgetPercent = Math.round((project.budget.used / project.budget.total) * 100)
  const isOverBudget = budgetPercent > 90

  return (
    <Card
      hover
      glow={project.status === 'at-risk' ? 'critical' : project.status === 'completed' ? 'success' : 'none'}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-medium text-foreground">{project.name}</h3>
            <p className="text-sm text-foreground-secondary">{project.client}</p>
          </div>
          <Badge
            variant={
              project.status === 'at-risk' ? 'critical' :
              project.status === 'on-track' ? 'success' :
              project.status === 'completed' ? 'default' : 'warning'
            }
            size="sm"
          >
            {project.status === 'at-risk' ? 'At Risk' :
             project.status === 'on-track' ? 'On Track' :
             project.status === 'completed' ? 'Completed' : 'Active'}
          </Badge>
        </div>

        {/* Progress */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground-secondary">Progress</span>
            <span className="font-mono text-foreground">{project.progress}%</span>
          </div>
          <div className="h-1.5 bg-background-tertiary rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                project.status === 'at-risk' ? 'bg-status-critical' :
                project.status === 'completed' ? 'bg-status-success' : 'bg-accent'
              )}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Deadline */}
          <div>
            <span className="text-xs text-foreground-tertiary block mb-1">Deadline</span>
            <span className={cn(
              'text-sm font-mono',
              days < 0 ? 'text-status-critical' :
              days <= 7 ? 'text-status-warning' : 'text-foreground'
            )}>
              {days < 0 ? `${Math.abs(days)}d overdue` :
               days === 0 ? 'Today' :
               `${days}d left`}
            </span>
          </div>

          {/* Budget */}
          <div>
            <span className="text-xs text-foreground-tertiary block mb-1">Budget</span>
            <span className={cn(
              'text-sm font-mono',
              isOverBudget ? 'text-status-warning' : 'text-foreground'
            )}>
              {budgetPercent}%
            </span>
          </div>

          {/* Health */}
          <div>
            <span className="text-xs text-foreground-tertiary block mb-1">Health</span>
            <span className={cn(
              'text-sm font-mono',
              project.health >= 70 ? 'text-status-success' :
              project.health >= 50 ? 'text-status-warning' : 'text-status-critical'
            )}>
              {project.health}%
            </span>
          </div>
        </div>

        {/* Team */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1">
            {project.team.slice(0, 3).map((member, i) => (
              <div
                key={member}
                className="w-6 h-6 rounded-full bg-background-tertiary flex items-center justify-center text-xs font-medium text-foreground-secondary border border-background"
                style={{ marginLeft: i > 0 ? '-4px' : 0 }}
              >
                {member[0]}
              </div>
            ))}
            {project.team.length > 3 && (
              <span className="text-xs text-foreground-tertiary ml-1">
                +{project.team.length - 3}
              </span>
            )}
          </div>
          <span className="text-xs text-foreground-tertiary">
            {formatCurrency(project.budget.used)} / {formatCurrency(project.budget.total)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// Stats summary
function ProjectStats({ projects }: { projects: Project[] }) {
  const active = projects.filter(p => p.status !== 'completed').length
  const atRisk = projects.filter(p => p.status === 'at-risk').length
  const totalBudget = projects.reduce((acc, p) => acc + p.budget.total, 0)
  const usedBudget = projects.reduce((acc, p) => acc + p.budget.used, 0)

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card padding="sm">
        <CardContent className="p-4">
          <div className="text-3xl font-mono font-medium text-foreground">{active}</div>
          <div className="text-sm text-foreground-secondary">Active Projects</div>
        </CardContent>
      </Card>
      <Card padding="sm" glow={atRisk > 0 ? 'critical' : 'none'}>
        <CardContent className="p-4">
          <div className={cn(
            'text-3xl font-mono font-medium',
            atRisk > 0 ? 'text-status-critical' : 'text-foreground'
          )}>
            {atRisk}
          </div>
          <div className="text-sm text-foreground-secondary">At Risk</div>
        </CardContent>
      </Card>
      <Card padding="sm">
        <CardContent className="p-4">
          <div className="text-3xl font-mono font-medium text-foreground">
            {formatCurrency(usedBudget)}
          </div>
          <div className="text-sm text-foreground-secondary">Total Spent</div>
        </CardContent>
      </Card>
      <Card padding="sm">
        <CardContent className="p-4">
          <div className="text-3xl font-mono font-medium text-status-success">
            {Math.round((usedBudget / totalBudget) * 100)}%
          </div>
          <div className="text-sm text-foreground-secondary">Budget Used</div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ProjectsTab() {
  const [filter, setFilter] = useState<'all' | 'active' | 'at-risk' | 'completed'>('all')
  const [projects] = useState<Project[]>(mockProjects)

  const filteredProjects = filter === 'all'
    ? projects
    : projects.filter(p => p.status === filter)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Projects</h2>
          <p className="text-sm text-foreground-secondary mt-1">
            Track client projects, deadlines, and budgets
          </p>
        </div>
        <Button variant="primary" size="sm">
          New Project
        </Button>
      </div>

      {/* Stats */}
      <ProjectStats projects={projects} />

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 bg-background-secondary rounded-lg w-fit">
        {(['all', 'active', 'at-risk', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              filter === f
                ? 'bg-foreground text-background font-medium'
                : 'text-foreground-secondary hover:text-foreground'
            )}
          >
            {f === 'all' ? 'All' :
             f === 'at-risk' ? 'At Risk' :
             f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Projects grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProjects.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-foreground-secondary">No projects match this filter</p>
        </div>
      )}

      {/* NexFlow insight */}
      <div className="p-4 bg-nf-muted border border-nf/20 rounded-lg">
        <div className="flex items-start gap-3">
          <BreathingDot variant="nf" size="md" />
          <div>
            <h4 className="text-sm font-medium text-nf mb-1">Project Health Monitoring</h4>
            <p className="text-xs text-foreground-secondary leading-relaxed">
              NexFlow tracks scope changes, team velocity, and communication patterns
              to predict project health. Projects showing early warning signs are
              flagged before they become critical.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
