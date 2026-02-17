'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@nexflow/ui/utils'
import { Card, CardContent } from '@/components/nf/card'
import { Badge } from '@/components/nf/badge'
import { Button } from '@/components/nf/button'
import { BreathingDot } from '@/components/nf/breathing-dot'
import { trpc } from '@/lib/trpc'
import { toast } from '@nexflow/ui/toast'
import { Plug, RefreshCw, AlertCircle, CheckCircle2, GitBranch } from 'lucide-react'
import { RepoSelectionModal } from '@/components/integrations/repo-selection-modal'

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

const integrationIcons: Record<string, React.ReactNode> = {
  GITHUB: <GitHubIcon />,
  LINEAR: <LinearIcon />,
  SLACK: <SlackIcon />,
  DISCORD: <DiscordIcon />,
}

const integrationDescriptions: Record<string, { description: string; dataTypes: string[] }> = {
  GITHUB: {
    description: 'Sync repos, PRs, commits, and code reviews',
    dataTypes: ['Repositories', 'Pull Requests', 'Commits', 'Reviews'],
  },
  LINEAR: {
    description: 'Sync issues, sprints, and project tracking',
    dataTypes: ['Issues', 'Sprints', 'Projects', 'Labels'],
  },
  SLACK: {
    description: 'Monitor team communication and response times',
    dataTypes: ['Messages', 'Channels', 'Response Times'],
  },
  DISCORD: {
    description: 'Track team discussions and voice activity',
    dataTypes: ['Messages', 'Channels', 'Voice Activity'],
  },
  JIRA: {
    description: 'Sync issues, epics, and sprints from Jira',
    dataTypes: ['Issues', 'Epics', 'Sprints', 'Boards'],
  },
  NOTION: {
    description: 'Sync documentation and project pages',
    dataTypes: ['Pages', 'Databases', 'Documents'],
  },
}

const oauthUrls: Record<string, string> = {
  GITHUB: '/api/integrations/github/authorize',
  LINEAR: '/api/integrations/linear/authorize',
  SLACK: '/api/integrations/slack/authorize',
  DISCORD: '/api/integrations/discord/authorize',
}

function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface IntegrationCardProps {
  type: string
  name: string
  status: string
  lastSyncAt?: string | null
  syncError?: string | null
  onConnect: () => void
  onSync: () => void
  isSyncing: boolean
}

