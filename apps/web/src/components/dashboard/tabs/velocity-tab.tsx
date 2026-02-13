'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/nf/card'
import { Badge } from '@/components/nf/badge'
import { BreathingDot } from '@/components/nf/breathing-dot'
import { AnimPercent } from '@/components/nf/anim-num'

// Velocity metric type
interface VelocityMetric {
  label: string
  value: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  target?: number
  good: 'high' | 'low'
}

// Mock velocity data
const mockMetrics: VelocityMetric[] = [
  { label: 'Deploy Frequency', value: 4.2, unit: '/day', trend: 'up', target: 5, good: 'high' },
  { label: 'PR Cycle Time', value: 18, unit: 'hours', trend: 'down', target: 24, good: 'low' },
  { label: 'Review Turnaround', value: 4.5, unit: 'hours', trend: 'stable', target: 4, good: 'low' },
  { label: 'Commit Frequency', value: 12.3, unit: '/day', trend: 'up', good: 'high' },
  { label: 'Lead Time', value: 2.1, unit: 'days', trend: 'down', target: 3, good: 'low' },
  { label: 'Change Failure Rate', value: 8, unit: '%', trend: 'down', target: 15, good: 'low' },
]

// Team velocity history (last 4 weeks)
const mockHistory = [
  { week: 'Week 1', points: 28, deploys: 18 },
  { week: 'Week 2', points: 32, deploys: 22 },
  { week: 'Week 3', points: 35, deploys: 19 },
  { week: 'Week 4', points: 38, deploys: 25 },
]

// Metric card
function MetricCard({ metric }: { metric: VelocityMetric }) {
  const isGood = metric.good === 'high'
    ? metric.trend === 'up'
    : metric.trend === 'down'
  const meetsTarget = metric.target
    ? metric.good === 'high'
      ? metric.value >= metric.target
      : metric.value <= metric.target
    : true

  return (
    <Card hover glow={meetsTarget ? 'success' : 'warning'}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs text-foreground-tertiary">{metric.label}</span>
          <span className={cn(
            'text-xs',
            isGood ? 'text-status-success' : 'text-status-warning'
          )}>
            {metric.trend === 'up' ? '\\u2191' : metric.trend === 'down' ? '\\u2193' : '\\u2192'}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-mono font-medium text-foreground">{metric.value}</span>
          <span className="text-sm text-foreground-tertiary">{metric.unit}</span>
        </div>
        {metric.target && (
          <div className="mt-2 text-xs text-foreground-secondary">
            Target: {metric.target}{metric.unit}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Velocity chart (simplified bar chart)
function VelocityChart({ data }: { data: typeof mockHistory }) {
  const maxPoints = Math.max(...data.map(d => d.points))

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base">Weekly Velocity</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-end gap-2 h-32">
          {data.map((week, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-status-success rounded-t transition-all"
                style={{ height: `${(week.points / maxPoints) * 100}%` }}
              />
              <span className="text-xs text-foreground-tertiary">{week.week.split(' ')[1]}</span>
              <span className="text-xs font-mono text-foreground">{week.points}pts</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Stats overview
function VelocityStats() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-foreground">38</div>
          <div className="text-xs text-foreground-secondary">Points This Week</div>
        </CardContent>
      </Card>
      <Card padding="sm" glow="success">
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-status-success">+18%</div>
          <div className="text-xs text-foreground-secondary">vs Last Week</div>
        </CardContent>
      </Card>
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-foreground">25</div>
          <div className="text-xs text-foreground-secondary">Deploys This Week</div>
        </CardContent>
      </Card>
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-foreground">92%</div>
          <div className="text-xs text-foreground-secondary">Uptime</div>
        </CardContent>
      </Card>
    </div>
  )
}

export function VelocityTab() {
  const [metrics] = useState<VelocityMetric[]>(mockMetrics)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Velocity</h2>
        <p className="text-sm text-foreground-secondary mt-1">
          Engineering performance metrics and DORA insights
        </p>
      </div>

      {/* Stats */}
      <VelocityStats />

      {/* Velocity chart */}
      <VelocityChart data={mockHistory} />

      {/* Metrics grid */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Key Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {metrics.map(metric => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>
      </div>

      {/* DORA explanation */}
      <div className="p-4 bg-nf-muted border border-nf/20 rounded-lg">
        <div className="flex items-start gap-3">
          <BreathingDot variant="nf" size="md" />
          <div>
            <h4 className="text-sm font-medium text-nf mb-1">About Velocity Metrics</h4>
            <p className="text-xs text-foreground-secondary leading-relaxed">
              These metrics are based on DORA (DevOps Research and Assessment) research.
              Elite teams deploy multiple times per day with less than 1 hour lead time
              and under 15% change failure rate. NexFlow tracks these automatically from
              your GitHub and CI/CD data.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
