'use client'

import { cn } from '@nexflow/ui/utils'
import { trpc } from '@/lib/trpc'
import {
  CheckCircle2,
  Circle,
  GitPullRequest,
  GitBranch,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Clock,
  Plug,
  ExternalLink,
  ChevronRight,
  Lightbulb,
  ShieldAlert,
  Zap,
} from 'lucide-react'
import Link from 'next/link'

function EmptyState({ hasIntegrations }: { hasIntegrations: boolean }) {
  if (!hasIntegrations) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
          <Plug className="w-8 h-8 text-[#555]" />
        </div>
        <h3 className="text-[16px] font-medium text-[#ededed] mb-2">Connect an integration to get started</h3>
        <p className="text-[13px] text-[#888] text-center max-w-md mb-6">
          NexFlow needs access to your GitHub, Linear, or other tools to show your daily actions and priorities.
        </p>
        <Link
          href="/api/integrations/github/authorize"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#ededed] text-[#000] rounded-md text-[13px] font-medium hover:bg-[#fff] transition-colors"
        >
          Connect GitHub
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8 text-[#50e3c2]" />
      </div>
      <h3 className="text-[16px] font-medium text-[#ededed] mb-2">All caught up!</h3>
      <p className="text-[13px] text-[#888] text-center max-w-md">
        No urgent actions right now. Check back later or sync your integrations to see the latest updates.
      </p>
    </div>
  )
}

