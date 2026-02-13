'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/nf/card'
import { Badge } from '@/components/nf/badge'
import { BreathingDot } from '@/components/nf/breathing-dot'
import { Progress } from '@/components/nf/progress'

// Quality metric type
interface QualityMetric {
  label: string
  value: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  threshold?: { warning: number; critical: number }
  good: 'high' | 'low'
}

// Issue type
interface QualityIssue {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  location: string
  detectedAt: Date
}

// Mock quality data
const mockMetrics: QualityMetric[] = [
  { label: 'Test Coverage', value: 71, unit: '%', trend: 'down', threshold: { warning: 75, critical: 60 }, good: 'high' },
  { label: 'Code Duplication', value: 4.2, unit: '%', trend: 'stable', threshold: { warning: 5, critical: 10 }, good: 'low' },
  { label: 'Technical Debt', value: 12, unit: 'hrs', trend: 'up', threshold: { warning: 16, critical: 24 }, good: 'low' },
  { label: 'CI Pass Rate', value: 94, unit: '%', trend: 'up', good: 'high' },
  { label: 'Security Vulns', value: 2, unit: '', trend: 'down', threshold: { warning: 3, critical: 5 }, good: 'low' },
  { label: 'Lint Errors', value: 0, unit: '', trend: 'stable', good: 'low' },
]

const mockIssues: QualityIssue[] = [
  { id: '1', severity: 'critical', title: 'SQL injection vulnerability in user search', location: 'api/users/search.ts:45', detectedAt: new Date(Date.now() - 2 * 3600000) },
  { id: '2', severity: 'warning', title: 'Missing null check in payment handler', location: 'api/payments/webhook.ts:112', detectedAt: new Date(Date.now() - 8 * 3600000) },
  { id: '3', severity: 'info', title: 'Unused import in dashboard component', location: 'components/dashboard.tsx:3', detectedAt: new Date(Date.now() - 24 * 3600000) },
]

