'use client'

import { useState, useCallback } from 'react'
import { cn } from '@nexflow/ui/utils'
import { Card } from '@/components/nf/card'
import { Badge } from '@/components/nf/badge'
import { Button } from '@/components/nf/button'
import { BreathingDot } from '@/components/nf/breathing-dot'
import { INTEGRATIONS } from '@/lib/theme'
import type { OnboardingData } from './onboarding-flow'

interface StepIntegrationsProps {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
}

export function StepIntegrations({ data, updateData }: StepIntegrationsProps) {
  const [connecting, setConnecting] = useState<string | null>(null)

  const handleConnect = useCallback(
    async (integrationId: string) => {
      // Simulate connection
      setConnecting(integrationId)
      await new Promise((resolve) => setTimeout(resolve, 900))

      const isConnected = data.connectedIntegrations.includes(integrationId)
      if (isConnected) {
        updateData({
          connectedIntegrations: data.connectedIntegrations.filter((id) => id !== integrationId),
        })
      } else {
        updateData({
          connectedIntegrations: [...data.connectedIntegrations, integrationId],
        })
      }
      setConnecting(null)
    },
    [data.connectedIntegrations, updateData]
  )

  const connectedCount = data.connectedIntegrations.length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-semibold text-foreground tracking-tighter">
          Connect your tools
        </h1>
        <p className="text-sm text-foreground-secondary max-w-md mx-auto">
          NexFlow starts scanning as soon as you connect. Connect at least one source to continue.
        </p>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-2 gap-3">
        {INTEGRATIONS.map((integration, index) => {
          const isConnected = data.connectedIntegrations.includes(integration.id)
          const isConnecting = connecting === integration.id

          return (
            <Card
              key={integration.id}
              padding="sm"
              hover
              glow={isConnected ? 'success' : 'none'}
              className={cn(
                'animate-fade-in-up',
                isConnected && 'border-status-success/30'
              )}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg text-foreground-secondary flex-shrink-0">
                    {integration.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {integration.name}
                      </span>
                      {isConnected && (
                        <Badge variant="success" size="sm">
                          Connected
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-foreground-tertiary truncate mt-0.5">
                      {integration.description}
                    </p>
                  </div>
                </div>
                <Button
                  variant={isConnected ? 'ghost' : 'secondary'}
                  size="sm"
                  onClick={() => handleConnect(integration.id)}
                  loading={isConnecting}
                  className="flex-shrink-0"
                >
                  {isConnected ? 'Remove' : 'Connect'}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Summary */}
      {connectedCount > 0 && (
        <div className="bg-nf-muted border border-nf/20 rounded-card p-4 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <BreathingDot variant="nf" size="sm" />
            <p className="text-sm text-foreground">
              <span className="font-medium text-nf">{connectedCount} source{connectedCount !== 1 ? 's' : ''}</span>{' '}
              connected. NexFlow will cross-reference{' '}
              {connectedCount > 1 ? 'all of these' : 'this'} to generate predictions and daily actions for your team.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
