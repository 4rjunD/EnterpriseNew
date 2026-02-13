'use client'

import { useState, useMemo } from 'react'
import { cn } from '@nexflow/ui/utils'
import { INTEGRATIONS, TEAM_TYPES, type TeamType } from '@/lib/theme'

// Prediction categories
const PREDICTION_CATEGORIES = {
  deadline: { label: 'Deadline', color: '#ff4444' },
  bottleneck: { label: 'Bottleneck', color: '#f5a623' },
  scope: { label: 'Scope', color: '#0070f3' },
  positive: { label: 'Positive', color: '#50e3c2' },
  pattern: { label: 'Pattern', color: '#d4a574' },
  quality: { label: 'Quality', color: '#f5a623' },
}

// Prediction type
interface Prediction {
  id: string
  category: keyof typeof PREDICTION_CATEGORIES
  title: string
  description: string
  probability: number
  impact: 'high' | 'medium' | 'low'
  dataSources: string[]
  confidence: number
  recommendation?: string
  relatedItems?: Array<{ type: 'task' | 'pr' | 'user', label: string }>
}

// Get integration icon
function getIntegrationIcon(id: string): string {
  const integration = INTEGRATIONS.find(i => i.id === id)
  return integration?.icon || '?'
}

// Prediction card - clean, minimal
function PredictionCard({ prediction }: { prediction: Prediction }) {
  const [expanded, setExpanded] = useState(false)
  const category = PREDICTION_CATEGORIES[prediction.category]

  return (
    <div
      className={cn(
        'bg-[#0a0a0a] border border-[#1a1a1a] rounded-md cursor-pointer transition-colors hover:border-[#252525]',
        expanded && 'border-[#252525]'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-2">
          {/* Category dot */}
          <span
            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
            style={{ backgroundColor: category.color }}
          />

          <div className="flex-1 min-w-0">
            {/* Labels row */}
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] font-mono font-medium uppercase tracking-[0.5px]"
                style={{ color: category.color }}
              >
                {category.label}
              </span>
              <span className={cn(
                'text-[10px] font-mono uppercase tracking-[0.5px] px-1.5 py-0.5 rounded',
                prediction.impact === 'high' && 'text-[#ff4444] bg-[#ff4444]/10',
                prediction.impact === 'medium' && 'text-[#f5a623] bg-[#f5a623]/10',
                prediction.impact === 'low' && 'text-[#555] border border-[#1a1a1a]'
              )}>
                {prediction.impact} impact
              </span>
            </div>

            {/* Title */}
            <h3 className="text-[14px] font-medium text-[#ededed] mb-1">
              {prediction.title}
            </h3>

            {/* Description */}
            <p className={cn(
              'text-[12px] text-[#888] leading-[1.5]',
              !expanded && 'line-clamp-2'
            )}>
              {prediction.description}
            </p>
          </div>

          {/* Probability */}
          <div className="text-right flex-shrink-0">
            <div className="text-[18px] font-mono font-semibold text-[#ededed]">
              {prediction.probability}%
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555]">probability</div>
          </div>
        </div>

        {/* Data sources row */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555]">Sources:</span>
          <div className="flex items-center gap-1">
            {prediction.dataSources.map(sourceId => (
              <span
                key={sourceId}
                className="w-5 h-5 rounded bg-[#1a1a1a] flex items-center justify-center text-[11px] text-[#555]"
                title={INTEGRATIONS.find(i => i.id === sourceId)?.name}
              >
                {getIntegrationIcon(sourceId)}
              </span>
            ))}
          </div>
          <span className="ml-auto text-[11px] font-mono text-[#555]">
            {prediction.confidence}% confidence
          </span>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="pt-3 mt-3 border-t border-[#1a1a1a] space-y-3">
            {/* Related items */}
            {prediction.relatedItems && prediction.relatedItems.length > 0 && (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555]">Related:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {prediction.relatedItems.map((item, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-[#1a1a1a] rounded text-[11px] font-mono text-[#888]"
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation */}
            {prediction.recommendation && (
              <div className="p-3 border border-[#d4a574]/20 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4a574] animate-pulse" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#d4a574]">NexFlow Recommendation</span>
                </div>
                <p className="text-[12px] text-[#888]">{prediction.recommendation}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Stats overview - 4 column grid
function PredictionStats({ predictions }: { predictions: Prediction[] }) {
  const highImpact = predictions.filter(p => p.impact === 'high').length
  const avgConfidence = Math.round(
    predictions.reduce((acc, p) => acc + p.confidence, 0) / predictions.length
  ) || 0
  const positive = predictions.filter(p => p.category === 'positive').length

  const stats = [
    { value: predictions.length.toString(), label: 'Active', color: '#ededed' },
    { value: highImpact.toString(), label: 'High Impact', color: highImpact > 0 ? '#ff4444' : '#ededed' },
    { value: `${avgConfidence}%`, label: 'Avg Confidence', color: '#ededed' },
    { value: positive.toString(), label: 'Positive', color: positive > 0 ? '#50e3c2' : '#ededed' },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <div key={i} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
          <div className="text-[20px] font-mono font-semibold" style={{ color: stat.color }}>{stat.value}</div>
          <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

interface PredictionsTabProps {
  teamType?: TeamType
}

export function PredictionsTab({ teamType = 'launch' }: PredictionsTabProps) {
  const teamConfig = TEAM_TYPES[teamType]

  // Use team-specific sample predictions
  const initialPredictions = useMemo(() => {
    return teamConfig.samplePredictions.map((title, i) => ({
      id: String(i + 1),
      category: (['deadline', 'bottleneck', 'scope', 'positive', 'pattern'][i % 5]) as keyof typeof PREDICTION_CATEGORIES,
      title,
      description: `NexFlow detected this pattern based on your ${teamType === 'launch' ? 'launch timeline' : teamType === 'product' ? 'sprint data' : teamType === 'agency' ? 'project metrics' : 'deploy history'}.`,
      probability: [73, 95, 82, 88, 65][i % 5],
      impact: (['high', 'high', 'medium', 'medium', 'low'] as const)[i % 5],
      dataSources: ['github', 'linear'],
      confidence: [89, 94, 87, 91, 78][i % 5],
      recommendation: teamConfig.actionVerbs[i % teamConfig.actionVerbs.length] + ' to address this prediction',
    }))
  }, [teamType, teamConfig])

  const [predictions] = useState<Prediction[]>(initialPredictions)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  // Filter predictions
  const filteredPredictions = categoryFilter
    ? predictions.filter(p => p.category === categoryFilter)
    : predictions

  // Sort by probability and impact
  const sortedPredictions = [...filteredPredictions].sort((a, b) => {
    const impactOrder = { high: 3, medium: 2, low: 1 }
    if (impactOrder[a.impact] !== impactOrder[b.impact]) {
      return impactOrder[b.impact] - impactOrder[a.impact]
    }
    return b.probability - a.probability
  })

  const categories = Object.entries(PREDICTION_CATEGORIES)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Predictions</h2>
        <p className="text-[13px] text-[#888] mt-1">
          AI-powered forecasts based on your team's data
        </p>
      </div>

      {/* Stats */}
      <PredictionStats predictions={predictions} />

      {/* Category filters */}
      <div className="flex items-center gap-2 flex-wrap pt-2">
        <button
          onClick={() => setCategoryFilter(null)}
          className={cn(
            'px-3 py-1.5 text-[13px] rounded-md transition-colors',
            categoryFilter === null
              ? 'bg-[#ededed] text-[#000] font-medium'
              : 'text-[#888] hover:text-[#ededed]'
          )}
        >
          All
        </button>
        {categories.map(([key, config]) => (
          <button
            key={key}
            onClick={() => setCategoryFilter(key)}
            className={cn(
              'px-3 py-1.5 text-[13px] rounded-md transition-colors',
              categoryFilter === key
                ? 'font-medium'
                : 'text-[#888] hover:text-[#ededed]'
            )}
            style={{
              backgroundColor: categoryFilter === key ? `${config.color}15` : undefined,
              color: categoryFilter === key ? config.color : undefined,
            }}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* Predictions list */}
      <div className="space-y-3">
        {sortedPredictions.map(prediction => (
          <PredictionCard key={prediction.id} prediction={prediction} />
        ))}

        {sortedPredictions.length === 0 && (
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-8 text-center">
            <div className="text-[#555] mb-2">No predictions in this category</div>
            <button
              onClick={() => setCategoryFilter(null)}
              className="text-[13px] text-[#888] hover:text-[#ededed]"
            >
              View all predictions
            </button>
          </div>
        )}
      </div>

      {/* Data explanation - minimal */}
      <div className="p-4 border border-[#1a1a1a] rounded-md">
        <div className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full bg-[#d4a574] mt-1.5 animate-pulse" />
          <div>
            <h4 className="text-[13px] font-medium text-[#ededed] mb-1">How predictions work</h4>
            <p className="text-[12px] text-[#555] leading-[1.5]">
              NexFlow analyzes patterns across your connected integrations to identify risks and opportunities.
              Predictions are updated continuously as new data arrives.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
