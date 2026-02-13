'use client'

import { Card } from '@/components/nf/card'
import { Badge } from '@/components/nf/badge'
import { FormField, Input, Textarea } from '@/components/nf/input'
import { TEAM_TYPES } from '@/lib/theme'
import type { OnboardingData } from './onboarding-flow'

interface StepConfigureProps {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
}

export function StepConfigure({ data, updateData }: StepConfigureProps) {
  const teamType = data.teamType
  if (!teamType) return null

  const config = TEAM_TYPES[teamType]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <span className={`text-xl ${config.colorClass}`}>{config.icon}</span>
          <h1 className="text-2xl font-semibold text-foreground tracking-tighter">
            Configure your {config.name.toLowerCase()}
          </h1>
        </div>
        <p className="text-sm text-foreground-secondary max-w-md mx-auto">
          These settings help NexFlow generate accurate predictions and actions.
        </p>
      </div>

      {/* Type-specific fields */}
      <div className="max-w-md mx-auto space-y-5">
        {teamType === 'launch' && (
          <LaunchConfig data={data} updateData={updateData} />
        )}
        {teamType === 'product' && (
          <ProductConfig data={data} updateData={updateData} />
        )}
        {teamType === 'agency' && (
          <AgencyConfig data={data} updateData={updateData} />
        )}
        {teamType === 'engineering' && (
          <EngineeringConfig data={data} updateData={updateData} />
        )}
      </div>

      {/* Preview Card */}
      <Card className="max-w-md mx-auto" padding="md">
        <div className="space-y-4">
          <p className="label">Your dashboard will include</p>

          {/* Tabs preview */}
          <div className="flex flex-wrap gap-1.5">
            {config.tabs.map((tab) => (
              <Badge key={tab} variant="default" size="sm">
                {tab}
              </Badge>
            ))}
          </div>

          {/* Primary metric */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm text-foreground-secondary">Primary metric</span>
            <span className="text-sm font-medium text-foreground">{config.primaryMetricLabel}</span>
          </div>

          {/* Action verbs */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground-secondary">Action types</span>
            <div className="flex gap-1">
              {config.actionVerbs.slice(0, 3).map((verb) => (
                <span key={verb} className="text-xs font-mono text-foreground-tertiary">
                  {verb}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Launch-specific configuration
function LaunchConfig({ data, updateData }: StepConfigureProps) {
  return (
    <>
      <FormField label="Launch date" required>
        <Input
          type="date"
          value={data.launchDate || ''}
          onChange={(e) => updateData({ launchDate: e.target.value })}
        />
      </FormField>

      <FormField label="What are you launching?" required>
        <Input
          value={data.launchDescription || ''}
          onChange={(e) => updateData({ launchDescription: e.target.value })}
          placeholder="MVP of our project management tool"
        />
      </FormField>

      <FormField
        label="Key milestones"
        hint="NexFlow tracks progress on each against your deadline"
      >
        <Textarea
          value={data.milestones || ''}
          onChange={(e) => updateData({ milestones: e.target.value })}
          placeholder="One milestone per line&#10;Design complete&#10;Backend API ready&#10;Beta launch"
          rows={4}
        />
      </FormField>
    </>
  )
}

// Product team configuration
function ProductConfig({ data, updateData }: StepConfigureProps) {
  return (
    <>
      <FormField label="Sprint length">
        <Input
          value={data.sprintLength || ''}
          onChange={(e) => updateData({ sprintLength: e.target.value })}
          placeholder="2 weeks"
        />
      </FormField>

      <FormField label="Current sprint name" hint="Or leave blank — NexFlow detects it from Linear/Jira">
        <Input
          value={data.currentSprintName || ''}
          onChange={(e) => updateData({ currentSprintName: e.target.value })}
          placeholder="Sprint 23"
        />
      </FormField>

      <FormField label="Current team goal">
        <Textarea
          value={data.currentGoal || ''}
          onChange={(e) => updateData({ currentGoal: e.target.value })}
          placeholder="Ship the new onboarding flow and improve activation by 20%"
          rows={3}
        />
      </FormField>
    </>
  )
}

// Agency configuration
function AgencyConfig({ data, updateData }: StepConfigureProps) {
  return (
    <>
      <FormField label="Active projects" hint="NexFlow tracks each project separately">
        <Textarea
          value={data.activeProjects || ''}
          onChange={(e) => updateData({ activeProjects: e.target.value })}
          placeholder="One project per line&#10;Acme Website Redesign&#10;BigCorp Mobile App&#10;StartupX MVP"
          rows={4}
        />
      </FormField>

      <FormField label="Billing model" hint="Affects how NexFlow calculates project health">
        <Input
          value={data.billingModel || ''}
          onChange={(e) => updateData({ billingModel: e.target.value })}
          placeholder="Hourly / Fixed / Retainer"
        />
      </FormField>

      <FormField label="Target utilization %">
        <Input
          value={data.targetUtilization || ''}
          onChange={(e) => updateData({ targetUtilization: e.target.value })}
          placeholder="80"
        />
      </FormField>
    </>
  )
}

// Engineering team configuration
function EngineeringConfig({ data, updateData }: StepConfigureProps) {
  return (
    <>
      <FormField label="Target deploys per week">
        <Input
          value={data.targetDeploys || ''}
          onChange={(e) => updateData({ targetDeploys: e.target.value })}
          placeholder="10"
        />
      </FormField>

      <FormField label="Target PR review time">
        <Input
          value={data.targetReviewTime || ''}
          onChange={(e) => updateData({ targetReviewTime: e.target.value })}
          placeholder="< 4 hours"
        />
      </FormField>

      <FormField label="Current engineering focus">
        <Textarea
          value={data.engineeringFocus || ''}
          onChange={(e) => updateData({ engineeringFocus: e.target.value })}
          placeholder="Reduce P99 latency by 50%, improve test coverage to 85%"
          rows={3}
        />
      </FormField>
    </>
  )
}
