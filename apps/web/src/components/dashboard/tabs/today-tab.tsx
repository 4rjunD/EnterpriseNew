'use client'

import { useState } from 'react'
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
  ChevronDown,
  Lightbulb,
  ShieldAlert,
  Zap,
  Code2,
  Bug,
  FileText,
  Activity,
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
        No urgent actions right now. Click <strong>Refresh</strong> in the header to generate AI insights.
      </p>
    </div>
  )
}

// Priority/status detail maps
const STATUS_DETAILS: Record<string, { label: string; color: string; description: string }> = {
  BACKLOG: { label: 'Backlog', color: '#555', description: 'Not yet planned for a sprint' },
  TODO: { label: 'To Do', color: '#888', description: 'Planned and ready to start' },
  IN_PROGRESS: { label: 'In Progress', color: '#50e3c2', description: 'Currently being worked on' },
  IN_REVIEW: { label: 'In Review', color: '#a78bfa', description: 'Waiting for code review' },
  DONE: { label: 'Done', color: '#50e3c2', description: 'Completed' },
  CANCELLED: { label: 'Cancelled', color: '#ff4444', description: 'Will not be worked on' },
}

const PRIORITY_DETAILS: Record<string, { label: string; color: string; description: string }> = {
  URGENT: { label: 'Urgent', color: '#ff4444', description: 'Needs immediate attention — blocking others' },
  HIGH: { label: 'High', color: '#f5a623', description: 'Important and time-sensitive' },
  MEDIUM: { label: 'Medium', color: '#888', description: 'Standard priority' },
  LOW: { label: 'Low', color: '#555', description: 'Nice-to-have, do when time allows' },
}

