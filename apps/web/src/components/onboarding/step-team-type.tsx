'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'
import { Card } from '@/components/nf/card'
import { Badge } from '@/components/nf/badge'
import { BreathingDot } from '@/components/nf/breathing-dot'
import { FormField, Input } from '@/components/nf/input'
import { TEAM_TYPES, getTeamSizeHint, type TeamType } from '@/lib/theme'
import type { OnboardingData } from './onboarding-flow'

interface StepTeamTypeProps {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
}

export function StepTeamType({ data, updateData }: StepTeamTypeProps) {
  const [expandedType, setExpandedType] = useState<TeamType | null>(data.teamType)

  const handleSelectType = (type: TeamType) => {
    setExpandedType(type)
    updateData({ teamType: type })
  }

  const teamSizeHint = getTeamSizeHint(data.teamSize)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-semibold text-foreground tracking-tighter">
          What kind of team are you?
        </h1>
        <p className="text-sm text-foreground-secondary max-w-lg mx-auto">
          This shapes everything — what NexFlow monitors, what predictions it generates, and what actions it surfaces.
        </p>
      </div>

      {/* Team Type Cards */}
      <div className="space-y-3">
        {(Object.keys(TEAM_TYPES) as TeamType[]).map((type, index) => {
          const config = TEAM_TYPES[type]
          const isSelected = data.teamType === type
          const isExpanded = expandedType === type

          return (
            <Card
              key={type}
              hover
              padding="none"
              glow={isSelected ? (type === 'launch' ? 'critical' : type === 'product' ? 'info' : type === 'agency' ? 'purple' : 'success') : 'none'}
              onClick={() => handleSelectType(type)}
              className={cn(
                'cursor-pointer transition-all duration-200',
                'animate-fade-in-up',
                isSelected && 'border-border-hover',
                `stagger-${index + 1}`
              )}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Selection indicator */}
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                      'transition-all duration-200',
                      isSelected ? 'border-accent bg-accent' : 'border-border'
                    )}
                  >
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path
                          d="M2 5L4 7L8 3"
                          stroke="black"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-lg', config.colorClass)}>{config.icon}</span>
                      <span className="text-base font-medium text-foreground">{config.name}</span>
                    </div>
                    <p className="text-sm text-foreground-secondary mt-0.5">{config.subtitle}</p>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="mt-4 space-y-4 animate-fade-in-up">
                        {/* Examples */}
                        <p className="text-xs font-mono text-foreground-tertiary">
                          {config.examples}
                        </p>

                        {/* Your tabs */}
                        <div className="space-y-2">
                          <span className="text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
                            Your tabs
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {config.tabs.map((tab) => (
                              <span
                                key={tab}
                                className="px-2 py-1 bg-background-secondary border border-border rounded text-xs text-foreground"
                              >
                                {tab}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Prediction types */}
                        <div className="space-y-2">
                          <span className="text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
                            What NexFlow predicts
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {config.predictionTypes.map((pred) => (
                              <Badge key={pred} variant="default" size="sm">
                                {pred}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* NexFlow AI Explanation */}
                        <div className="bg-nf-muted border border-nf/20 rounded-card p-3 mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <BreathingDot variant="nf" size="sm" />
                            <span className="text-xs font-mono text-nf">NexFlow AI</span>
                          </div>
                          <p className="text-sm text-foreground-secondary leading-relaxed">
                            {config.nexflowFocus}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Team Size Input */}
      <div className="max-w-xs mx-auto space-y-2">
        <FormField label="Team size" required>
          <Input
            type="number"
            min={2}
            max={1000}
            value={data.teamSize || ''}
            onChange={(e) => {
              const val = e.target.value
              // Allow empty string while typing, otherwise parse the number
              if (val === '') {
                updateData({ teamSize: 0 })
              } else {
                const num = parseInt(val, 10)
                if (!isNaN(num) && num >= 0) {
                  updateData({ teamSize: num })
                }
              }
            }}
            onBlur={(e) => {
              // On blur, ensure we have a valid value (minimum 2)
              const num = parseInt(e.target.value, 10)
              if (isNaN(num) || num < 2) {
                updateData({ teamSize: 2 })
              }
            }}
            placeholder="5"
          />
        </FormField>
        {teamSizeHint && (
          <p className="text-xs text-foreground-secondary text-center animate-fade-in">
            {teamSizeHint}
          </p>
        )}
      </div>
    </div>
  )
}
