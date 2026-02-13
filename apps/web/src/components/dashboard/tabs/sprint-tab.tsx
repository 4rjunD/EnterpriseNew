'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/nf/card'
import { Badge } from '@/components/nf/badge'
import { BreathingDot } from '@/components/nf/breathing-dot'
import { Progress } from '@/components/nf/progress'

// Sprint task type
interface SprintTask {
  id: string
  key: string
  title: string
  status: 'todo' | 'in-progress' | 'review' | 'done'
  assignee: string
  storyPoints: number
  daysInStatus: number
  isCarryover: boolean
}

// Mock sprint data
const mockSprintTasks: SprintTask[] = [
  { id: '1', key: 'AUTH-42', title: 'Implement OAuth flow', status: 'in-progress', assignee: 'Alex', storyPoints: 5, daysInStatus: 2, isCarryover: false },
  { id: '2', key: 'AUTH-43', title: 'Add SSO support', status: 'todo', assignee: 'Maya', storyPoints: 8, daysInStatus: 0, isCarryover: false },
  { id: '3', key: 'PAY-12', title: 'Stripe integration', status: 'in-progress', assignee: 'Maya', storyPoints: 5, daysInStatus: 3, isCarryover: false },
  { id: '4', key: 'ONB-18', title: 'Welcome flow', status: 'review', assignee: 'Jordan', storyPoints: 3, daysInStatus: 1, isCarryover: false },
  { id: '5', key: 'ONB-22', title: 'Team invite flow', status: 'todo', assignee: 'Sam', storyPoints: 3, daysInStatus: 0, isCarryover: true },
  { id: '6', key: 'API-08', title: 'Rate limiting', status: 'done', assignee: 'Alex', storyPoints: 2, daysInStatus: 0, isCarryover: false },
  { id: '7', key: 'API-09', title: 'Error handling', status: 'done', assignee: 'Sam', storyPoints: 3, daysInStatus: 0, isCarryover: false },
]

// Status config
const STATUS_CONFIG = {
  'todo': { label: 'To Do', color: 'bg-foreground-tertiary' },
  'in-progress': { label: 'In Progress', color: 'bg-status-info' },
  'review': { label: 'Review', color: 'bg-purple' },
  'done': { label: 'Done', color: 'bg-status-success' },
}

// Sprint column
function SprintColumn({ status, tasks }: { status: keyof typeof STATUS_CONFIG; tasks: SprintTask[] }) {
  const config = STATUS_CONFIG[status]
  const points = tasks.reduce((acc, t) => acc + t.storyPoints, 0)

  return (
    <div className="flex-1 min-w-[200px]">
      <div className="flex items-center gap-2 mb-3">
        <span className={cn('w-2 h-2 rounded-full', config.color)} />
        <span className="text-sm font-medium text-foreground">{config.label}</span>
        <span className="text-xs text-foreground-tertiary">{points} pts</span>
      </div>
      <div className="space-y-2">
        {tasks.map(task => (
          <Card key={task.id} hover padding="sm">
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-mono text-foreground-tertiary">{task.key}</span>
                {task.isCarryover && (
                  <Badge variant="warning" size="sm">Carryover</Badge>
                )}
              </div>
              <p className="text-sm text-foreground mb-2 line-clamp-2">{task.title}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground-secondary">{task.assignee}</span>
                <span className="text-xs font-mono text-foreground-tertiary">{task.storyPoints} pts</span>
              </div>
              {task.status === 'in-progress' && task.daysInStatus > 2 && (
                <div className="mt-2 text-xs text-status-warning">
                  {task.daysInStatus} days in progress
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Sprint stats
function SprintStats({ tasks }: { tasks: SprintTask[] }) {
  const totalPoints = tasks.reduce((acc, t) => acc + t.storyPoints, 0)
  const donePoints = tasks.filter(t => t.status === 'done').reduce((acc, t) => acc + t.storyPoints, 0)
  const progress = Math.round((donePoints / totalPoints) * 100)
  const carryover = tasks.filter(t => t.isCarryover).length

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-foreground">Day 8</div>
          <div className="text-xs text-foreground-secondary">of 14 day sprint</div>
        </CardContent>
      </Card>
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-foreground">{donePoints}/{totalPoints}</div>
          <div className="text-xs text-foreground-secondary">Story Points</div>
        </CardContent>
      </Card>
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-status-success">{progress}%</div>
          <div className="text-xs text-foreground-secondary">Complete</div>
        </CardContent>
      </Card>
      <Card padding="sm" glow={carryover > 0 ? 'warning' : 'none'}>
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-status-warning">{carryover}</div>
          <div className="text-xs text-foreground-secondary">Carryover Risk</div>
        </CardContent>
      </Card>
    </div>
  )
}

export function SprintTab() {
  const [tasks] = useState<SprintTask[]>(mockSprintTasks)

  // Group tasks by status
  const tasksByStatus = {
    'todo': tasks.filter(t => t.status === 'todo'),
    'in-progress': tasks.filter(t => t.status === 'in-progress'),
    'review': tasks.filter(t => t.status === 'review'),
    'done': tasks.filter(t => t.status === 'done'),
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Sprint 3</h2>
          <p className="text-sm text-foreground-secondary mt-1">
            Feb 26 - Mar 11, 2024
          </p>
        </div>
        <Badge variant="success" size="sm">57% Complete</Badge>
      </div>

      {/* Stats */}
      <SprintStats tasks={tasks} />

      {/* Sprint burndown indicator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-foreground">Sprint Progress</span>
            <span className="text-sm font-mono text-foreground">10/29 pts done</span>
          </div>
          <Progress value={34} />
          <p className="text-xs text-foreground-tertiary mt-2">
            Based on current velocity, sprint is on track to complete with 2 carryover items
          </p>
        </CardContent>
      </Card>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        <SprintColumn status="todo" tasks={tasksByStatus['todo']} />
        <SprintColumn status="in-progress" tasks={tasksByStatus['in-progress']} />
        <SprintColumn status="review" tasks={tasksByStatus['review']} />
        <SprintColumn status="done" tasks={tasksByStatus['done']} />
      </div>

      {/* NexFlow insight */}
      <div className="p-4 bg-nf-muted border border-nf/20 rounded-lg">
        <div className="flex items-start gap-3">
          <BreathingDot variant="nf" size="md" />
          <div>
            <h4 className="text-sm font-medium text-nf mb-1">Sprint Health Analysis</h4>
            <p className="text-xs text-foreground-secondary leading-relaxed">
              NexFlow predicts 2 tickets (ONB-22, AUTH-43) may carry over based on
              current velocity. Consider scope reduction or pair programming on blocked items.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
