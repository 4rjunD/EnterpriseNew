'use client'

import { useState, useMemo } from 'react'
import { cn } from '@nexflow/ui/utils'
import { trpc } from '@/lib/trpc'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/nf/card'
import { Badge, SeverityBadge } from '@/components/nf/badge'
import { BreathingDot } from '@/components/nf/breathing-dot'
import { AnimPercent, StatCounter } from '@/components/nf/anim-num'
import { Progress, LabeledProgress } from '@/components/nf/progress'
import { PREDICTION_CATEGORIES, INTEGRATIONS, TEAM_TYPES, type TeamType } from '@/lib/theme'

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

// Mock predictions data
const mockPredictions: Prediction[] = [
  {
    id: '1',
    category: 'deadline',
    title: 'MVP likely to slip by 3-5 days',
    description: 'Based on current velocity and remaining scope, the March 15 deadline has a 73% chance of slipping.',
    probability: 73,
    impact: 'high',
    dataSources: ['linear', 'github'],
    confidence: 89,
    recommendation: 'Consider cutting the offline mode feature (saves ~4 days)',
    relatedItems: [
      { type: 'task', label: 'AUTH-42: OAuth flow' },
      { type: 'task', label: 'AUTH-45: Token refresh' },
    ],
  },
  {
    id: '2',
    category: 'bottleneck',
    title: 'Alex becoming a bottleneck',
    description: '5 PRs waiting for Alex\'s review, avg wait time now 2.3 days (team avg: 0.8 days)',
    probability: 95,
    impact: 'high',
    dataSources: ['github', 'slack'],
    confidence: 94,
    recommendation: 'Redistribute 2 PRs to Jordan (has capacity)',
    relatedItems: [
      { type: 'user', label: 'Alex Chen' },
      { type: 'pr', label: 'PR #142, #145, #148' },
    ],
  },
  {
    id: '3',
    category: 'scope',
    title: 'Onboarding flow scope creeping',
    description: 'Original estimate: 3 days. Current trajectory: 7+ days. 4 new tasks added since start.',
    probability: 82,
    impact: 'medium',
    dataSources: ['linear'],
    confidence: 87,
    recommendation: 'Redefine scope or re-estimate with buffer',
    relatedItems: [
      { type: 'task', label: 'ONB-12: Welcome screen' },
    ],
  },
  {
    id: '4',
    category: 'positive',
    title: 'Payment integration ahead of schedule',
    description: 'Maya\'s velocity on payment tasks 40% higher than estimated. Expected completion: 2 days early.',
    probability: 88,
    impact: 'medium',
    dataSources: ['github', 'linear'],
    confidence: 91,
    relatedItems: [
      { type: 'user', label: 'Maya Johnson' },
    ],
  },
  {
    id: '5',
    category: 'quality',
    title: 'Test coverage declining',
    description: 'Coverage dropped from 78% to 71% in the last sprint. New code has ~45% coverage.',
    probability: 100,
    impact: 'low',
    dataSources: ['github'],
    confidence: 100,
    recommendation: 'Schedule a testing sprint or enforce coverage thresholds',
  },
]

// Get integration icon
function getIntegrationIcon(id: string): string {
  const integration = INTEGRATIONS.find(i => i.id === id)
  return integration?.icon || '?'
}