function TaskRow({ task }: {
  task: {
    id: string
    title: string
    status: string
    priority: string
    dueDate: string | Date | null
    source: string
    externalUrl?: string | null
    labels: string[]
    project?: { id: string; name: string; key: string } | null
    description?: string | null
  }
}) {
  const [expanded, setExpanded] = useState(false)
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

  const statusInfo = STATUS_DETAILS[task.status] || { label: task.status, color: '#555', description: '' }
  const priorityInfo = PRIORITY_DETAILS[task.priority] || { label: task.priority, color: '#555', description: '' }

  return (
    <div
      className={cn(
        'border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#111] transition-colors cursor-pointer',
        isOverdue && 'bg-[#ff4444]/5'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3 p-4">
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

        <div className="flex items-center gap-2">
          {task.externalUrl && (
            <a
              href={task.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#555] hover:text-[#ededed] transition-all"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <span className="text-[#555]">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#1a1a1a]">
          <div className="pt-3 ml-8 space-y-3">
            {/* Description */}
            {task.description ? (
              <p className="text-[12px] text-[#888] leading-relaxed">{task.description}</p>
            ) : (
              <p className="text-[12px] text-[#555] italic">No description provided</p>
            )}

            {/* Status and Priority detail */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#111] rounded p-2.5">
                <span className="text-[10px] text-[#555] uppercase tracking-wide block mb-1">Status</span>
                <span className="text-[12px] font-medium" style={{ color: statusInfo.color }}>{statusInfo.label}</span>
                <p className="text-[10px] text-[#555] mt-0.5">{statusInfo.description}</p>
              </div>
              <div className="bg-[#111] rounded p-2.5">
                <span className="text-[10px] text-[#555] uppercase tracking-wide block mb-1">Priority</span>
                <span className="text-[12px] font-medium" style={{ color: priorityInfo.color }}>{priorityInfo.label}</span>
                <p className="text-[10px] text-[#555] mt-0.5">{priorityInfo.description}</p>
              </div>
            </div>

            {/* Labels */}
            {task.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {task.labels.map(label => (
                  <span key={label} className="text-[10px] font-mono px-2 py-0.5 bg-[#1a1a1a] rounded text-[#888]">
                    {label}
                  </span>
                ))}
              </div>
            )}

            {/* Project info */}
            {task.project && (
              <div className="flex items-center gap-2 text-[11px] text-[#555]">
                <FileText className="w-3 h-3" />
                <span>Project: <span className="text-[#888]">{task.project.name}</span> ({task.project.key})</span>
              </div>
            )}
          </div>
        </div>
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
  const [expanded, setExpanded] = useState(false)
  const daysOld = Math.floor((Date.now() - new Date(pr.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  const isStale = daysOld > 3
  const totalChanges = pr.additions + pr.deletions
  const sizeLabel = totalChanges > 500 ? 'Large' : totalChanges > 100 ? 'Medium' : 'Small'
  const sizeColor = totalChanges > 500 ? '#ff4444' : totalChanges > 100 ? '#f5a623' : '#50e3c2'

  return (
    <div
      className={cn(
        'border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#111] transition-colors cursor-pointer',
        pr.isStuck && 'border-l-2 border-l-[#f5a623]'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-3">
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
          <span className="text-[#555] flex-shrink-0">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-[#1a1a1a]">
          <div className="pt-2 ml-7 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#111] rounded p-2">
                <span className="text-[10px] text-[#555] block">Size</span>
                <span className="text-[12px] font-mono" style={{ color: sizeColor }}>{sizeLabel} ({totalChanges} lines)</span>
              </div>
              <div className="bg-[#111] rounded p-2">
                <span className="text-[10px] text-[#555] block">Age</span>
                <span className={cn('text-[12px] font-mono', daysOld > 3 ? 'text-[#f5a623]' : 'text-[#888]')}>
                  {daysOld === 0 ? 'Today' : `${daysOld} days`}
                </span>
              </div>
              <div className="bg-[#111] rounded p-2">
                <span className="text-[10px] text-[#555] block">Repository</span>
                <span className="text-[12px] font-mono text-[#888] truncate block">{pr.repository.split('/')[1]}</span>
              </div>
            </div>
            <a
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] text-[#50e3c2] hover:underline"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
              Open on GitHub
            </a>
          </div>
        </div>
      )}
    </div>
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
  const [expanded, setExpanded] = useState(false)
  const score = repo.completenessScore || 0
  const scoreColor = score >= 80 ? '#50e3c2' : score >= 50 ? '#f5a623' : '#ff4444'

  const langColors: Record<string, string> = {
    TypeScript: '#3178c6', JavaScript: '#f7df1e', Python: '#3776ab', Go: '#00add8',
    Rust: '#dea584', Java: '#b07219', Ruby: '#cc342d', 'C#': '#239120',
  }
  const langColor = langColors[repo.language || ''] || '#888'

  return (
    <div
      className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg hover:border-[#252525] transition-colors cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <Code2 className="w-3.5 h-3.5 text-[#555] flex-shrink-0" />
            <span className="text-[13px] font-medium text-[#ededed] truncate">{repo.fullName}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {repo.completenessScore !== null && (
              <span className="text-[12px] font-mono font-semibold" style={{ color: scoreColor }}>
                {score}%
              </span>
            )}
            <span className="text-[#555]">
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#555] ml-[22px]">
          {repo.language && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: langColor }} />
              {repo.language}
            </span>
          )}
          <span>{repo.openPRCount} PRs</span>
          <span>{repo.openIssueCount} issues</span>
          <span>{repo.todoCount} TODOs</span>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-[#1a1a1a]">
          <div className="pt-2 space-y-2">
            {repo.description && (
              <p className="text-[12px] text-[#888]">{repo.description}</p>
            )}

            {/* Health breakdown */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-[#111] rounded p-2 text-center">
                <GitPullRequest className="w-3.5 h-3.5 text-[#50e3c2] mx-auto mb-1" />
                <span className={cn('text-[14px] font-mono font-semibold block', repo.openPRCount > 5 ? 'text-[#f5a623]' : 'text-[#ededed]')}>
                  {repo.openPRCount}
                </span>
                <span className="text-[9px] text-[#555] uppercase">Open PRs</span>
              </div>
              <div className="bg-[#111] rounded p-2 text-center">
                <Bug className="w-3.5 h-3.5 text-[#ff4444] mx-auto mb-1" />
                <span className={cn('text-[14px] font-mono font-semibold block', repo.openIssueCount > 10 ? 'text-[#ff4444]' : 'text-[#ededed]')}>
                  {repo.openIssueCount}
                </span>
                <span className="text-[9px] text-[#555] uppercase">Issues</span>
              </div>
              <div className="bg-[#111] rounded p-2 text-center">
                <FileText className="w-3.5 h-3.5 text-[#f5a623] mx-auto mb-1" />
                <span className={cn('text-[14px] font-mono font-semibold block', repo.todoCount > 10 ? 'text-[#f5a623]' : 'text-[#ededed]')}>
                  {repo.todoCount}
                </span>
                <span className="text-[9px] text-[#555] uppercase">TODOs</span>
              </div>
              <div className="bg-[#111] rounded p-2 text-center">
                <Activity className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: scoreColor }} />
                <span className="text-[14px] font-mono font-semibold block" style={{ color: scoreColor }}>
                  {score}%
                </span>
                <span className="text-[9px] text-[#555] uppercase">Health</span>
              </div>
            </div>

            {/* Completeness bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[#555]">Completeness</span>
                <span className="text-[10px] font-mono" style={{ color: scoreColor }}>{score}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${score}%`, backgroundColor: scoreColor }}
                />
              </div>
            </div>

            {repo.lastAnalyzedAt && (
              <p className="text-[10px] text-[#555]">
                Last analyzed: {new Date(repo.lastAnalyzedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      )}
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
  const [expanded, setExpanded] = useState(false)
  const typeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    DEADLINE_RISK: { label: 'Deadline Risk', color: '#ff4444', icon: <Clock className="w-4 h-4" /> },
    BURNOUT_INDICATOR: { label: 'Burnout Risk', color: '#f5a623', icon: <AlertTriangle className="w-4 h-4" /> },
    VELOCITY_FORECAST: { label: 'Velocity', color: '#50e3c2', icon: <TrendingUp className="w-4 h-4" /> },
    SCOPE_CREEP: { label: 'Scope Creep', color: '#a78bfa', icon: <Zap className="w-4 h-4" /> },
  }

  const config = typeConfig[prediction.type] || { label: prediction.type, color: '#888', icon: <AlertCircle className="w-4 h-4" /> }
  const confidence = Math.round(prediction.confidence * 100)

  return (
    <div
      className="border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#111] transition-colors cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-3">
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
            {!expanded && prediction.value?.description && (
              <p className="text-[11px] text-[#888] mt-1 line-clamp-1">{prediction.value.description}</p>
            )}
          </div>
          <span className="text-[#555] flex-shrink-0">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-3 border-t border-[#1a1a1a]">
          <div className="pt-2 ml-7 space-y-2">
            {prediction.value?.description && (
              <p className="text-[12px] text-[#888] leading-relaxed">{prediction.value.description}</p>
            )}

            {/* Confidence meter */}
            <div className="bg-[#111] rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[#555]">Confidence</span>
                <span className="text-[10px] font-mono" style={{ color: confidence >= 70 ? '#50e3c2' : confidence >= 40 ? '#f5a623' : '#ff4444' }}>
                  {confidence}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${confidence}%`,
                    backgroundColor: confidence >= 70 ? '#50e3c2' : confidence >= 40 ? '#f5a623' : '#ff4444',
                  }}
                />
              </div>
            </div>

            {prediction.reasoning && prediction.reasoning !== prediction.value?.title && (
              <div className="bg-[#0a0a0a] rounded p-2">
                <span className="text-[10px] text-[#555] uppercase tracking-wide block mb-1">AI Reasoning</span>
                <p className="text-[11px] text-[#888]">{prediction.reasoning}</p>
              </div>
            )}
            {prediction.value?.suggestedAction && (
              <div className="bg-[#50e3c2]/5 border border-[#50e3c2]/20 rounded p-2">
                <span className="text-[10px] text-[#50e3c2] uppercase tracking-wide block mb-1">Suggested Action</span>
                <p className="text-[11px] text-[#50e3c2]">{prediction.value.suggestedAction}</p>
              </div>
            )}
          </div>
        </div>
      )}
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
  const [expanded, setExpanded] = useState(false)
  const severityConfig: Record<string, { color: string; bg: string; description: string }> = {
    CRITICAL: { color: '#ff4444', bg: 'rgba(255,68,68,0.1)', description: 'Immediate action required — team velocity severely impacted' },
    HIGH: { color: '#f5a623', bg: 'rgba(245,166,35,0.1)', description: 'Should be addressed this sprint — moderate impact on delivery' },
    MEDIUM: { color: '#888', bg: 'rgba(136,136,136,0.1)', description: 'Plan to address soon — minor impact currently' },
    LOW: { color: '#555', bg: 'transparent', description: 'Worth tracking but not urgent' },
  }

  const TYPE_LABELS: Record<string, string> = {
    STUCK_PR: 'Stuck Pull Request', STALE_TASK: 'Stale Task', DEPENDENCY_BLOCK: 'Dependency Block',
    REVIEW_DELAY: 'Review Delay', CI_FAILURE: 'CI/CD Failure',
  }

  const config = severityConfig[bottleneck.severity] || severityConfig.MEDIUM

  return (
    <div
      className={cn(
        'border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#111] transition-colors cursor-pointer',
        bottleneck.severity === 'CRITICAL' && 'border-l-2 border-l-[#ff4444]',
        bottleneck.severity === 'HIGH' && 'border-l-2 border-l-[#f5a623]'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-3">
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
              <span className="text-[10px] font-mono text-[#555] uppercase">
                {TYPE_LABELS[bottleneck.type] || bottleneck.type.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-[13px] text-[#ededed] mt-1">{bottleneck.title}</p>
            {!expanded && bottleneck.description && (
              <p className="text-[11px] text-[#888] mt-1 line-clamp-1">{bottleneck.description}</p>
            )}
          </div>
          <span className="text-[#555] flex-shrink-0">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-3 border-t border-[#1a1a1a]">
          <div className="pt-2 ml-7 space-y-2">
            {/* Severity explanation */}
            <div className="bg-[#111] rounded p-2">
              <span className="text-[10px] text-[#555] uppercase tracking-wide block mb-1">Severity: {bottleneck.severity}</span>
              <p className="text-[11px] text-[#888]">{config.description}</p>
            </div>

            {bottleneck.description && (
              <p className="text-[12px] text-[#888] leading-relaxed">{bottleneck.description}</p>
            )}
            {bottleneck.impact && (
              <div className="bg-[#f5a623]/5 border border-[#f5a623]/20 rounded p-2">
                <span className="text-[10px] text-[#f5a623] uppercase tracking-wide block mb-1">Impact</span>
                <p className="text-[11px] text-[#f5a623]">{bottleneck.impact}</p>
              </div>
            )}
          </div>
        </div>
      )}
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
  const [expanded, setExpanded] = useState(false)
  const impactConfig: Record<string, { color: string }> = {
    HIGH: { color: '#ff4444' },
    MEDIUM: { color: '#f5a623' },
    LOW: { color: '#50e3c2' },
  }

  const config = impactConfig[risk.impact] || impactConfig.MEDIUM

  return (
    <div
      className="border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#111] transition-colors cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: config.color }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-[#555] uppercase">{risk.category}</span>
              <span className="text-[#333]">·</span>
              <span className="text-[10px] font-mono" style={{ color: config.color }}>
                {risk.likelihood} likelihood · {risk.impact} impact
              </span>
            </div>
            <p className="text-[13px] text-[#ededed] mt-1">{risk.title}</p>
            {!expanded && (
              <p className="text-[11px] text-[#888] mt-1 line-clamp-1">{risk.description}</p>
            )}
          </div>
          <span className="text-[#555] flex-shrink-0">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-3 border-t border-[#1a1a1a]">
          <div className="pt-2 ml-7 space-y-2">
            <p className="text-[12px] text-[#888] leading-relaxed">{risk.description}</p>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#111] rounded p-2">
                <span className="text-[10px] text-[#555] block">Likelihood</span>
                <span className="text-[12px] font-mono" style={{ color: risk.likelihood === 'HIGH' ? '#ff4444' : risk.likelihood === 'MEDIUM' ? '#f5a623' : '#50e3c2' }}>
                  {risk.likelihood}
                </span>
              </div>
              <div className="bg-[#111] rounded p-2">
                <span className="text-[10px] text-[#555] block">Impact</span>
                <span className="text-[12px] font-mono" style={{ color: config.color }}>{risk.impact}</span>
              </div>
            </div>

            <div className="bg-[#50e3c2]/5 border border-[#50e3c2]/20 rounded p-2">
              <span className="text-[10px] text-[#50e3c2] uppercase tracking-wide block mb-1">Mitigation</span>
              <p className="text-[11px] text-[#50e3c2]">{risk.mitigation}</p>
            </div>
          </div>
        </div>
      )}
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
  const [expanded, setExpanded] = useState(false)
  const priorityConfig: Record<string, { color: string; description: string }> = {
    HIGH: { color: '#ff4444', description: 'Address immediately for maximum impact' },
    MEDIUM: { color: '#f5a623', description: 'Plan to address within this sprint' },
    LOW: { color: '#50e3c2', description: 'Nice-to-have improvement' },
  }

  const config = priorityConfig[recommendation.priority] || priorityConfig.MEDIUM

  return (
    <div
      className="border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#111] transition-colors cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-3">
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
            {!expanded && (
              <p className="text-[11px] text-[#888] mt-1 line-clamp-1">{recommendation.description}</p>
            )}
          </div>
          <span className="text-[#555] flex-shrink-0">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-3 border-t border-[#1a1a1a]">
          <div className="pt-2 ml-7 space-y-2">
            <p className="text-[12px] text-[#888] leading-relaxed">{recommendation.description}</p>
            <div className="bg-[#111] rounded p-2">
              <span className="text-[10px] text-[#555] uppercase tracking-wide block mb-1">Priority</span>
              <span className="text-[12px] font-medium" style={{ color: config.color }}>{recommendation.priority}</span>
              <p className="text-[10px] text-[#555] mt-0.5">{config.description}</p>
            </div>
          </div>
        </div>
      )}
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
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
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

  // Generate positive signals from the data
  const strengths: string[] = []
  if (repoStats.length > 0) strengths.push(`Tracking ${repoStats.length} active repositor${repoStats.length === 1 ? 'y' : 'ies'}`)
  if (summary.totalTasks > 0) strengths.push(`${summary.totalTasks} tasks organized and tracked`)
  if (summary.totalPRs === 0) strengths.push('No stale PRs — clean review queue')
  if (repoStats.some(r => (r.completenessScore || 0) >= 70)) strengths.push('Repos showing strong health scores')
  const completedTasks = tasks.filter(t => t.status === 'DONE').length
  if (completedTasks > 0) strengths.push(`${completedTasks} task${completedTasks !== 1 ? 's' : ''} completed`)
  if ((summary.totalBottlenecks || 0) === 0) strengths.push('No active bottlenecks detected')
  if (predictions.length > 0) strengths.push('AI insights generating from your data')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Today</h2>
        <p className="text-[13px] text-[#888] mt-1">
          Your dashboard overview — click any item to expand
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
          <div className="text-[20px] font-mono font-semibold text-[#ededed]">{summary.totalTasks}</div>
          <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Tasks</div>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
          <div className="text-[20px] font-mono font-semibold text-[#ededed]">{repoStats.length}</div>
          <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Repos</div>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
          <div className={cn(
            'text-[20px] font-mono font-semibold',
            (summary.totalPredictions || 0) > 0 ? 'text-[#f5a623]' : 'text-[#ededed]'
          )}>
            {summary.totalPredictions || 0}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Insights</div>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
          <div className={cn(
            'text-[20px] font-mono font-semibold',
            (summary.totalBottlenecks || 0) > 0 ? 'text-[#ff4444]' : 'text-[#50e3c2]'
          )}>
            {summary.totalBottlenecks || 0}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Bottlenecks</div>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
          <div className="text-[20px] font-mono font-semibold text-[#ededed]">{summary.totalPRs}</div>
          <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Open PRs</div>
        </div>
      </div>

      {/* Strengths — always show positive signals first */}
      {strengths.length > 0 && (
        <div className="bg-[#50e3c2]/5 border border-[#50e3c2]/20 rounded-md p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-[#50e3c2]" />
            <span className="text-[12px] font-medium text-[#50e3c2] uppercase tracking-[0.5px]">What&apos;s Going Well</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {strengths.map((s, i) => (
              <span key={i} className="text-[12px] text-[#50e3c2]/80 bg-[#50e3c2]/10 px-2.5 py-1 rounded">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations — actionable next steps near the top */}
      {recommendations && recommendations.length > 0 && (
        <Section title="Recommended Next Steps" icon={<Lightbulb className="w-4 h-4" />} count={recommendations.length}>
          <div className="border border-[#1a1a1a] rounded-md overflow-hidden">
            {recommendations.map((rec, idx) => (
              <RecommendationCard key={idx} recommendation={rec} />
            ))}
          </div>
        </Section>
      )}

      {/* AI Predictions */}
      {predictions && predictions.length > 0 && (
        <Section title="AI Predictions" icon={<TrendingUp className="w-4 h-4" />} count={predictions.length}>
          <div className="border border-[#1a1a1a] rounded-md overflow-hidden">
            {predictions.map(prediction => (
              <PredictionCard key={prediction.id} prediction={prediction} />
            ))}
          </div>
        </Section>
      )}

      {/* Bottlenecks */}
      {bottlenecks && bottlenecks.length > 0 && (
        <Section title="Active Bottlenecks" icon={<AlertCircle className="w-4 h-4" />} count={bottlenecks.length}>
          <div className="border border-[#1a1a1a] rounded-md overflow-hidden">
            {bottlenecks.map(bottleneck => (
              <BottleneckCard key={bottleneck.id} bottleneck={bottleneck} />
            ))}
          </div>
        </Section>
      )}

      {/* Repository health */}
      {repoStats.length > 0 && (
        <Section title="Repository Health" icon={<GitBranch className="w-4 h-4" />} count={repoStats.length}>
          <div className="space-y-2">
            {repoStats.map(repo => (
              <RepoHealthCard key={repo.id} repo={repo} />
            ))}
          </div>
        </Section>
      )}

      {/* Risks */}
      {risks && risks.length > 0 && (
        <Section title="Risk Analysis" icon={<ShieldAlert className="w-4 h-4" />} count={risks.length}>
          <div className="border border-[#1a1a1a] rounded-md overflow-hidden">
            {risks.map((risk, idx) => (
              <RiskCard key={idx} risk={risk} />
            ))}
          </div>
        </Section>
      )}

      {/* PRs needing attention */}
      {prsToReview.length > 0 && (
        <Section title="Pull Requests" icon={<GitPullRequest className="w-4 h-4" />} count={prsToReview.length}>
          <div className="border border-[#1a1a1a] rounded-md overflow-hidden">
            {prsToReview.map(pr => (
              <PRCard key={pr.id} pr={pr} />
            ))}
          </div>
        </Section>
      )}

      {/* Assigned tasks */}
      {tasks.length > 0 && (
        <Section title="Your Tasks" icon={<CheckCircle2 className="w-4 h-4" />} count={tasks.length}>
          <div className="border border-[#1a1a1a] rounded-md overflow-hidden">
            {tasks.map(task => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
