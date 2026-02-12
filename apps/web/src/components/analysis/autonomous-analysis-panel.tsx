'use client'

import { useState } from 'react'
import { Button } from '@nexflow/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@nexflow/ui/card'
import { Badge } from '@nexflow/ui/badge'
import { Progress } from '@nexflow/ui/progress'
import { toast } from '@nexflow/ui/toast'
import { trpc } from '@/lib/trpc'
import {
  Brain,
  GitBranch,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Loader2,
  Sparkles,
  RefreshCw,
  Zap,
} from 'lucide-react'

export function AutonomousAnalysisPanel() {
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

  const { data: stats, refetch: refetchStats } = trpc.analysis.getAnalysisStats.useQuery()
  const runAnalysis = trpc.analysis.runAutonomousAnalysis.useMutation()
  const refreshInsights = trpc.analysis.refreshInsights.useMutation()

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      const result = await runAnalysis.mutateAsync()
      if (result.success && result.results) {
        setAnalysisResults(result.results)
        toast({
          title: 'Analysis Complete',
          description: `Analyzed ${result.results.reposAnalyzed} repos, created ${result.results.tasksCreated} tasks, ${result.results.bottlenecksCreated} bottlenecks, ${result.results.predictionsCreated} predictions`,
        })
        refetchStats()
      } else {
        toast({
          title: 'Analysis Failed',
          description: result.error || 'Unknown error',
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

  const handleRefreshInsights = async () => {
    try {
      const result = await refreshInsights.mutateAsync()
      if (result.success) {
        toast({
          title: 'Insights Refreshed',
          description: `Detected ${result.bottlenecksDetected} bottlenecks and generated ${result.predictionsGenerated} predictions`,
        })
        refetchStats()
      }
    } catch (e) {
      toast({
        title: 'Refresh Failed',
        description: String(e),
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Main Action Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent-light p-2">
                <Brain className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Autonomous Analysis
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshInsights}
                disabled={refreshInsights.isLoading}
              >
                {refreshInsights.isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh Insights
              </Button>
              <Button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Run Full Analysis
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-foreground-muted">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Total Tasks</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{stats?.totalTasks || 0}</p>
              {stats?.autoGeneratedTasks ? (
                <p className="text-xs text-foreground-muted">
                  {stats.autoGeneratedTasks} auto-generated
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-foreground-muted">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Bottlenecks</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{stats?.activeBottlenecks || 0}</p>
              <p className="text-xs text-foreground-muted">Active issues</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-foreground-muted">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Predictions</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{stats?.activePredictions || 0}</p>
              <p className="text-xs text-foreground-muted">Active forecasts</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-foreground-muted">
                <GitBranch className="h-4 w-4" />
                <span className="text-sm">Projects</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{stats?.totalProjects || 0}</p>
              <p className="text-xs text-foreground-muted">Tracked</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-status-warning" />
              Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-5 gap-3">
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">{analysisResults.reposAnalyzed}</p>
                <p className="text-sm text-foreground-muted">Repos Analyzed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-status-healthy">{analysisResults.tasksCreated}</p>
                <p className="text-sm text-foreground-muted">Tasks Created</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-status-warning">{analysisResults.bottlenecksCreated}</p>
                <p className="text-sm text-foreground-muted">Bottlenecks</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">{analysisResults.predictionsCreated}</p>
                <p className="text-sm text-foreground-muted">Predictions</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">{analysisResults.projectsCreated}</p>
                <p className="text-sm text-foreground-muted">Projects</p>
              </div>
            </div>

            {/* Repo Summaries */}
            {analysisResults.repoSummaries.length > 0 && (
              <div>
                <h4 className="mb-3 font-medium">Repository Health</h4>
                <div className="space-y-3">
                  {analysisResults.repoSummaries.slice(0, 5).map((repo) => (
                    <div key={repo.name} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-foreground-muted" />
                          <span className="font-medium">{repo.name}</span>
                        </div>
                        <Badge
                          variant={
                            repo.completeness >= 70
                              ? 'healthy'
                              : repo.completeness >= 50
                                ? 'warning'
                                : 'critical'
                          }
                        >
                          {repo.completeness}% complete
                        </Badge>
                      </div>
                      <div className="mt-2">
                        <Progress value={repo.completeness} className="h-2" />
                      </div>
                      <div className="mt-2 flex gap-4 text-xs text-foreground-muted">
                        <span>{repo.openIssues} issues</span>
                        <span>{repo.openPRs} PRs</span>
                        <span>{repo.todoCount} TODOs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Insights */}
            {analysisResults.insights.length > 0 && (
              <div>
                <h4 className="mb-3 font-medium">AI Insights</h4>
                <div className="space-y-2">
                  {analysisResults.insights.map((insight, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg bg-background-secondary p-3"
                    >
                      <Sparkles className="mt-0.5 h-4 w-4 text-status-warning" />
                      <p className="text-sm">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
