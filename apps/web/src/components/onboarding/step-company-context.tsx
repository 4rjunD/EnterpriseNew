'use client'

import { Card } from '@/components/nf/card'
import { Badge } from '@/components/nf/badge'
import { FormField, Input } from '@/components/nf/input'
import type { OnboardingData } from './onboarding-flow'

interface StepCompanyContextProps {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
}

const INDUSTRIES = [
  { value: 'saas', label: 'SaaS', icon: '☁️' },
  { value: 'ecommerce', label: 'E-commerce', icon: '🛒' },
  { value: 'fintech', label: 'FinTech', icon: '💳' },
  { value: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'media', label: 'Media', icon: '📺' },
  { value: 'gaming', label: 'Gaming', icon: '🎮' },
  { value: 'enterprise', label: 'Enterprise', icon: '🏢' },
  { value: 'other', label: 'Other', icon: '🔧' },
]

const COMPANY_STAGES = [
  { value: 'startup', label: 'Startup', description: 'Pre-seed to Series A, <20 employees' },
  { value: 'growth', label: 'Growth', description: 'Series A-C, 20-200 employees' },
  { value: 'scaleup', label: 'Scale-up', description: 'Series C+, 200-1000 employees' },
  { value: 'enterprise', label: 'Enterprise', description: '1000+ employees' },
]

const TEAM_DISTRIBUTIONS = [
  { value: 'remote', label: 'Fully Remote', icon: '🌍' },
  { value: 'hybrid', label: 'Hybrid', icon: '🏠' },
  { value: 'onsite', label: 'On-site', icon: '🏢' },
]

const DEV_METHODS = [
  { value: 'agile-scrum', label: 'Agile / Scrum', description: 'Sprint-based development' },
  { value: 'kanban', label: 'Kanban', description: 'Continuous flow' },
  { value: 'waterfall', label: 'Waterfall', description: 'Sequential phases' },
  { value: 'lean', label: 'Lean', description: 'MVP-focused, rapid iteration' },
  { value: 'custom', label: 'Custom / Mixed', description: 'Your own methodology' },
]

const CHALLENGES = [
  { value: 'technical-debt', label: 'Technical debt', icon: '🔧' },
  { value: 'scaling', label: 'Scaling infrastructure', icon: '📈' },
  { value: 'velocity', label: 'Team velocity', icon: '⚡' },
  { value: 'quality', label: 'Code quality', icon: '✨' },
  { value: 'hiring', label: 'Hiring & onboarding', icon: '👥' },
  { value: 'deadlines', label: 'Meeting deadlines', icon: '📅' },
  { value: 'communication', label: 'Team communication', icon: '💬' },
  { value: 'process', label: 'Process clarity', icon: '📋' },
]

const RISK_TOLERANCES = [
  { value: 'conservative', label: 'Conservative', description: 'Prefer stability, thorough testing' },
  { value: 'moderate', label: 'Moderate', description: 'Balanced risk vs speed' },
  { value: 'aggressive', label: 'Aggressive', description: 'Move fast, iterate quickly' },
]