function TaskRow({ task }: {
  task: {
    id: string
    title: string
    status: string
    priority: string
    dueDate: string | null
    source: string
    externalUrl?: string | null
    labels: string[]
    project?: { id: string; name: string; key: string } | null
  }
}) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()
  const isDueToday = task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString()

  const urgencyConfig = isOverdue
    ? { label: 'OVERDUE', color: '#ff4444', bg: 'rgba(255,68,68,0.1)' }
    : isDueToday
    ? { label: 'TODAY', color: '#f5a623', bg: 'rgba(245,166,35,0.1)' }
    : task.priority === 'URGENT'
    ? { label: 'URGENT', color: '#ff4444', bg: 'rgba(255,68,68,0.1)' }
    : task.priority === 'HIGH'
    ? { label: 'HIGH', color: '#f5a623', bg: 'rgba(245,166,35,0.1)' }
    : { label: 'NORMAL', color: '#555', bg: 'transparent' }

  return (
    <div className={cn(
      'flex items-center gap-3 p-4 border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#111] transition-colors group',
      isOverdue && 'bg-[#ff4444]/5'
    )}>
      <div className="w-5 h-5 rounded-full border border-[#333] flex items-center justify-center flex-shrink-0">
        {task.status === 'DONE' ? (
          <CheckCircle2 className="w-4 h-4 text-[#50e3c2]" />
        ) : (
          <Circle className="w-4 h-4 text-[#555]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-mono font-medium uppercase tracking-[0.5px] px-1.5 py-0.5 rounded"
            style={{ color: urgencyConfig.color, backgroundColor: urgencyConfig.bg }}
          >
            {urgencyConfig.label}
          </span>
          <span className="text-[13px] text-[#ededed] truncate">{task.title}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-[#555] font-mono uppercase">{task.source}</span>
          {task.project && (
            <>
              <span className="text-[#333]">·</span>
              <span className="text-[11px] text-[#555]">{task.project.key}</span>
            </>
          )}
          {task.dueDate && (
            <>
              <span className="text-[#333]">·</span>
              <span className={cn(
                'text-[11px] font-mono',
                isOverdue ? 'text-[#ff4444]' : 'text-[#555]'
              )}>
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            </>
          )}
        </div>
      </div>

      {task.externalUrl && (
        <a
          href={task.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-[#ededed] transition-all"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  )
}

function PRCard({ pr }: {
  pr: {
    id: string
    number: number
    title: string
    url: string
    repository: string
    isDraft: boolean
    createdAt: string | Date
    additions: number
    deletions: number
    author?: { id: string; name: string | null; image: string | null } | null
    isStuck: boolean
  }
}) {
  const daysOld = Math.floor((Date.now() - new Date(pr.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  const isStale = daysOld > 3

  return (
    <a
      href={pr.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block p-3 border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#111] transition-colors',
        pr.isStuck && 'border-l-2 border-l-[#f5a623]'
      )}
    >
      <div className="flex items-start gap-3">
        <GitPullRequest className={cn(
          'w-4 h-4 mt-0.5 flex-shrink-0',
          pr.isDraft ? 'text-[#555]' : 'text-[#50e3c2]'
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-[#ededed] truncate">
              #{pr.number} {pr.title}
            </span>
            {pr.isDraft && (
              <span className="text-[10px] font-mono text-[#555] px-1.5 py-0.5 bg-[#1a1a1a] rounded">DRAFT</span>
            )}
            {isStale && !pr.isDraft && (
              <span className="text-[10px] font-mono text-[#f5a623] px-1.5 py-0.5 bg-[#f5a623]/10 rounded">
                {daysOld}d OLD
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-[#555] truncate">{pr.repository}</span>
            <span className="text-[#333]">·</span>
            <span className="text-[11px] text-[#50e3c2]">+{pr.additions}</span>
            <span className="text-[11px] text-[#ff4444]">-{pr.deletions}</span>
            {pr.author && (
              <>
                <span className="text-[#333]">·</span>
                <span className="text-[11px] text-[#555]">{pr.author.name || 'Unknown'}</span>
              </>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#333] flex-shrink-0" />
      </div>
    </a>
  )
}

function RepoHealthCard({ repo }: {
  repo: {
    id: string
    fullName: string
    description: string | null
    language: string | null
    completenessScore: number | null
    openPRCount: number
    openIssueCount: number
    todoCount: number
    lastAnalyzedAt: string | Date | null
  }
}) {
  const score = repo.completenessScore || 0
  const scoreColor = score >= 80 ? '#50e3c2' : score >= 50 ? '#f5a623' : '#ff4444'

  return (
    <div className="p-3 bg-[#0a0a0a] rounded-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-medium text-[#ededed] truncate">{repo.fullName}</span>
        {repo.completenessScore !== null && (
          <span className="text-[12px] font-mono" style={{ color: scoreColor }}>
            {score}%
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-[11px] text-[#555]">
        <span>{repo.openPRCount} PRs</span>
        <span>{repo.openIssueCount} issues</span>
        <span>{repo.todoCount} TODOs</span>
      </div>
    </div>
  )
}

function PredictionCard({ prediction }: {
  prediction: {
    id: string
    type: string
    confidence: number
    reasoning: string | null
    value: { title?: string; description?: string; suggestedAction?: string } | null
    project: { id: string; name: string; key: string } | null
  }
}) {
  const typeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    DEADLINE_RISK: { label: 'Deadline Risk', color: '#ff4444', icon: <Clock className="w-4 h-4" /> },
    BURNOUT_INDICATOR: { label: 'Burnout Risk', color: '#f5a623', icon: <AlertTriangle className="w-4 h-4" /> },
    VELOCITY_FORECAST: { label: 'Velocity', color: '#50e3c2', icon: <TrendingUp className="w-4 h-4" /> },
    SCOPE_CREEP: { label: 'Scope Creep', color: '#a78bfa', icon: <Zap className="w-4 h-4" /> },
  }

  const config = typeConfig[prediction.type] || { label: prediction.type, color: '#888', icon: <AlertCircle className="w-4 h-4" /> }
  const confidence = Math.round(prediction.confidence * 100)

  return (
    <div className="p-3 border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#111] transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5" style={{ color: config.color }}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-mono font-medium uppercase tracking-[0.5px] px-1.5 py-0.5 rounded"
              style={{ color: config.color, backgroundColor: `${config.color}15` }}
            >
              {config.label}
            </span>
            <span className="text-[10px] font-mono text-[#555]">{confidence}% confidence</span>
          </div>
          <p className="text-[13px] text-[#ededed] mt-1">
            {prediction.value?.title || prediction.reasoning}
          </p>
          {prediction.value?.description && (
            <p className="text-[11px] text-[#888] mt-1">{prediction.value.description}</p>
          )}
          {prediction.value?.suggestedAction && (
            <p className="text-[11px] text-[#50e3c2] mt-1">
              → {prediction.value.suggestedAction}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function BottleneckCard({ bottleneck }: {
  bottleneck: {
    id: string
    type: string
    severity: string
    title: string
    description: string | null
    impact: string | null
    project: { id: string; name: string; key: string } | null
  }
}) {
  const severityConfig: Record<string, { color: string; bg: string }> = {
    CRITICAL: { color: '#ff4444', bg: 'rgba(255,68,68,0.1)' },
    HIGH: { color: '#f5a623', bg: 'rgba(245,166,35,0.1)' },
    MEDIUM: { color: '#888', bg: 'rgba(136,136,136,0.1)' },
    LOW: { color: '#555', bg: 'transparent' },
  }

  const config = severityConfig[bottleneck.severity] || severityConfig.MEDIUM

  return (
    <div className={cn(
      'p-3 border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#111] transition-colors',
      bottleneck.severity === 'CRITICAL' && 'border-l-2 border-l-[#ff4444]',
      bottleneck.severity === 'HIGH' && 'border-l-2 border-l-[#f5a623]'
    )}>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: config.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-mono font-medium uppercase tracking-[0.5px] px-1.5 py-0.5 rounded"
              style={{ color: config.color, backgroundColor: config.bg }}
            >
              {bottleneck.severity}
            </span>
            <span className="text-[10px] font-mono text-[#555] uppercase">{bottleneck.type.replace('_', ' ')}</span>
          </div>
          <p className="text-[13px] text-[#ededed] mt-1">{bottleneck.title}</p>
          {bottleneck.description && (
            <p className="text-[11px] text-[#888] mt-1">{bottleneck.description}</p>
          )}
          {bottleneck.impact && (
            <p className="text-[11px] text-[#f5a623] mt-1">Impact: {bottleneck.impact}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function RiskCard({ risk }: {
  risk: {
    category: string
    title: string
    description: string
    likelihood: string
    impact: string
    mitigation: string
  }
}) {
  const impactConfig: Record<string, { color: string }> = {
    HIGH: { color: '#ff4444' },
    MEDIUM: { color: '#f5a623' },
    LOW: { color: '#50e3c2' },
  }

  const config = impactConfig[risk.impact] || impactConfig.MEDIUM

  return (
    <div className="p-3 border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#111] transition-colors">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: config.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#555] uppercase">{risk.category}</span>
            <span className="text-[#333]">·</span>
            <span className="text-[10px] font-mono" style={{ color: config.color }}>
              {risk.likelihood} likelihood
            </span>
          </div>
          <p className="text-[13px] text-[#ededed] mt-1">{risk.title}</p>
          <p className="text-[11px] text-[#888] mt-1">{risk.description}</p>
          <p className="text-[11px] text-[#50e3c2] mt-1">→ {risk.mitigation}</p>
        </div>
      </div>
    </div>
  )
}

function RecommendationCard({ recommendation }: {
  recommendation: {
    title: string
    description: string
    priority: string
    category: string
  }
}) {
  const priorityConfig: Record<string, { color: string }> = {
    HIGH: { color: '#ff4444' },
    MEDIUM: { color: '#f5a623' },
    LOW: { color: '#50e3c2' },
  }

  const config = priorityConfig[recommendation.priority] || priorityConfig.MEDIUM

  return (
    <div className="p-3 border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#111] transition-colors">
      <div className="flex items-start gap-3">
        <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#f5a623]" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-mono font-medium uppercase tracking-[0.5px] px-1.5 py-0.5 rounded"
              style={{ color: config.color, backgroundColor: `${config.color}15` }}
            >
              {recommendation.priority}
            </span>
            <span className="text-[10px] font-mono text-[#555] uppercase">{recommendation.category}</span>
          </div>
          <p className="text-[13px] text-[#ededed] mt-1">{recommendation.title}</p>
          <p className="text-[11px] text-[#888] mt-1">{recommendation.description}</p>
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon, children, count }: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  count?: number
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#555]">{icon}</span>
        <span className="text-[12px] font-medium text-[#888] uppercase tracking-[0.5px]">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] font-mono text-[#ededed] px-1.5 py-0.5 bg-[#1a1a1a] rounded">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-[#1a1a1a] rounded" />
        ))}
      </div>
      <div className="border border-[#1a1a1a] rounded-md overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 border-b border-[#1a1a1a] last:border-b-0 bg-[#0a0a0a]" />
        ))}
      </div>
    </div>
  )
}

export function TodayTab() {
  const { data: integrations, isLoading: integrationsLoading } = trpc.integrations.list.useQuery()
  const { data: unifiedData, isLoading: todosLoading } = trpc.tasks.getUnifiedTodos.useQuery()

  // Trigger content guarantee on load (with caching)
  trpc.dashboard.ensureContent.useMutation()

  const isLoading = integrationsLoading || todosLoading

  if (isLoading) {
    return <LoadingSkeleton />
  }

  const hasIntegrations = (integrations?.connected?.length || 0) > 0

  if (!unifiedData || !unifiedData.summary.hasContent) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Today</h2>
          <p className="text-[13px] text-[#888] mt-1">
            Your prioritized action queue
          </p>
        </div>
        <EmptyState hasIntegrations={hasIntegrations} />
      </div>
    )
  }

  const { tasks, prsToReview, repoStats, predictions, bottlenecks, risks, recommendations, summary } = unifiedData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Today</h2>
        <p className="text-[13px] text-[#888] mt-1">
          Your prioritized action queue
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
          <div className={cn(
            'text-[20px] font-mono font-semibold',
            (summary.totalBottlenecks || 0) > 0 ? 'text-[#ff4444]' : 'text-[#ededed]'
          )}>
            {summary.totalBottlenecks || 0}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Bottlenecks</div>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
          <div className={cn(
            'text-[20px] font-mono font-semibold',
            (summary.totalPredictions || 0) > 0 ? 'text-[#f5a623]' : 'text-[#ededed]'
          )}>
            {summary.totalPredictions || 0}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Predictions</div>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
          <div className={cn(
            'text-[20px] font-mono font-semibold',
            (summary.totalRisks || 0) > 0 ? 'text-[#a78bfa]' : 'text-[#ededed]'
          )}>
            {summary.totalRisks || 0}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Risks</div>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
          <div className="text-[20px] font-mono font-semibold text-[#ededed]">{summary.totalPRs}</div>
          <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Open PRs</div>
        </div>
      </div>

      {/* Bottlenecks - highest priority */}
      {bottlenecks && bottlenecks.length > 0 && (
        <Section title="Active Bottlenecks" icon={<AlertCircle className="w-4 h-4" />} count={bottlenecks.length}>
          <div className="border border-[#1a1a1a] rounded-md overflow-hidden">
            {bottlenecks.slice(0, 5).map(bottleneck => (
              <BottleneckCard key={bottleneck.id} bottleneck={bottleneck} />
            ))}
          </div>
        </Section>
      )}

      {/* Predictions */}
      {predictions && predictions.length > 0 && (
        <Section title="AI Predictions" icon={<TrendingUp className="w-4 h-4" />} count={predictions.length}>
          <div className="border border-[#1a1a1a] rounded-md overflow-hidden">
            {predictions.slice(0, 5).map(prediction => (
              <PredictionCard key={prediction.id} prediction={prediction} />
            ))}
          </div>
        </Section>
      )}

      {/* Risks */}
      {risks && risks.length > 0 && (
        <Section title="Risk Analysis" icon={<ShieldAlert className="w-4 h-4" />} count={risks.length}>
          <div className="border border-[#1a1a1a] rounded-md overflow-hidden">
            {risks.slice(0, 4).map((risk, idx) => (
              <RiskCard key={idx} risk={risk} />
            ))}
          </div>
        </Section>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Section title="Recommendations" icon={<Lightbulb className="w-4 h-4" />} count={recommendations.length}>
          <div className="border border-[#1a1a1a] rounded-md overflow-hidden">
            {recommendations.slice(0, 4).map((rec, idx) => (
              <RecommendationCard key={idx} recommendation={rec} />
            ))}
          </div>
        </Section>
      )}

      {/* PRs needing attention */}
      {prsToReview.length > 0 && (
        <Section title="Pull Requests" icon={<GitPullRequest className="w-4 h-4" />} count={prsToReview.length}>
          <div className="border border-[#1a1a1a] rounded-md overflow-hidden">
            {prsToReview.slice(0, 5).map(pr => (
              <PRCard key={pr.id} pr={pr} />
            ))}
            {prsToReview.length > 5 && (
              <div className="p-3 text-center text-[12px] text-[#555] bg-[#0a0a0a]">
                +{prsToReview.length - 5} more PRs
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Assigned tasks */}
      {tasks.length > 0 && (
        <Section title="Your Tasks" icon={<CheckCircle2 className="w-4 h-4" />} count={tasks.length}>
          <div className="border border-[#1a1a1a] rounded-md overflow-hidden">
            {tasks.slice(0, 10).map(task => (
              <TaskRow key={task.id} task={task} />
            ))}
            {tasks.length > 10 && (
              <div className="p-3 text-center text-[12px] text-[#555] bg-[#0a0a0a]">
                +{tasks.length - 10} more tasks
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Repository health */}
      {repoStats.length > 0 && (
        <Section title="Repository Health" icon={<GitBranch className="w-4 h-4" />} count={repoStats.length}>
          <div className="grid grid-cols-2 gap-2">
            {repoStats.slice(0, 4).map(repo => (
              <RepoHealthCard key={repo.id} repo={repo} />
            ))}
          </div>
          {repoStats.length > 4 && (
            <Link
              href="/dashboard?card=integrations"
              className="block mt-2 text-center text-[12px] text-[#555] hover:text-[#888] transition-colors"
            >
              View all {repoStats.length} repositories
            </Link>
          )}
        </Section>
      )}
    </div>
  )
}
