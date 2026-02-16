'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@nexflow/ui/utils'
import { Card } from '@/components/nf/card'
import { Badge } from '@/components/nf/badge'
import { Button } from '@/components/nf/button'
import { BreathingDot } from '@/components/nf/breathing-dot'
import { trpc } from '@/lib/trpc'
import { INTEGRATIONS } from '@/lib/theme'
import type { OnboardingData } from './onboarding-flow'
import { saveOnboardingData } from './step-signin'

interface StepIntegrationsProps {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
}

// OAuth URLs for each integration
const OAUTH_URLS: Record<string, string> = {
  github: '/api/integrations/github/authorize',
  linear: '/api/integrations/linear/authorize',
  slack: '/api/integrations/slack/authorize',
  discord: '/api/integrations/discord/authorize',
  // These don't have OAuth yet - show as "Coming Soon"
  jira: '',
  calendar: '',
  notion: '',
  gitlab: '',
  asana: '',
  figma: '',
}

export function StepIntegrations({ data, updateData }: StepIntegrationsProps) {
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [connectingId, setConnectingId] = useState<string | null>(null)

  const isAuthenticated = status === 'authenticated' && !!session?.user

  // Query real connected integrations from the database (only if authenticated)
  const { data: integrationsData, isLoading, refetch } = trpc.integrations.list.useQuery(undefined, {
    enabled: isAuthenticated,
  })

  // Check for OAuth success/error in URL params
  const successParam = searchParams.get('success')
  const errorParam = searchParams.get('error')

  // Refetch integrations when returning from OAuth
  useEffect(() => {
    if ((successParam || errorParam) && isAuthenticated) {
      refetch()
    }
  }, [successParam, errorParam, refetch, isAuthenticated])

  // Get list of connected integration types (lowercase)
  const connectedTypes = new Set(
    integrationsData?.connected?.map(i => i.type.toLowerCase()) || []
  )

  const handleConnect = (integrationId: string) => {
    const oauthUrl = OAUTH_URLS[integrationId]

    if (!oauthUrl) {
      // Integration doesn't have OAuth support yet
      return
    }

    // Save onboarding data before redirecting to OAuth
    saveOnboardingData(data)

    // Set connecting state
    setConnectingId(integrationId)

    // Redirect to OAuth
    window.location.href = oauthUrl
  }

  // Count connected integrations
  const connectedCount = connectedTypes.size

  // Filter to show integrations that have OAuth support first
  const sortedIntegrations = [...INTEGRATIONS].sort((a, b) => {
    const aHasOAuth = !!OAUTH_URLS[a.id]
    const bHasOAuth = !!OAUTH_URLS[b.id]
    if (aHasOAuth && !bHasOAuth) return -1
    if (!aHasOAuth && bHasOAuth) return 1
    return 0
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-semibold text-foreground tracking-tighter">
          Connect your tools
        </h1>
        <p className="text-sm text-foreground-secondary max-w-md mx-auto">
          {isAuthenticated ? (
            <>NexFlow starts scanning as soon as you connect. Connect at least one source to get the best experience.</>
          ) : (
            <>After signing in, you'll be able to connect these tools. NexFlow will scan your data and generate insights.</>
          )}
        </p>
      </div>

      {/* Not authenticated notice */}
      {!isAuthenticated && status !== 'loading' && (
        <div className="bg-status-info/10 border border-status-info/30 rounded-lg p-3 text-center animate-fade-in-up">
          <p className="text-sm text-status-info">
            Continue to sign in first, then you can connect your integrations. You can also connect them later from the dashboard.
          </p>
        </div>
      )}

      {/* Success/Error Messages */}
      {successParam && isAuthenticated && (
        <div className="bg-status-success/10 border border-status-success/30 rounded-lg p-3 text-center animate-fade-in-up">
          <p className="text-sm text-status-success">
            {successParam === 'github_connected' && 'GitHub connected successfully!'}
            {successParam === 'linear_connected' && 'Linear connected successfully!'}
            {successParam === 'slack_connected' && 'Slack connected successfully!'}
            {successParam === 'discord_connected' && 'Discord connected successfully!'}
          </p>
        </div>
      )}

      {errorParam && (
        <div className="bg-status-critical/10 border border-status-critical/30 rounded-lg p-3 text-center animate-fade-in-up">
          <p className="text-sm text-status-critical">
            Connection failed. Please try again after signing in.
          </p>
        </div>
      )}

      {/* Integration Grid */}
      <div className="grid grid-cols-2 gap-3">
        {sortedIntegrations.map((integration, index) => {
          const isConnected = connectedTypes.has(integration.id)
          const isConnecting = connectingId === integration.id
          const hasOAuth = !!OAUTH_URLS[integration.id]
          const canConnect = isAuthenticated && hasOAuth && !isConnected

          return (
            <Card
              key={integration.id}
              padding="sm"
              hover={canConnect}
              glow={isConnected ? 'success' : 'none'}
              className={cn(
                'animate-fade-in-up',
                isConnected && 'border-status-success/30',
                !hasOAuth && 'opacity-60'
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
                {hasOAuth ? (
                  isConnected ? (
                    <Badge variant="success" size="sm" className="flex-shrink-0">
                      ✓
                    </Badge>
                  ) : isAuthenticated ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleConnect(integration.id)}
                      loading={isConnecting}
                      className="flex-shrink-0"
                    >
                      Connect
                    </Button>
                  ) : (
                    <Badge variant="default" size="sm" className="flex-shrink-0 opacity-70">
                      Sign in first
                    </Badge>
                  )
                ) : (
                  <Badge variant="default" size="sm" className="flex-shrink-0 opacity-50">
                    Coming Soon
                  </Badge>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Summary */}
      {isAuthenticated && connectedCount > 0 && (
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

      {/* Skip note */}
      <p className="text-xs text-foreground-tertiary text-center">
        {isAuthenticated
          ? 'You can connect more integrations later from the dashboard settings.'
          : 'Skip this step for now — you can connect integrations from your dashboard after signing in.'}
      </p>
    </div>
  )
}
