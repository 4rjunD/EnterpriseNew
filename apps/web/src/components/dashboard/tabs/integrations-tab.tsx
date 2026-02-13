'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/nf/card'
import { Badge } from '@/components/nf/badge'
import { Button } from '@/components/nf/button'
import { BreathingDot } from '@/components/nf/breathing-dot'

// Core integrations for internal team tracking
interface Integration {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  dataTypes: string[]
  connected: boolean
  lastSync?: Date
  itemsCount?: number
  status?: 'syncing' | 'synced' | 'error'
  oauthUrl?: string
}

// Integration icons
const GitHubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
)

const SlackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
  </svg>
)

const LinearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.018 13.179a.5.5 0 0 1-.708-.708l7.49-7.49a.5.5 0 0 1 .707.707l-7.49 7.49zm-.708 2.828a.5.5 0 0 0 .708.708l10.318-10.318a.5.5 0 0 0-.708-.708L2.31 16.007zm.708 3.536a.5.5 0 0 1-.708-.708L15.418 5.727a.5.5 0 0 1 .707.708L3.018 19.543zm2.828.708a.5.5 0 0 0 .708.708l12.728-12.728a.5.5 0 0 0-.708-.708L5.846 20.25zm3.536.708a.5.5 0 0 1-.708-.708l12.02-12.02a.5.5 0 0 1 .708.707l-12.02 12.02zm2.828.708a.5.5 0 0 0 .708.708l9.192-9.193a.5.5 0 0 0-.708-.707l-9.192 9.192zm2.829.707a.5.5 0 0 1-.708-.707l6.364-6.364a.5.5 0 0 1 .707.708l-6.363 6.363zm2.828.708a.5.5 0 0 0 .708.707l3.535-3.535a.5.5 0 0 0-.707-.708l-3.536 3.536z"/>
  </svg>
)

const DiscordIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
)

// Mock integration data
const mockIntegrations: Integration[] = [
  {
    id: 'github',
    name: 'GitHub',
    icon: <GitHubIcon />,
    description: 'Sync repos, PRs, commits, and code reviews',
    dataTypes: ['Repositories', 'Pull Requests', 'Commits', 'Reviews'],
    connected: true,
    lastSync: new Date(Date.now() - 15 * 60000),
    itemsCount: 1247,
    status: 'synced',
    oauthUrl: '/api/integrations/github/authorize',
  },
  {
    id: 'linear',
    name: 'Linear',
    icon: <LinearIcon />,
    description: 'Sync issues, sprints, and project tracking',
    dataTypes: ['Issues', 'Sprints', 'Projects', 'Labels'],
    connected: true,
    lastSync: new Date(Date.now() - 8 * 60000),
    itemsCount: 342,
    status: 'synced',
    oauthUrl: '/api/integrations/linear/authorize',
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: <SlackIcon />,
    description: 'Monitor team communication and response times',
    dataTypes: ['Messages', 'Channels', 'Response Times'],
    connected: false,
    oauthUrl: '/api/integrations/slack/authorize',
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: <DiscordIcon />,
    description: 'Track team discussions and voice activity',
    dataTypes: ['Messages', 'Channels', 'Voice Activity'],
    connected: false,
    oauthUrl: '/api/integrations/discord/authorize',
  },
]