// Prediction card component
function PredictionCard({ prediction }: { prediction: Prediction }) {
  const [expanded, setExpanded] = useState(false)
  const category = PREDICTION_CATEGORIES[prediction.category]

  const impactColor = {
    high: 'bg-status-critical-muted text-status-critical',
    medium: 'bg-status-warning-muted text-status-warning',
    low: 'bg-foreground/5 text-foreground-secondary',
  }[prediction.impact]

  return (
    <Card
      glow={prediction.impact === 'high' && prediction.probability >= 70 ? 'critical' : 'none'}
      hover
      className={cn(
        'cursor-pointer transition-all',
        expanded && 'ring-1 ring-border-hover'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Category indicator */}
          <div
            className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
            style={{ backgroundColor: category.color }}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="default"
                className="text-xs"
                style={{
                  backgroundColor: `${category.color}20`,
                  color: category.color,
                }}
              >
                {category.label}
              </Badge>
              <span className={cn('px-1.5 py-0.5 rounded text-xs', impactColor)}>
                {prediction.impact} impact
              </span>
            </div>

            <h3 className="text-sm font-medium text-foreground mb-1">
              {prediction.title}
            </h3>

            <p className="text-xs text-foreground-secondary line-clamp-2">
              {prediction.description}
            </p>
          </div>

          {/* Probability */}
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-mono font-medium text-foreground">
              {prediction.probability}%
            </div>
            <div className="text-xs text-foreground-tertiary">probability</div>
          </div>
        </div>

        {/* Data sources */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-foreground-tertiary">Sources:</span>
          <div className="flex items-center gap-1">
            {prediction.dataSources.map(sourceId => (
              <span
                key={sourceId}
                className="w-5 h-5 rounded bg-background-secondary flex items-center justify-center text-xs text-foreground-tertiary"
                title={INTEGRATIONS.find(i => i.id === sourceId)?.name}
              >
                {getIntegrationIcon(sourceId)}
              </span>
            ))}
          </div>
          <div className="ml-auto text-xs text-foreground-tertiary">
            {prediction.confidence}% confidence
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="pt-3 border-t border-border space-y-3 animate-fade-in-up">
            {/* Related items */}
            {prediction.relatedItems && prediction.relatedItems.length > 0 && (
              <div>
                <span className="text-xs text-foreground-tertiary">Related:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {prediction.relatedItems.map((item, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-background-secondary rounded text-xs text-foreground-secondary"
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation */}
            {prediction.recommendation && (
              <div className="p-3 bg-nf-muted border border-nf/20 rounded-md">
                <div className="flex items-center gap-2 mb-1">
                  <BreathingDot variant="nf" size="sm" />
                  <span className="text-xs font-medium text-nf">NexFlow Recommendation</span>
                </div>
                <p className="text-xs text-foreground-secondary">{prediction.recommendation}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Stats overview
function PredictionStats({ predictions }: { predictions: Prediction[] }) {
  const highImpact = predictions.filter(p => p.impact === 'high').length
  const avgConfidence = Math.round(
    predictions.reduce((acc, p) => acc + p.confidence, 0) / predictions.length
  ) || 0
  const positive = predictions.filter(p => p.category === 'positive').length

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-foreground">{predictions.length}</div>
          <div className="text-xs text-foreground-secondary">Active Predictions</div>
        </CardContent>
      </Card>
      <Card padding="sm" glow={highImpact > 0 ? 'critical' : 'none'}>
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-status-critical">{highImpact}</div>
          <div className="text-xs text-foreground-secondary">High Impact</div>
        </CardContent>
      </Card>
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-foreground">{avgConfidence}%</div>
          <div className="text-xs text-foreground-secondary">Avg Confidence</div>
        </CardContent>
      </Card>
      <Card padding="sm" glow={positive > 0 ? 'success' : 'none'}>
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-status-success">{positive}</div>
          <div className="text-xs text-foreground-secondary">Positive Signals</div>
        </CardContent>
      </Card>
    </div>
  )
}

interface PredictionsTabProps {
  teamType?: TeamType
}

export function PredictionsTab({ teamType = 'launch' }: PredictionsTabProps) {
  const teamConfig = TEAM_TYPES[teamType]
  // Use team-specific sample predictions as mock data
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Predictions</h2>
        <p className="text-sm text-foreground-secondary mt-1">
          AI-powered forecasts based on your team's data
        </p>
      </div>

      {/* Stats */}
      <PredictionStats predictions={predictions} />

      {/* Category filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setCategoryFilter(null)}
          className={cn(
            'px-3 py-1.5 text-sm rounded-full transition-colors',
            categoryFilter === null
              ? 'bg-foreground text-background font-medium'
              : 'bg-background-secondary text-foreground-secondary hover:text-foreground'
          )}
        >
          All
        </button>
        {categories.map(([key, config]) => (
          <button
            key={key}
            onClick={() => setCategoryFilter(key)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-full transition-colors',
              categoryFilter === key
                ? 'font-medium'
                : 'text-foreground-secondary hover:text-foreground'
            )}
            style={{
              backgroundColor: categoryFilter === key ? `${config.color}20` : undefined,
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
          <Card padding="lg">
            <CardContent className="p-8 text-center">
              <div className="text-foreground-tertiary mb-2">No predictions in this category</div>
              <button
                onClick={() => setCategoryFilter(null)}
                className="text-sm text-foreground-secondary hover:text-foreground"
              >
                View all predictions
              </button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Data explanation */}
      <div className="p-4 bg-background-secondary border border-border rounded-lg">
        <div className="flex items-start gap-3">
          <BreathingDot variant="nf" size="md" />
          <div>
            <h4 className="text-sm font-medium text-foreground mb-1">How predictions work</h4>
            <p className="text-xs text-foreground-secondary leading-relaxed">
              NexFlow analyzes patterns across your connected integrations to identify risks and opportunities.
              Predictions are updated continuously as new data arrives. Confidence scores reflect how
              much historical data supports each prediction.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
