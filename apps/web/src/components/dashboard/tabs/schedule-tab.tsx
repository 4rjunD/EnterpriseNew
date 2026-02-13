'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/nf/card'
import { Badge, UrgencyBadge } from '@/components/nf/badge'
import { BreathingDot } from '@/components/nf/breathing-dot'
import { Progress } from '@/components/nf/progress'

// Schedule block type
interface ScheduleBlock {
  id: string
  type: 'focus' | 'meeting' | 'task' | 'break'
  title: string
  startTime: string
  endTime: string
  taskId?: string
  meetingLink?: string
  description?: string
  priority?: 'high' | 'medium' | 'low'
}

// Task for the day
interface DayTask {
  id: string
  title: string
  estimatedHours: number
  completed: boolean
  priority: 'high' | 'medium' | 'low'
  source: string
}

// Mock schedule
const mockSchedule: ScheduleBlock[] = [
  {
    id: '1',
    type: 'focus',
    title: 'Deep work: Payment integration',
    startTime: '09:00',
    endTime: '11:00',
    description: 'Focus block for PAYMENT-42',
    priority: 'high',
  },
  {
    id: '2',
    type: 'meeting',
    title: 'Daily standup',
    startTime: '11:00',
    endTime: '11:15',
    meetingLink: 'https://meet.google.com/xxx',
  },
  {
    id: '3',
    type: 'task',
    title: 'Review PR #145',
    startTime: '11:15',
    endTime: '12:00',
    taskId: 'pr-145',
    priority: 'medium',
  },
  {
    id: '4',
    type: 'break',
    title: 'Lunch',
    startTime: '12:00',
    endTime: '13:00',
  },
  {
    id: '5',
    type: 'focus',
    title: 'Deep work: Webhook handler',
    startTime: '13:00',
    endTime: '15:00',
    description: 'Continue PAYMENT-45',
    priority: 'high',
  },
  {
    id: '6',
    type: 'meeting',
    title: 'Sprint planning',
    startTime: '15:00',
    endTime: '16:00',
    meetingLink: 'https://meet.google.com/yyy',
  },
  {
    id: '7',
    type: 'task',
    title: 'Update documentation',
    startTime: '16:00',
    endTime: '17:00',
    priority: 'low',
  },
]

// Mock tasks for the day
const mockDayTasks: DayTask[] = [
  { id: '1', title: 'Complete payment webhook handler', estimatedHours: 2.5, completed: false, priority: 'high', source: 'linear' },
  { id: '2', title: 'Review Maya\'s PR on auth flow', estimatedHours: 0.5, completed: true, priority: 'medium', source: 'github' },
  { id: '3', title: 'Fix timeout issue in API', estimatedHours: 1, completed: false, priority: 'high', source: 'linear' },
  { id: '4', title: 'Update API documentation', estimatedHours: 1, completed: false, priority: 'low', source: 'notion' },
]

// Block type config
const BLOCK_CONFIG = {
  focus: { label: 'Focus', color: 'bg-status-success', textColor: 'text-status-success', icon: '\\u25ce' },
  meeting: { label: 'Meeting', color: 'bg-purple', textColor: 'text-purple', icon: '\\u25a3' },
  task: { label: 'Task', color: 'bg-status-info', textColor: 'text-status-info', icon: '\\u25c7' },
  break: { label: 'Break', color: 'bg-foreground-tertiary', textColor: 'text-foreground-tertiary', icon: '\\u25cb' },
}

