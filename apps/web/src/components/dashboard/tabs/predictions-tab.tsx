'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'
import { trpc } from '@/lib/trpc'
import { TrendingUp, AlertTriangle, Clock, Lightbulb, Brain, Zap, ChevronDown, ChevronRight } from 'lucide-react'

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-[#d4a574]/10 flex items-center justify-center mb-4">
        <Brain className="w-8 h-8 text-[#d4a574]" />
      </div>
      <h3 className="text-[16px] font-medium text-[#ededed] mb-2">No predictions yet</h3>
      <p className="text-[13px] text-[#888] text-center max-w-md">
        Click <strong>Refresh</strong> in the header to generate AI predictions based on your project context and connected repositories.
      </p>
    </div>
  )
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  DEADLINE_RISK: { label: 'Deadline Risk', color: '#ff4444', icon: Clock },
  BURNOUT_INDICATOR: { label: 'Burnout Risk', color: '#f5a623', icon: AlertTriangle },
  VELOCITY_FORECAST: { label: 'Velocity', color: '#50e3c2', icon: TrendingUp },
  SCOPE_CREEP: { label: 'Scope Creep', color: '#a78bfa', icon: Zap },
}

function PredictionCard({ prediction }: {
  prediction: {
    id: string
    type: string
    confidence: number
    value: Record<string, unknown> | null
    reasoning: string | null
    project: { id: string; name: string; key: string } | null
    createdAt: string | Date
  }
}) {
  const [expanded, setExpanded] = useState(false)
  const config = TYPE_CONFIG[prediction.type] || { label: prediction.type, color: '#888', icon: Lightbulb }
  const Icon = config.icon
  const confidence = Math.round(prediction.confidence * 100)

  // Extract display fields from the value JSON
  const val = prediction.value || {}
  const title = (val.title as string) || prediction.reasoning?.split('.')[0] || config.label
  const description = (val.description as string) || prediction.reasoning || ''
  const suggestedAction = val.suggestedAction as string | undefined
  const forecastedVelocity = val.forecastedVelocity as number | undefined
  const trend = val.trend as string | undefined
  const riskLevel = val.riskLevel as string | undefined
  const technicalDebt = val.technicalDebt as number | undefined
  const estimatedHours = val.estimatedHours as number | undefined
  const metrics = val.metrics as Record<string, unknown> | undefined

  return (
    <div
      className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg hover:border-[#252525] transition-colors cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${config.color}15` }}
          >
            <span style={{ color: config.color }}><Icon className="w-4 h-4" /></span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] font-mono font-medium uppercase tracking-[0.5px] px-1.5 py-0.5 rounded"
                style={{ color: config.color, backgroundColor: `${config.color}15` }}
              >
                {config.label}
              </span>
              <span className="text-[10px] font-mono text-[#555]">{confidence}% confidence</span>
              {prediction.project && (
                <>
                  <span className="text-[#333]">·</span>
                  <span className="text-[10px] font-mono text-[#555]">{prediction.project.key}</span>
                </>
              )}
            </div>
            <h4 className="text-[13px] font-medium text-[#ededed]">{title}</h4>
            {!expanded && description && (
              <p className="text-[12px] text-[#888] mt-1 line-clamp-1">{description}</p>
            )}
          </div>
          <div className="flex-shrink-0 text-[#555]">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-[#1a1a1a] mt-0">
          <div className="pt-3 space-y-3 ml-11">
            {description && (
              <p className="text-[12px] text-[#888]">{description}</p>
            )}

            {/* Metrics */}
            <div className="flex flex-wrap gap-3">
              {forecastedVelocity !== undefined && forecastedVelocity !== null && (
                <div className="bg-[#111] px-3 py-1.5 rounded">
                  <span className="text-[10px] text-[#555] block">Velocity</span>
                  <span className="text-[13px] font-mono text-[#ededed]">{forecastedVelocity} pts/sprint</span>
                </div>
              )}
              {trend && (
                <div className="bg-[#111] px-3 py-1.5 rounded">
                  <span className="text-[10px] text-[#555] block">Trend</span>
                  <span className={cn(
                    'text-[13px] font-mono capitalize',
                    trend === 'decreasing' ? 'text-[#ff4444]' : trend === 'increasing' ? 'text-[#50e3c2]' : 'text-[#ededed]'
                  )}>{trend}</span>
                </div>
              )}
              {riskLevel && (
                <div className="bg-[#111] px-3 py-1.5 rounded">
                  <span className="text-[10px] text-[#555] block">Risk Level</span>
                  <span className={cn(
                    'text-[13px] font-mono capitalize',
                    riskLevel === 'high' ? 'text-[#ff4444]' : riskLevel === 'medium' ? 'text-[#f5a623]' : 'text-[#888]'
                  )}>{riskLevel}</span>
                </div>
              )}
              {technicalDebt !== undefined && (
                <div className="bg-[#111] px-3 py-1.5 rounded">
                  <span className="text-[10px] text-[#555] block">Tech Debt Items</span>
                  <span className="text-[13px] font-mono text-[#ededed]">{technicalDebt}</span>
                </div>
              )}
              {estimatedHours !== undefined && (
                <div className="bg-[#111] px-3 py-1.5 rounded">
                  <span className="text-[10px] text-[#555] block">Est. Hours</span>
                  <span className="text-[13px] font-mono text-[#ededed]">{estimatedHours}h</span>
                </div>
              )}
              {/* Commit-based metrics from Git analysis */}
              {metrics?.commitsPerDay !== undefined && (
                <div className="bg-[#111] px-3 py-1.5 rounded">
                  <span className="text-[10px] text-[#555] block">Commits/Day</span>
                  <span className="text-[13px] font-mono text-[#ededed]">{String(metrics.commitsPerDay)}</span>
                </div>
              )}
              {metrics?.activeContributors !== undefined && (
                <div className="bg-[#111] px-3 py-1.5 rounded">
                  <span className="text-[10px] text-[#555] block">Contributors</span>
                  <span className="text-[13px] font-mono text-[#ededed]">{String(metrics.activeContributors)}</span>
                </div>
              )}
              {metrics?.velocityTrend !== undefined && (
                <div className="bg-[#111] px-3 py-1.5 rounded">
                  <span className="text-[10px] text-[#555] block">Velocity Trend</span>
                  <span className={cn(
                    'text-[13px] font-mono capitalize',
                    metrics.velocityTrend === 'decelerating' ? 'text-[#ff4444]' : metrics.velocityTrend === 'accelerating' ? 'text-[#50e3c2]' : 'text-[#ededed]'
                  )}>{String(metrics.velocityTrend)}</span>
                </div>
              )}
              {metrics?.afterHoursPercent !== undefined && (
                <div className="bg-[#111] px-3 py-1.5 rounded">
                  <span className="text-[10px] text-[#555] block">After-Hours</span>
                  <span className={cn(
                    'text-[13px] font-mono',
                    Number(metrics.afterHoursPercent) > 20 ? 'text-[#ff4444]' : 'text-[#ededed]'
                  )}>{String(metrics.afterHoursPercent)}%</span>
                </div>
              )}
              {metrics?.weekendPercent !== undefined && (
                <div className="bg-[#111] px-3 py-1.5 rounded">
                  <span className="text-[10px] text-[#555] block">Weekend</span>
                  <span className={cn(
                    'text-[13px] font-mono',
                    Number(metrics.weekendPercent) > 15 ? 'text-[#f5a623]' : 'text-[#ededed]'
                  )}>{String(metrics.weekendPercent)}%</span>
                </div>
              )}
              {metrics?.fixPercent !== undefined && (
                <div className="bg-[#111] px-3 py-1.5 rounded">
                  <span className="text-[10px] text-[#555] block">Fix Commits</span>
                  <span className={cn(
                    'text-[13px] font-mono',
                    Number(metrics.fixPercent) > 30 ? 'text-[#ff4444]' : 'text-[#ededed]'
                  )}>{String(metrics.fixPercent)}%</span>
                </div>
              )}
              {metrics?.featurePercent !== undefined && (
                <div className="bg-[#111] px-3 py-1.5 rounded">
                  <span className="text-[10px] text-[#555] block">Feature Commits</span>
                  <span className="text-[13px] font-mono text-[#50e3c2]">{String(metrics.featurePercent)}%</span>
                </div>
              )}
            </div>

            {prediction.reasoning && prediction.reasoning !== description && (
              <div className="bg-[#111] rounded p-3">
                <span className="text-[10px] text-[#555] uppercase tracking-wide block mb-1">AI Reasoning</span>
                <p className="text-[12px] text-[#888]">{prediction.reasoning}</p>
              </div>
            )}

            {suggestedAction && (
              <div className="bg-[#50e3c2]/5 border border-[#50e3c2]/20 rounded p-3">
                <span className="text-[10px] text-[#50e3c2] uppercase tracking-wide block mb-1">Suggested Action</span>
                <p className="text-[12px] text-[#50e3c2]">{suggestedAction}</p>
              </div>
            )}
          </div>
        </div>
      )}
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
          <div key={i} className="h-24 bg-[#1a1a1a] rounded" />
        ))}
      </div>
    </div>
  )
}