export function StepCompanyContext({ data, updateData }: StepCompanyContextProps) {
  const toggleChallenge = (challenge: string) => {
    const current = data.primaryChallenges || []
    if (current.includes(challenge)) {
      updateData({ primaryChallenges: current.filter((c) => c !== challenge) })
    } else if (current.length < 4) {
      updateData({ primaryChallenges: [...current, challenge] })
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-semibold text-foreground tracking-tighter">
          Tell us about your company
        </h1>
        <p className="text-sm text-foreground-secondary max-w-md mx-auto">
          This helps NexFlow generate relevant predictions and recommendations — even before connecting any integrations.
        </p>
      </div>

      {/* Form sections */}
      <div className="max-w-xl mx-auto space-y-8">
        {/* Industry */}
        <FormField label="Industry" hint="What sector does your company operate in?">
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((industry) => (
              <button
                key={industry.value}
                type="button"
                onClick={() => updateData({ industry: industry.value })}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                  data.industry === industry.value
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border hover:border-foreground-tertiary text-foreground-secondary'
                }`}
              >
                <span className="mr-1.5">{industry.icon}</span>
                {industry.label}
              </button>
            ))}
          </div>
        </FormField>

        {/* Company Stage */}
        <FormField label="Company stage" hint="Where is your company in its journey?">
          <div className="grid grid-cols-2 gap-3">
            {COMPANY_STAGES.map((stage) => (
              <button
                key={stage.value}
                type="button"
                onClick={() => updateData({ companyStage: stage.value })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  data.companyStage === stage.value
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-foreground-tertiary'
                }`}
              >
                <p className={`text-sm font-medium ${data.companyStage === stage.value ? 'text-accent' : 'text-foreground'}`}>
                  {stage.label}
                </p>
                <p className="text-xs text-foreground-tertiary mt-0.5">{stage.description}</p>
              </button>
            ))}
          </div>
        </FormField>

        {/* Team Distribution */}
        <FormField label="Team distribution" hint="How does your team work?">
          <div className="flex gap-3">
            {TEAM_DISTRIBUTIONS.map((dist) => (
              <button
                key={dist.value}
                type="button"
                onClick={() => updateData({ teamDistribution: dist.value })}
                className={`flex-1 py-3 rounded-lg border text-center transition-all ${
                  data.teamDistribution === dist.value
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border hover:border-foreground-tertiary text-foreground-secondary'
                }`}
              >
                <span className="text-xl block mb-1">{dist.icon}</span>
                <span className="text-sm">{dist.label}</span>
              </button>
            ))}
          </div>
        </FormField>

        {/* Development Methodology */}
        <FormField label="Development methodology" hint="How does your team ship code?">
          <div className="space-y-2">
            {DEV_METHODS.map((method) => (
              <button
                key={method.value}
                type="button"
                onClick={() => updateData({ developmentMethod: method.value })}
                className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                  data.developmentMethod === method.value
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-foreground-tertiary'
                }`}
              >
                <div>
                  <p className={`text-sm font-medium ${data.developmentMethod === method.value ? 'text-accent' : 'text-foreground'}`}>
                    {method.label}
                  </p>
                  <p className="text-xs text-foreground-tertiary">{method.description}</p>
                </div>
                {data.developmentMethod === method.value && (
                  <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </FormField>

        {/* Primary Challenges */}
        <FormField label="Primary challenges" hint="Select up to 4 challenges your team faces">
          <div className="flex flex-wrap gap-2">
            {CHALLENGES.map((challenge) => {
              const isSelected = (data.primaryChallenges || []).includes(challenge.value)
              const isDisabled = !isSelected && (data.primaryChallenges || []).length >= 4
              return (
                <button
                  key={challenge.value}
                  type="button"
                  onClick={() => toggleChallenge(challenge.value)}
                  disabled={isDisabled}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                    isSelected
                      ? 'border-accent bg-accent/10 text-accent'
                      : isDisabled
                      ? 'border-border text-foreground-tertiary opacity-50 cursor-not-allowed'
                      : 'border-border hover:border-foreground-tertiary text-foreground-secondary'
                  }`}
                >
                  <span className="mr-1.5">{challenge.icon}</span>
                  {challenge.label}
                </button>
              )
            })}
          </div>
          {(data.primaryChallenges || []).length > 0 && (
            <p className="text-xs text-foreground-tertiary mt-2">
              {(data.primaryChallenges || []).length}/4 selected
            </p>
          )}
        </FormField>

        {/* Risk Tolerance */}
        <FormField label="Risk tolerance" hint="How does your team approach risk?">
          <div className="grid grid-cols-3 gap-3">
            {RISK_TOLERANCES.map((risk) => (
              <button
                key={risk.value}
                type="button"
                onClick={() => updateData({ riskTolerance: risk.value })}
                className={`p-3 rounded-lg border text-center transition-all ${
                  data.riskTolerance === risk.value
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-foreground-tertiary'
                }`}
              >
                <p className={`text-sm font-medium ${data.riskTolerance === risk.value ? 'text-accent' : 'text-foreground'}`}>
                  {risk.label}
                </p>
                <p className="text-xs text-foreground-tertiary mt-0.5">{risk.description}</p>
              </button>
            ))}
          </div>
        </FormField>
      </div>

      {/* Preview Card */}
      <Card className="max-w-xl mx-auto" padding="md">
        <div className="space-y-3">
          <p className="label">NexFlow will generate insights for</p>
          <div className="flex flex-wrap gap-1.5">
            {data.industry && (
              <Badge variant="default" size="sm">
                {INDUSTRIES.find(i => i.value === data.industry)?.label} industry
              </Badge>
            )}
            {data.companyStage && (
              <Badge variant="default" size="sm">
                {COMPANY_STAGES.find(s => s.value === data.companyStage)?.label} stage
              </Badge>
            )}
            {data.developmentMethod && (
              <Badge variant="default" size="sm">
                {DEV_METHODS.find(m => m.value === data.developmentMethod)?.label}
              </Badge>
            )}
            {(data.primaryChallenges || []).map(c => (
              <Badge key={c} variant="secondary" size="sm">
                {CHALLENGES.find(ch => ch.value === c)?.label}
              </Badge>
            ))}
          </div>
          {(!data.industry && !data.companyStage && !data.developmentMethod) && (
            <p className="text-xs text-foreground-tertiary">
              Select options above to see AI-powered predictions tailored to your context
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
