'use client'

import { cn } from '@nexflow/ui/utils'
import { trpc } from '@/lib/trpc'
import { TrendingUp, AlertTriangle, Clock, Lightbulb, Plug, Brain } from 'lucide-react'
import Link from 'next/link'

function EmptyState({ hasIntegrations }: { hasIntegrations: boolean }) {
  if (!hasIntegrations) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
          <Plug className="w-8 h-8 text-[#555]" />
        </div>
        <h3 className="text-[16px] font-medium text-[#ededed] mb-2">Connect integrations to enable predictions</h3>
        <p className="text-[13px] text-[#888] text-center max-w-md mb-6">
          NexFlow uses AI to analyze your project data and predict potential issues before they happen.
          Connect your tools to get started.
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
      <div className="w-16 h-16 rounded-full bg-[#d4a574]/10 flex items-center justify-center mb-4">
        <Brain className="w-8 h-8 text-[#d4a574]" />
      </div>
      <h3 className="text-[16px] font-medium text-[#ededed] mb-2">Gathering data for predictions</h3>
      <p className="text-[13px] text-[#888] text-center max-w-md">
        NexFlow needs more project history to generate accurate predictions.
        Keep syncing your data and predictions will appear automatically.
      </p>
    </div>
  )
}

const CATEGORY_CONFIG = {
  DEADLINE_RISK: { label: 'Deadline Risk', color: '#ff4444', icon: Clock },
  BOTTLENECK: { label: 'Bottleneck', color: '#f5a623', icon: AlertTriangle },
  SCOPE_CREEP: { label: 'Scope', color: '#0070f3', icon: TrendingUp },
  VELOCITY: { label: 'Velocity', color: '#50e3c2', icon: TrendingUp },
  BURNOUT_RISK: { label: 'Team Health', color: '#ff4444', icon: AlertTriangle },
  OPPORTUNITY: { label: 'Opportunity', color: '#50e3c2', icon: Lightbulb },
}

function PredictionCard({ prediction }: {
  prediction: {
    id: string
    type: string
    title: string
    description: string
    probability: number
    impact: string
    suggestedAction?: string | null
    confidence: number
  }
}) {
  const config = CATEGORY_CONFIG[prediction.type as keyof typeof CATEGORY_CONFIG] || {
    label: prediction.type,
    color: '#888',
    icon: Lightbulb,
  }
  const Icon = config.icon

  const impactColor = {
    HIGH: '#ff4444',
    MEDIUM: '#f5a623',
    LOW: '#555',
  }[prediction.impact] || '#555'

  return (
    <div className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-md hover:border-[#252525] transition-colors">
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${config.color}15` }}
        >
          <Icon className="w-4 h-4" style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-mono font-medium uppercase tracking-[0.5px] px-1.5 py-0.5 rounded"
              style={{ color: config.color, backgroundColor: `${config.color}15` }}
            >
              {config.label}
            </span>
            <span className="text-[10px] font-mono text-[#555]">
              {prediction.probability}% likely
            </span>
          </div>
          <h4 className="text-[13px] font-medium text-[#ededed] mb-1">{prediction.title}</h4>
          <p className="text-[12px] text-[#888] mb-2">{prediction.description}</p>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[#555]">Impact:</span>
              <span className="text-[10px] font-mono" style={{ color: impactColor }}>
                {prediction.impact}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[#555]">Confidence:</span>
              <span className="text-[10px] font-mono text-[#888]">
                {prediction.confidence}%
              </span>
            </div>
          </div>

          {prediction.suggestedAction && (
            <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
              <p className="text-[12px] text-[#d4a574]">
                <span className="text-[#555]">Suggestion:</span> {prediction.suggestedAction}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-[#1a1a1a] rounded w-48" />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-[#1a1a1a] rounded" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-[#1a1a1a] rounded" />
        ))}
      </div>
    </div>
  )
}

export function PredictionsTab() {
  const { data: integrations, isLoading: integrationsLoading } = trpc.integrations.list.useQuery()
  const { data: predictions, isLoading: predictionsLoading } = trpc.predictions.list.useQuery({})

  const isLoading = integrationsLoading || predictionsLoading

  if (isLoading) {
    return <LoadingSkeleton />
  }

  const hasIntegrations = (integrations?.connected?.length || 0) > 0
  const predictionsList = predictions || []
  const activePredictions = predictionsList.filter(p => p.status === 'ACTIVE')

  // Calculate stats
  const highImpactCount = activePredictions.filter(p => p.impact === 'HIGH').length
  const avgConfidence = activePredictions.length > 0
    ? Math.round(activePredictions.reduce((acc, p) => acc + p.confidence, 0) / activePredictions.length)
    : 0
  const avgProbability = activePredictions.length > 0
    ? Math.round(activePredictions.reduce((acc, p) => acc + p.probability, 0) / activePredictions.length)
    : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">AI Predictions</h2>
        <p className="text-[13px] text-[#888] mt-1">
          Machine learning insights about your project trajectory
        </p>
      </div>

      {/* Stats */}
      {hasIntegrations && activePredictions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
            <div className="text-[20px] font-mono font-semibold text-[#ededed]">{activePredictions.length}</div>
            <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Active Predictions</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
            <div className={cn(
              'text-[20px] font-mono font-semibold',
              highImpactCount > 0 ? 'text-[#ff4444]' : 'text-[#ededed]'
            )}>
              {highImpactCount}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">High Impact</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
            <div className="text-[20px] font-mono font-semibold text-[#d4a574]">{avgConfidence}%</div>
            <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Avg Confidence</div>
          </div>
        </div>
      )}

      {/* Predictions list or empty state */}
      {!hasIntegrations || activePredictions.length === 0 ? (
        <EmptyState hasIntegrations={hasIntegrations} />
      ) : (
        <div className="space-y-3">
          {activePredictions
            .sort((a, b) => {
              // Sort by impact, then probability
              const impactOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
              const aImpact = impactOrder[a.impact as keyof typeof impactOrder] ?? 2
              const bImpact = impactOrder[b.impact as keyof typeof impactOrder] ?? 2
              if (aImpact !== bImpact) return aImpact - bImpact
              return b.probability - a.probability
            })
            .map(prediction => (
              <PredictionCard key={prediction.id} prediction={prediction} />
            ))}
        </div>
      )}
    </div>
  )
}