export function PredictionsTab() {
  const { data: predictions, isLoading } = trpc.predictions.list.useQuery({})

  if (isLoading) {
    return <LoadingSkeleton />
  }

  // Use isActive (the actual field) not status
  const activePredictions = (predictions || []).filter((p: { isActive: boolean }) => p.isActive)

  // Calculate stats from actual data
  const avgConfidence = activePredictions.length > 0
    ? Math.round(activePredictions.reduce((acc: number, p: { confidence: number }) => acc + p.confidence, 0) / activePredictions.length * 100)
    : 0
  const highConfCount = activePredictions.filter((p: { confidence: number }) => p.confidence >= 0.7).length
  const typeBreakdown = activePredictions.reduce((acc: Record<string, number>, p: { type: string }) => {
    acc[p.type] = (acc[p.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">AI Predictions</h2>
        <p className="text-[13px] text-[#888] mt-1">
          AI-powered insights about your project trajectory
        </p>
      </div>

      {activePredictions.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
              <div className="text-[20px] font-mono font-semibold text-[#ededed]">{activePredictions.length}</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Active</div>
            </div>
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
              <div className="text-[20px] font-mono font-semibold text-[#d4a574]">{avgConfidence}%</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Avg Confidence</div>
            </div>
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
              <div className={cn(
                'text-[20px] font-mono font-semibold',
                highConfCount > 0 ? 'text-[#ff4444]' : 'text-[#ededed]'
              )}>{highConfCount}</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">High Confidence</div>
            </div>
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
              <div className="text-[20px] font-mono font-semibold text-[#ededed]">{Object.keys(typeBreakdown).length}</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">Categories</div>
            </div>
          </div>

          {/* Predictions list */}
          <div className="space-y-3">
            {activePredictions
              .sort((a: { confidence: number }, b: { confidence: number }) => b.confidence - a.confidence)
              .map((prediction: { id: string; type: string; confidence: number; value: unknown; reasoning: string | null; project: { id: string; name: string; key: string } | null; createdAt: string | Date }) => (
                <PredictionCard
                  key={prediction.id}
                  prediction={{
                    ...prediction,
                    value: prediction.value as Record<string, unknown> | null,
                  }}
                />
              ))}
          </div>
        </>
      )}
    </div>
  )
}