// Schedule block component
function ScheduleBlockItem({ block, isNow }: { block: ScheduleBlock; isNow: boolean }) {
  const config = BLOCK_CONFIG[block.type]

  return (
    <div className={cn(
      'flex gap-4 p-3 rounded-lg transition-colors',
      isNow && 'bg-background-secondary ring-1 ring-status-success'
    )}>
      {/* Time */}
      <div className="w-16 flex-shrink-0 text-right">
        <div className="text-sm font-mono text-foreground">{block.startTime}</div>
        <div className="text-xs text-foreground-tertiary">{block.endTime}</div>
      </div>

      {/* Indicator */}
      <div className="relative flex flex-col items-center">
        <div className={cn('w-3 h-3 rounded-full', config.color)} />
        <div className="flex-1 w-px bg-border my-1" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge
            variant="default"
            size="sm"
            className={cn('text-xs', config.textColor)}
            style={{ backgroundColor: `${config.color.replace('bg-', '')}20` }}
          >
            {config.label}
          </Badge>
          {block.priority && (
            <Badge
              variant={block.priority === 'high' ? 'critical' : block.priority === 'medium' ? 'warning' : 'default'}
              size="sm"
            >
              {block.priority}
            </Badge>
          )}
          {isNow && (
            <Badge variant="success" size="sm" className="animate-pulse">NOW</Badge>
          )}
        </div>
        <h4 className="text-sm text-foreground font-medium truncate">{block.title}</h4>
        {block.description && (
          <p className="text-xs text-foreground-secondary mt-0.5">{block.description}</p>
        )}
      </div>
    </div>
  )
}

// Task item
function DayTaskItem({ task, onToggle }: { task: DayTask; onToggle: (id: string) => void }) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg transition-colors',
      task.completed && 'opacity-60'
    )}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className={cn(
          'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors',
          task.completed
            ? 'bg-status-success border-status-success'
            : 'border-foreground-tertiary hover:border-foreground'
        )}
      >
        {task.completed && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-background">
            <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm text-foreground',
          task.completed && 'line-through text-foreground-secondary'
        )}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-foreground-tertiary">{task.estimatedHours}h</span>
          <span className="text-xs text-foreground-tertiary">from {task.source}</span>
        </div>
      </div>

      {/* Priority */}
      <Badge
        variant={task.priority === 'high' ? 'critical' : task.priority === 'medium' ? 'warning' : 'default'}
        size="sm"
      >
        {task.priority}
      </Badge>
    </div>
  )
}

// Day stats
function DayStats({ tasks }: { tasks: DayTask[] }) {
  const completed = tasks.filter(t => t.completed).length
  const totalHours = tasks.reduce((acc, t) => acc + t.estimatedHours, 0)
  const completedHours = tasks.filter(t => t.completed).reduce((acc, t) => acc + t.estimatedHours, 0)

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="text-xl font-mono font-medium text-foreground">{completed}/{tasks.length}</div>
          <div className="text-xs text-foreground-secondary">Tasks Done</div>
        </CardContent>
      </Card>
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="text-xl font-mono font-medium text-foreground">{completedHours}h</div>
          <div className="text-xs text-foreground-secondary">Hours Logged</div>
        </CardContent>
      </Card>
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="text-xl font-mono font-medium text-foreground">{totalHours - completedHours}h</div>
          <div className="text-xs text-foreground-secondary">Remaining</div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ScheduleTab() {
  const [schedule] = useState<ScheduleBlock[]>(mockSchedule)
  const [tasks, setTasks] = useState<DayTask[]>(mockDayTasks)

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ))
  }

  // Get current block (simplified - just use index 2 as "now" for demo)
  const currentBlockId = '3'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Your Schedule</h2>
          <p className="text-sm text-foreground-secondary mt-1">
            Today's timeline optimized for deep work
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-foreground">Wednesday, Mar 6</div>
          <div className="text-xs text-foreground-secondary">5 tasks, 5h estimated</div>
        </div>
      </div>

      {/* Stats */}
      <DayStats tasks={tasks} />

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-1">
              {schedule.map(block => (
                <ScheduleBlockItem
                  key={block.id}
                  block={block}
                  isNow={block.id === currentBlockId}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Today's Tasks</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-1">
              {tasks.map(task => (
                <DayTaskItem
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NexFlow suggestion */}
      <div className="p-4 bg-nf-muted border border-nf/20 rounded-lg">
        <div className="flex items-start gap-3">
          <BreathingDot variant="nf" size="md" />
          <div>
            <h4 className="text-sm font-medium text-nf mb-1">Schedule Optimization</h4>
            <p className="text-xs text-foreground-secondary leading-relaxed">
              NexFlow detected you're most productive in the morning. Your high-priority
              payment integration task is scheduled for 9-11 AM when you typically write
              2.3x more code. Consider batching meetings in the afternoon.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