// Metric card with threshold indicators
function QualityMetricCard({ metric }: { metric: QualityMetric }) {
  let status: 'good' | 'warning' | 'critical' = 'good'

  if (metric.threshold) {
    if (metric.good === 'high') {
      if (metric.value < metric.threshold.critical) status = 'critical'
      else if (metric.value < metric.threshold.warning) status = 'warning'
    } else {
      if (metric.value > metric.threshold.critical) status = 'critical'
      else if (metric.value > metric.threshold.warning) status = 'warning'
    }
  }

  const statusColors = {
    good: 'text-status-success',
    warning: 'text-status-warning',
    critical: 'text-status-critical',
  }

  const glowColors = {
    good: 'success' as const,
    warning: 'warning' as const,
    critical: 'critical' as const,
  }

  return (
    <Card hover glow={status === 'good' ? 'none' : glowColors[status]}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs text-foreground-tertiary">{metric.label}</span>
          <span className={cn('text-xs', statusColors[status])}>
            {metric.trend === 'up'
              ? metric.good === 'high' ? '\\u2191' : '\\u2191'
              : metric.trend === 'down'
              ? metric.good === 'low' ? '\\u2193' : '\\u2193'
              : '\\u2192'}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={cn('text-2xl font-mono font-medium', statusColors[status])}>
            {metric.value}
          </span>
          <span className="text-sm text-foreground-tertiary">{metric.unit}</span>
        </div>
        {metric.threshold && (
          <div className="mt-2 text-xs text-foreground-secondary">
            Target: {metric.good === 'high' ? '>' : '<'}{metric.threshold.warning}{metric.unit}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Issue row
function IssueRow({ issue }: { issue: QualityIssue }) {
  const severityConfig = {
    critical: { color: 'text-status-critical', bg: 'bg-status-critical', dot: 'animate-pulse' },
    warning: { color: 'text-status-warning', bg: 'bg-status-warning', dot: '' },
    info: { color: 'text-status-info', bg: 'bg-status-info', dot: '' },
  }[issue.severity]

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-background-secondary rounded-md transition-colors">
      <span className={cn('w-2 h-2 rounded-full mt-1.5', severityConfig.bg, severityConfig.dot)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{issue.title}</p>
        <p className="text-xs font-mono text-foreground-tertiary">{issue.location}</p>
      </div>
      <Badge variant={issue.severity === 'critical' ? 'critical' : issue.severity === 'warning' ? 'warning' : 'info'} size="sm">
        {issue.severity}
      </Badge>
    </div>
  )
}

// Stats overview
function QualityStats({ metrics }: { metrics: QualityMetric[] }) {
  const coverage = metrics.find(m => m.label === 'Test Coverage')?.value || 0
  const issues = 2 // From mock issues
  const ciPass = metrics.find(m => m.label === 'CI Pass Rate')?.value || 0

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card padding="sm" glow={coverage < 75 ? 'warning' : 'success'}>
        <CardContent className="p-3">
          <div className={cn(
            'text-2xl font-mono font-medium',
            coverage < 60 ? 'text-status-critical' : coverage < 75 ? 'text-status-warning' : 'text-status-success'
          )}>{coverage}%</div>
          <div className="text-xs text-foreground-secondary">Test Coverage</div>
        </CardContent>
      </Card>
      <Card padding="sm" glow="success">
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-status-success">{ciPass}%</div>
          <div className="text-xs text-foreground-secondary">CI Pass Rate</div>
        </CardContent>
      </Card>
      <Card padding="sm" glow={issues > 0 ? 'critical' : 'none'}>
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-status-critical">{issues}</div>
          <div className="text-xs text-foreground-secondary">Critical Issues</div>
        </CardContent>
      </Card>
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-foreground">A-</div>
          <div className="text-xs text-foreground-secondary">Code Grade</div>
        </CardContent>
      </Card>
    </div>
  )
}

export function QualityTab() {
  const [metrics] = useState<QualityMetric[]>(mockMetrics)
  const [issues] = useState<QualityIssue[]>(mockIssues)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Quality</h2>
        <p className="text-sm text-foreground-secondary mt-1">
          Code quality, test coverage, and technical debt
        </p>
      </div>

      {/* Stats */}
      <QualityStats metrics={metrics} />

      {/* Metrics grid */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Quality Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {metrics.map(metric => (
            <QualityMetricCard key={metric.label} metric={metric} />
          ))}
        </div>
      </div>

      {/* Issues list */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Active Issues</CardTitle>
            <Badge variant="critical" size="sm">{issues.filter(i => i.severity === 'critical').length} critical</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-1">
            {issues.map(issue => (
              <IssueRow key={issue.id} issue={issue} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Coverage breakdown */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Test Coverage by Module</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {[
            { name: 'API Routes', coverage: 85 },
            { name: 'Components', coverage: 68 },
            { name: 'Utilities', coverage: 92 },
            { name: 'Payment Module', coverage: 45 },
            { name: 'Auth Module', coverage: 78 },
          ].map(module => (
            <div key={module.name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground-secondary">{module.name}</span>
                <span className={cn(
                  'font-mono',
                  module.coverage < 60 ? 'text-status-critical' :
                  module.coverage < 75 ? 'text-status-warning' :
                  'text-status-success'
                )}>{module.coverage}%</span>
              </div>
              <Progress value={module.coverage} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* NexFlow insight */}
      <div className="p-4 bg-nf-muted border border-nf/20 rounded-lg">
        <div className="flex items-start gap-3">
          <BreathingDot variant="nf" size="md" />
          <div>
            <h4 className="text-sm font-medium text-nf mb-1">Quality Trend Analysis</h4>
            <p className="text-xs text-foreground-secondary leading-relaxed">
              Test coverage has dropped 7% over the last sprint. The Payment Module is at
              highest risk with only 45% coverage. Consider scheduling a testing sprint or
              adding coverage requirements to PR reviews.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
