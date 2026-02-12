'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@nexflow/ui/card'
import { Badge } from '@nexflow/ui/badge'
import { Button } from '@nexflow/ui/button'
import { Skeleton } from '@nexflow/ui/skeleton'
import { Progress } from '@nexflow/ui/progress'
import { toast } from '@nexflow/ui/toast'
import {
  Bot,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  Play,
  Loader2,
  Target,
  Users,
  BarChart3,
  GitBranch,
  Brain,
  Sparkles,
  RefreshCw,
} from 'lucide-react'

export function InsightsDetail() {
  const utils = trpc.useUtils()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<{
    reposAnalyzed: number
    tasksCreated: number
    bottlenecksCreated: number
    predictionsCreated: number
    projectsCreated: number
    insights: string[]
    repoSummaries: Array<{
      name: string
      completeness: number
      openIssues: number
      openPRs: number
      todoCount: number
    }>
  } | null>(null)

  const { data: agentStats, isLoading: agentLoading } = trpc.agents.getStats.useQuery()
  const { data: predictions } = trpc.predictions.getStats.useQuery()
  const { data: bottleneckStats } = trpc.bottlenecks.getStats.useQuery()
  const { data: predictionsList, refetch: refetchPredictions } = trpc.predictions.list.useQuery({})
  const { data: analysisStats, refetch: refetchAnalysisStats } = trpc.analysis.getAnalysisStats.useQuery()

  const runAgentAnalysis = trpc.agents.runAnalysis.useMutation({
    onSuccess: (data) => {
      utils.agents.getStats.invalidate()
      utils.agents.getPendingActions.invalidate()
      utils.bottlenecks.getStats.invalidate()
      utils.predictions.getStats.invalidate()
      utils.predictions.list.invalidate()
      utils.dashboard.invalidate()
      const successCount = data.steps.filter(s => s.status === 'success').length
      toast({
        title: 'Analysis Complete',
        description: `${successCount}/${data.steps.length} steps completed successfully.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Analysis Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const runAutonomousAnalysis = trpc.analysis.runAutonomousAnalysis.useMutation()

  const handleRunAutonomousAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      const result = await runAutonomousAnalysis.mutateAsync()
      if (result.success && result.results) {
        setAnalysisResults(result.results)
        toast({
          title: 'Autonomous Analysis Complete',
          description: `Analyzed ${result.results.reposAnalyzed} repos, created ${result.results.tasksCreated} tasks, ${result.results.bottlenecksCreated} bottlenecks, ${result.results.predictionsCreated} predictions`,
        })
        // Refresh all relevant data
        utils.predictions.list.invalidate()
        utils.predictions.getStats.invalidate()
        utils.bottlenecks.getStats.invalidate()
        utils.tasks.list.invalidate()
        utils.dashboard.invalidate()
        refetchAnalysisStats()
        refetchPredictions()
      } else {
        toast({
          title: 'Analysis Failed',
          description: result.error || 'Make sure GitHub is connected',
          variant: 'destructive',
        })
      }
    } catch (e) {
      toast({
        title: 'Analysis Failed',
        description: String(e),
        variant: 'destructive',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (agentLoading) {
    return <InsightsSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Autonomous Analysis Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Autonomous Repo Analysis
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="mr-1 h-3 w-3" />
                    AI-Powered
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Scan your GitHub repos to auto-generate tasks, bottlenecks, and predictions
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={handleRunAutonomousAnalysis}
              disabled={isAnalyzing}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing Repos...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Run Full Analysis
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {analysisStats && (
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Tasks</span>
                </div>
                <p className="mt-1 text-xl font-bold">{analysisStats.totalTasks}</p>
                {analysisStats.autoGeneratedTasks > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {analysisStats.autoGeneratedTasks} auto-generated
                  </p>
                )}
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Bottlenecks</span>
                </div>
                <p className="mt-1 text-xl font-bold">{analysisStats.activeBottlenecks}</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Predictions</span>
                </div>
                <p className="mt-1 text-xl font-bold">{analysisStats.activePredictions}</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GitBranch className="h-4 w-4" />
                  <span className="text-sm">Projects</span>
                </div>
                <p className="mt-1 text-xl font-bold">{analysisStats.totalProjects}</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Analysis Results */}
      {analysisResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Latest Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-5 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{analysisResults.reposAnalyzed}</p>
                <p className="text-xs text-muted-foreground">Repos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{analysisResults.tasksCreated}</p>
                <p className="text-xs text-muted-foreground">Tasks</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">{analysisResults.bottlenecksCreated}</p>
                <p className="text-xs text-muted-foreground">Bottlenecks</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{analysisResults.predictionsCreated}</p>
                <p className="text-xs text-muted-foreground">Predictions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-500">{analysisResults.projectsCreated}</p>
                <p className="text-xs text-muted-foreground">Projects</p>
              </div>
            </div>

            {analysisResults.repoSummaries.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Repository Health</h4>
                {analysisResults.repoSummaries.slice(0, 4).map((repo) => (
                  <div key={repo.name} className="flex items-center gap-3 rounded-lg border p-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium truncate">{repo.name}</span>
                    <Progress value={repo.completeness} className="h-2 w-24" />
                    <Badge variant={repo.completeness >= 70 ? 'default' : repo.completeness >= 50 ? 'secondary' : 'destructive'}>
                      {repo.completeness}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {analysisResults.insights.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">AI Insights</h4>
                {analysisResults.insights.slice(0, 3).map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/50 p-2">
                    <Sparkles className="mt-0.5 h-3 w-3 text-yellow-500" />
                    <p className="text-sm">{insight}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Impact Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <ImpactCard
          label="Hours Saved"
          value="24h"
          description="This week"
          icon={Clock}
          trend="+12%"
        />
        <ImpactCard
          label="Actions Executed"
          value={agentStats?.actionsThisWeek ?? 0}
          description="By agents"
          icon={Bot}
        />
        <ImpactCard
          label="Blockers Resolved"
          value={bottleneckStats?.resolved24h ?? 0}
          description="Today"
          icon={CheckCircle}
        />
        <ImpactCard
          label="Acceptance Rate"
          value={`${agentStats?.acceptanceRate ?? 0}%`}
          description="Agent suggestions"
          icon={TrendingUp}
          trend={agentStats?.acceptanceRate && agentStats.acceptanceRate > 80 ? '↑' : undefined}
        />
      </div>

      {/* Run Analysis Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">AI Predictions</h3>
        <Button
          onClick={() => runAgentAnalysis.mutate()}
          disabled={runAgentAnalysis.isLoading}
          size="sm"
          variant="outline"
        >
          {runAgentAnalysis.isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {runAgentAnalysis.isLoading ? 'Analyzing...' : 'Refresh Predictions'}
        </Button>
      </div>

      {/* Recent Insights */}
      <div>
        <h3 className="mb-4 text-lg font-medium">Recent Insights</h3>
        <div className="space-y-3">
          {predictionsList && predictionsList.length > 0 ? (
            predictionsList.map((prediction) => (
              <InsightCard
                key={prediction.id}
                title={formatPredictionTitle(prediction)}
                description={prediction.reasoning || 'Analysis complete.'}
                type={getPredictionInsightType(prediction)}
                icon={getPredictionIcon(prediction.type)}
              />
            ))
          ) : (
            <Card className="p-6 text-center">
              <p className="text-foreground-muted">
                No insights yet. Click <strong>Run Analysis</strong> to sync your integrations and generate AI-powered insights.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Agent Performance */}
      <div>
        <h3 className="mb-4 text-lg font-medium">Agent Performance</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <AgentCard
            name="Task Reassigner"
            actions={agentStats?.byAgent?.TASK_REASSIGNER ?? 0}
            enabled={true}
          />
          <AgentCard
            name="Nudge Sender"
            actions={agentStats?.byAgent?.NUDGE_SENDER ?? 0}
            enabled={true}
          />
          <AgentCard
            name="Scope Adjuster"
            actions={agentStats?.byAgent?.SCOPE_ADJUSTER ?? 0}
            enabled={false}
          />
        </div>
      </div>
    </div>
  )
}

function ImpactCard({
  label,
  value,
  description,
  icon: Icon,
  trend,
}: {
  label: string
  value: string | number
  description: string
  icon: React.ComponentType<{ className?: string }>
  trend?: string
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold">{value}</span>
            {trend && (
              <span className="text-sm text-status-healthy">{trend}</span>
            )}
          </div>
          <div className="text-sm text-foreground-muted">{label}</div>
          <div className="text-xs text-foreground-muted">{description}</div>
        </div>
        <div className="rounded-lg bg-accent-light p-2 text-accent">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}

function InsightCard({
  title,
  description,
  type,
  icon: Icon,
}: {
  title: string
  description: string
  type: 'positive' | 'warning' | 'negative'
  icon: React.ComponentType<{ className?: string }>
}) {
  const colors = {
    positive: {
      bg: 'bg-status-healthy-light',
      text: 'text-status-healthy',
      border: 'border-l-status-healthy',
    },
    warning: {
      bg: 'bg-status-warning-light',
      text: 'text-status-warning',
      border: 'border-l-status-warning',
    },
    negative: {
      bg: 'bg-status-critical-light',
      text: 'text-status-critical',
      border: 'border-l-status-critical',
    },
  }

  const color = colors[type]

  return (
    <Card className={`border-l-4 p-4 ${color.border}`}>
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2 ${color.bg} ${color.text}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="font-medium text-foreground">{title}</div>
          <p className="mt-1 text-sm text-foreground-muted">{description}</p>
        </div>
      </div>
    </Card>
  )
}

function AgentCard({
  name,
  actions,
  enabled,
}: {
  name: string
  actions: number
  enabled: boolean
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-background-secondary p-2">
            <Bot className="h-5 w-5 text-foreground-muted" />
          </div>
          <div>
            <div className="font-medium">{name}</div>
            <div className="text-sm text-foreground-muted">
              {actions} actions this week
            </div>
          </div>
        </div>
        <Badge variant={enabled ? 'healthy' : 'secondary'}>
          {enabled ? 'Active' : 'Disabled'}
        </Badge>
      </div>
    </Card>
  )
}

function formatPredictionTitle(prediction: { type: string; confidence: number; value: unknown; project?: { name: string; key: string } | null }): string {
  const value = prediction.value as Record<string, unknown>
  const projectLabel = prediction.project ? `[${prediction.project.key}] ` : ''

  switch (prediction.type) {
    case 'DEADLINE_RISK':
      return `${projectLabel}Deadline risk: ${value.riskLevel} (${Math.round(prediction.confidence * 100)}% confidence)`
    case 'BURNOUT_INDICATOR':
      return `${projectLabel}Burnout risk: ${value.riskLevel}`
    case 'VELOCITY_FORECAST':
      return `${projectLabel}Velocity ${value.trend}: ~${typeof value.predictedVelocity === 'number' ? value.predictedVelocity.toFixed(1) : value.predictedVelocity} tasks/week`
    case 'SCOPE_CREEP':
      return `${projectLabel}Scope creep: ${value.severity} (+${typeof value.percentageIncrease === 'number' ? Math.round(value.percentageIncrease) : value.percentageIncrease}%)`
    default:
      return `${projectLabel}Prediction (${Math.round(prediction.confidence * 100)}% confidence)`
  }
}

function getPredictionInsightType(prediction: { type: string; confidence: number; value: unknown }): 'positive' | 'warning' | 'negative' {
  const value = prediction.value as Record<string, unknown>

  switch (prediction.type) {
    case 'DEADLINE_RISK': {
      const risk = value.riskLevel as string
      if (risk === 'critical' || risk === 'high') return 'negative'
      if (risk === 'medium') return 'warning'
      return 'positive'
    }
    case 'BURNOUT_INDICATOR': {
      const risk = value.riskLevel as string
      if (risk === 'high') return 'negative'
      if (risk === 'medium') return 'warning'
      return 'positive'
    }
    case 'VELOCITY_FORECAST': {
      const trend = value.trend as string
      if (trend === 'increasing') return 'positive'
      if (trend === 'decreasing') return 'negative'
      return 'warning'
    }
    case 'SCOPE_CREEP': {
      const severity = value.severity as string
      if (severity === 'severe') return 'negative'
      if (severity === 'moderate') return 'warning'
      return 'positive'
    }
    default:
      return prediction.confidence >= 0.7 ? 'warning' : 'positive'
  }
}

function getPredictionIcon(type: string): React.ComponentType<{ className?: string }> {
  switch (type) {
    case 'DEADLINE_RISK':
      return Clock
    case 'BURNOUT_INDICATOR':
      return Users
    case 'VELOCITY_FORECAST':
      return BarChart3
    case 'SCOPE_CREEP':
      return Target
    default:
      return TrendingUp
  }
}

function InsightsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-6 w-40" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  )
}