function IntegrationCard({
  type,
  name,
  status,
  lastSyncAt,
  syncError,
  onConnect,
  onSync,
  isSyncing,
}: IntegrationCardProps) {
  const isConnected = status === 'CONNECTED' || status === 'SYNCING'
  const hasError = status === 'ERROR'
  const info = integrationDescriptions[type] || { description: '', dataTypes: [] }

  return (
    <Card hover glow={hasError ? 'critical' : 'none'}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center',
            isConnected
              ? 'bg-status-success/10 text-status-success'
              : 'bg-background-tertiary text-foreground-tertiary'
          )}>
            {integrationIcons[type] || <Plug className="w-5 h-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-medium text-foreground">{name}</h3>
              {isConnected && (
                <Badge variant="success" size="sm">Connected</Badge>
              )}
              {hasError && (
                <Badge variant="critical" size="sm">Error</Badge>
              )}
            </div>
            <p className="text-sm text-foreground-secondary">{info.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {info.dataTypes.map(dataType => (
            <span
              key={dataType}
              className="px-2 py-1 bg-background-secondary rounded text-xs text-foreground-tertiary"
            >
              {dataType}
            </span>
          ))}
        </div>

        {isConnected || hasError ? (
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              {isSyncing || status === 'SYNCING' ? (
                <>
                  <BreathingDot variant="nf" size="sm" />
                  <span className="text-sm text-nf">Syncing...</span>
                </>
              ) : hasError ? (
                <>
                  <AlertCircle className="w-4 h-4 text-status-critical" />
                  <span className="text-sm text-status-critical truncate max-w-[200px]">
                    {syncError || 'Sync failed'}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-status-success" />
                  <span className="text-sm text-foreground-secondary">
                    {lastSyncAt ? timeAgo(lastSyncAt) : 'Connected'}
                  </span>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSync}
              disabled={isSyncing || status === 'SYNCING'}
            >
              <RefreshCw className={cn('w-4 h-4 mr-1', (isSyncing || status === 'SYNCING') && 'animate-spin')} />
              Sync
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            className="w-full"
            onClick={onConnect}
          >
            Connect {name}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-background-secondary flex items-center justify-center mb-4">
        <Plug className="w-8 h-8 text-foreground-tertiary" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">Connect your first integration</h3>
      <p className="text-sm text-foreground-secondary text-center max-w-md mb-6">
        NexFlow needs access to your tools to detect bottlenecks, predict risks, and provide actionable insights.
        Start by connecting GitHub or Linear.
      </p>
      <div className="flex gap-3">
        <Button variant="primary" onClick={() => window.location.href = oauthUrls.GITHUB}>
          <GitHubIcon />
          <span className="ml-2">Connect GitHub</span>
        </Button>
        <Button variant="secondary" onClick={() => window.location.href = oauthUrls.LINEAR}>
          <LinearIcon />
          <span className="ml-2">Connect Linear</span>
        </Button>
      </div>
    </div>
  )
}

function IntegrationStats({ connected, total }: { connected: number; total: number }) {
  const percentage = total > 0 ? Math.round((connected / total) * 100) : 0

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card padding="sm">
        <CardContent className="p-4">
          <div className="text-3xl font-mono font-medium text-foreground">{connected}/{total}</div>
          <div className="text-sm text-foreground-secondary">Connected</div>
        </CardContent>
      </Card>
      <Card padding="sm">
        <CardContent className="p-4">
          <div className="text-3xl font-mono font-medium text-foreground">-</div>
          <div className="text-sm text-foreground-secondary">Items Synced</div>
        </CardContent>
      </Card>
      <Card padding="sm" glow={connected === 0 ? 'warning' : connected < total ? 'warning' : 'success'}>
        <CardContent className="p-4">
          <div className={cn(
            'text-3xl font-mono font-medium',
            connected === 0 ? 'text-foreground-tertiary' : connected === total ? 'text-status-success' : 'text-status-warning'
          )}>
            {percentage}%
          </div>
          <div className="text-sm text-foreground-secondary">Coverage</div>
        </CardContent>
      </Card>
    </div>
  )
}

export function IntegrationsTab() {
  const utils = trpc.useUtils()
  const searchParams = useSearchParams()
  const [showRepoModal, setShowRepoModal] = useState(false)

  const { data, isLoading } = trpc.integrations.list.useQuery()
  const { data: githubRepos, isLoading: reposLoading, refetch: refetchRepos } = trpc.integrations.listGithubRepos.useQuery(
    undefined,
    { enabled: showRepoModal }
  )
  const { data: selectedRepos } = trpc.repositories.listSelected.useQuery()

  const syncMutation = trpc.integrations.triggerSync.useMutation({
    onSuccess: () => {
      utils.integrations.list.invalidate()
    },
  })

  // Check for showRepoSelection param (from GitHub OAuth callback)
  useEffect(() => {
    const shouldShowRepoSelection = searchParams.get('showRepoSelection') === 'true'
    const success = searchParams.get('success')

    if (shouldShowRepoSelection && success === 'github_connected') {
      // Delay modal to let the page render
      const timer = setTimeout(() => {
        setShowRepoModal(true)
        toast({
          title: 'GitHub connected!',
          description: 'Select which repositories NexFlow should track',
        })
        // Clean up URL params
        const url = new URL(window.location.href)
        url.searchParams.delete('showRepoSelection')
        url.searchParams.delete('success')
        window.history.replaceState({}, '', url.toString())
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  const handleConnect = (type: string) => {
    const url = oauthUrls[type]
    if (url) {
      window.location.href = url
    }
  }

  const handleSync = (type: string) => {
    syncMutation.mutate({ type })
  }

  const handleOpenRepoModal = () => {
    setShowRepoModal(true)
    refetchRepos()
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-background-secondary rounded w-48" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-background-secondary rounded" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 bg-background-secondary rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const connected = data?.connected || []
  const available = data?.available || []
  const allIntegrations = [
    ...connected.map(i => ({ ...i, isConnected: true })),
    ...available.map(i => ({ ...i, isConnected: false, lastSyncAt: null, syncError: null })),
  ]

  // Filter to show only supported integrations
  const supportedTypes = ['GITHUB', 'LINEAR', 'SLACK', 'DISCORD']
  const filteredIntegrations = allIntegrations.filter(i => supportedTypes.includes(i.type))

  const connectedCount = connected.filter(i => supportedTypes.includes(i.type)).length
  const totalCount = supportedTypes.length

  // Show empty state if no integrations connected
  if (connectedCount === 0) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Integrations</h2>
          <p className="text-sm text-foreground-secondary mt-1">
            Connect your tools to enable predictions and team tracking
          </p>
        </div>

        <EmptyState />

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

  // Check if GitHub is connected
  const isGitHubConnected = connected.some(i => i.type === 'GITHUB')
  const selectedRepoCount = selectedRepos?.length || 0

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Integrations</h2>
        <p className="text-sm text-foreground-secondary mt-1">
          Connect your tools to enable predictions and team tracking
        </p>
      </div>

      <IntegrationStats connected={connectedCount} total={totalCount} />

      {/* Selected Repositories Card - Show when GitHub is connected */}
      {isGitHubConnected && (
        <Card hover>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-status-success/10 flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-status-success" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-foreground">Tracked Repositories</h3>
                  <p className="text-sm text-foreground-secondary">
                    {selectedRepoCount > 0
                      ? `${selectedRepoCount} repositor${selectedRepoCount === 1 ? 'y' : 'ies'} being analyzed`
                      : 'No repositories selected yet'}
                  </p>
                </div>
              </div>
              <Button
                variant={selectedRepoCount > 0 ? 'secondary' : 'primary'}
                size="sm"
                onClick={handleOpenRepoModal}
              >
                <GitBranch className="w-4 h-4 mr-1.5" />
                {selectedRepoCount > 0 ? 'Manage Repos' : 'Select Repos'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredIntegrations.map(integration => (
          <IntegrationCard
            key={integration.type}
            type={integration.type}
            name={integration.name}
            status={integration.status}
            lastSyncAt={integration.lastSyncAt}
            syncError={integration.syncError}
            onConnect={() => handleConnect(integration.type)}
            onSync={() => handleSync(integration.type)}
            isSyncing={syncMutation.isLoading && syncMutation.variables?.type === integration.type}
          />
        ))}
      </div>

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

      {/* Repo Selection Modal */}
      <RepoSelectionModal
        isOpen={showRepoModal}
        onClose={() => setShowRepoModal(false)}
        availableRepos={(githubRepos || []).map(repo => ({
          id: repo.id,
          owner: repo.owner,
          name: repo.name,
          fullName: repo.fullName,
          description: repo.description,
          url: repo.url,
          language: repo.language,
          defaultBranch: repo.defaultBranch,
          isPrivate: repo.isPrivate,
          stars: repo.stars || 0,
          updatedAt: repo.updatedAt,
        }))}
        isLoading={reposLoading}
        onRefresh={() => refetchRepos()}
      />
    </div>
  )
}