// Format relative time
function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// Integration card
function IntegrationCard({
  integration,
  onConnect,
  onSync,
}: {
  integration: Integration
  onConnect: (id: string) => void
  onSync: (id: string) => void
}) {
  return (
    <Card hover glow={integration.connected && integration.status === 'error' ? 'critical' : 'none'}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center',
            integration.connected
              ? 'bg-status-success/10 text-status-success'
              : 'bg-background-tertiary text-foreground-tertiary'
          )}>
            {integration.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-medium text-foreground">{integration.name}</h3>
              {integration.connected && (
                <Badge variant="success" size="sm">Connected</Badge>
              )}
            </div>
            <p className="text-sm text-foreground-secondary">{integration.description}</p>
          </div>
        </div>

        {/* Data types */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {integration.dataTypes.map(type => (
            <span
              key={type}
              className="px-2 py-1 bg-background-secondary rounded text-xs text-foreground-tertiary"
            >
              {type}
            </span>
          ))}
        </div>

        {/* Status / Action */}
        {integration.connected ? (
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              {integration.status === 'syncing' ? (
                <>
                  <BreathingDot variant="nf" size="sm" />
                  <span className="text-sm text-nf">Syncing...</span>
                </>
              ) : integration.status === 'error' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-status-critical" />
                  <span className="text-sm text-status-critical">Sync failed</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-status-success" />
                  <span className="text-sm text-foreground-secondary">
                    {integration.itemsCount?.toLocaleString()} items
                  </span>
                  {integration.lastSync && (
                    <span className="text-sm text-foreground-tertiary">
                      · {timeAgo(integration.lastSync)}
                    </span>
                  )}
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSync(integration.id)}
              disabled={integration.status === 'syncing'}
            >
              Sync now
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            className="w-full"
            onClick={() => onConnect(integration.id)}
          >
            Connect {integration.name}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Stats
function IntegrationStats({ integrations }: { integrations: Integration[] }) {
  const connected = integrations.filter(i => i.connected).length
  const totalItems = integrations.reduce((acc, i) => acc + (i.itemsCount || 0), 0)

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card padding="sm">
        <CardContent className="p-4">
          <div className="text-3xl font-mono font-medium text-foreground">{connected}/{integrations.length}</div>
          <div className="text-sm text-foreground-secondary">Connected</div>
        </CardContent>
      </Card>
      <Card padding="sm">
        <CardContent className="p-4">
          <div className="text-3xl font-mono font-medium text-foreground">
            {totalItems.toLocaleString()}
          </div>
          <div className="text-sm text-foreground-secondary">Items Synced</div>
        </CardContent>
      </Card>
      <Card padding="sm" glow={connected < integrations.length ? 'warning' : 'success'}>
        <CardContent className="p-4">
          <div className={cn(
            'text-3xl font-mono font-medium',
            connected === integrations.length ? 'text-status-success' : 'text-status-warning'
          )}>
            {Math.round((connected / integrations.length) * 100)}%
          </div>
          <div className="text-sm text-foreground-secondary">Coverage</div>
        </CardContent>
      </Card>
    </div>
  )
}

export function IntegrationsTab() {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations)

  const handleConnect = (id: string) => {
    const integration = integrations.find(i => i.id === id)
    if (integration?.oauthUrl) {
      // In production, redirect to OAuth flow
      window.location.href = integration.oauthUrl
    }

    // Demo: simulate connection
    setIntegrations(prev => prev.map(i =>
      i.id === id
        ? { ...i, connected: true, status: 'syncing' as const, lastSync: new Date() }
        : i
    ))

    setTimeout(() => {
      setIntegrations(prev => prev.map(i =>
        i.id === id
          ? { ...i, status: 'synced' as const, itemsCount: Math.floor(Math.random() * 500) + 100 }
          : i
      ))
    }, 2000)
  }

  const handleSync = (id: string) => {
    setIntegrations(prev => prev.map(i =>
      i.id === id ? { ...i, status: 'syncing' as const } : i
    ))

    setTimeout(() => {
      setIntegrations(prev => prev.map(i =>
        i.id === id
          ? { ...i, status: 'synced' as const, lastSync: new Date() }
          : i
      ))
    }, 2000)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Integrations</h2>
        <p className="text-sm text-foreground-secondary mt-1">
          Connect your tools to enable predictions and team tracking
        </p>
      </div>

      {/* Stats */}
      <IntegrationStats integrations={integrations} />

      {/* Integrations grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map(integration => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onConnect={handleConnect}
            onSync={handleSync}
          />
        ))}
      </div>

      {/* Info */}
      <div className="p-4 bg-nf-muted border border-nf/20 rounded-lg">
        <div className="flex items-start gap-3">
          <BreathingDot variant="nf" size="md" />
          <div>
            <h4 className="text-sm font-medium text-nf mb-1">Better predictions with more data</h4>
            <p className="text-xs text-foreground-secondary leading-relaxed">
              NexFlow analyzes data from all connected integrations to detect bottlenecks,
              predict sprint risks, and generate actionable insights. Connect all your tools
              for the most accurate predictions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
