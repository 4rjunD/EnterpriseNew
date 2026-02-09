'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Card } from '@nexflow/ui/card'
import { Badge } from '@nexflow/ui/badge'
import { Button } from '@nexflow/ui/button'
import { Switch } from '@nexflow/ui/switch'
import { Skeleton } from '@nexflow/ui/skeleton'
import {
  Plug,
  Bot,
  Github,
  RefreshCw,
  CheckCircle,
  XCircle,
  Settings,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@nexflow/ui/utils'

export function IntegrationsDetail() {
  const [activeTab, setActiveTab] = useState<'integrations' | 'agents'>('integrations')

  const { data: integrations, isLoading: integrationsLoading } =
    trpc.integrations.list.useQuery()
  const { data: agents, isLoading: agentsLoading } =
    trpc.agents.listConfigs.useQuery()

  const utils = trpc.useUtils()

  const initOAuthMutation = trpc.integrations.initOAuth.useMutation({
    onSuccess: (data) => {
      window.location.href = data.authUrl
    },
  })

  const syncMutation = trpc.integrations.triggerSync.useMutation({
    onSuccess: () => utils.integrations.invalidate(),
  })

  const disconnectMutation = trpc.integrations.disconnect.useMutation({
    onSuccess: () => utils.integrations.invalidate(),
  })

  const updateAgentMutation = trpc.agents.updateConfig.useMutation({
    onSuccess: () => utils.agents.invalidate(),
  })

  if (integrationsLoading || agentsLoading) {
    return <IntegrationsSkeleton />
  }

  const connectedCount = integrations?.connected?.length ?? 0
  const agentsList = Array.isArray(agents) ? agents : []

  return (
    <div className="space-y-6">
      {/* Vercel-style tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('integrations')}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap border-b-2 py-2 text-sm font-medium transition-colors',
              activeTab === 'integrations'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-foreground-muted hover:text-foreground'
            )}
          >
            <Plug className="h-4 w-4" />
            Integrations ({connectedCount}/6)
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap border-b-2 py-2 text-sm font-medium transition-colors',
              activeTab === 'agents'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-foreground-muted hover:text-foreground'
            )}
          >
            <Bot className="h-4 w-4" />
            Agents
          </button>
        </nav>
      </div>

      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* Connected */}
          {integrations?.connected && integrations.connected.length > 0 && (
            <div>
              <h3 className="mb-4 text-sm font-medium text-foreground-muted">
                Connected
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {integrations.connected.map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    onSync={() => syncMutation.mutate({ type: integration.type })}
                    onDisconnect={() =>
                      disconnectMutation.mutate({ type: integration.type })
                    }
                    syncing={syncMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Available */}
          {integrations?.available && integrations.available.length > 0 && (
            <div>
              <h3 className="mb-4 text-sm font-medium text-foreground-muted">
                Available
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {integrations.available.map((integration) => (
                  <AvailableIntegrationCard
                    key={integration.type}
                    integration={integration}
                    onConnect={() =>
                      initOAuthMutation.mutate({ type: integration.type })
                    }
                    connecting={initOAuthMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'agents' && (
        <div className="space-y-4">
          {agentsList.map((agent) => (
            <AgentCard
              key={agent.type}
              agent={agent}
              onToggle={(enabled) =>
                updateAgentMutation.mutate({ type: agent.type, enabled })
              }
              onToggleAutoApprove={(autoApprove) =>
                updateAgentMutation.mutate({ type: agent.type, autoApprove })
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

function IntegrationCard({
  integration,
  onSync,
  onDisconnect,
  syncing,
}: {
  integration: {
    id: string
    type: string
    status: string
    lastSyncAt?: Date | null
    syncError?: string | null
  }
  onSync: () => void
  onDisconnect: () => void
  syncing: boolean
}) {
  const statusIcon = {
    CONNECTED: <CheckCircle className="h-4 w-4 text-status-healthy" />,
    ERROR: <XCircle className="h-4 w-4 text-status-critical" />,
    SYNCING: <RefreshCw className="h-4 w-4 animate-spin text-accent" />,
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <IntegrationIcon type={integration.type} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{integration.type}</span>
              {statusIcon[integration.status as keyof typeof statusIcon]}
            </div>
            {integration.lastSyncAt && (
              <span className="text-xs text-foreground-muted">
                Synced{' '}
                {formatDistanceToNow(new Date(integration.lastSyncAt), {
                  addSuffix: true,
                })}
              </span>
            )}
            {integration.syncError && (
              <span className="text-xs text-status-critical">
                {integration.syncError}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={onSync} disabled={syncing}>
          <RefreshCw className={`mr-2 h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
          Sync
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDisconnect}
          className="text-status-critical"
        >
          Disconnect
        </Button>
      </div>
    </Card>
  )
}

function AvailableIntegrationCard({
  integration,
  onConnect,
  connecting,
}: {
  integration: {
    type: string
    name: string
    description: string
  }
  onConnect: () => void
  connecting: boolean
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <IntegrationIcon type={integration.type} />
        <div className="flex-1">
          <div className="font-medium">{integration.name}</div>
          <p className="text-sm text-foreground-muted">{integration.description}</p>
        </div>
      </div>
      <Button className="mt-4 w-full" onClick={onConnect} loading={connecting}>
        Connect
      </Button>
    </Card>
  )
}

function AgentCard({
  agent,
  onToggle,
  onToggleAutoApprove,
}: {
  agent: {
    type: string
    enabled: boolean
    autoApprove: boolean
    _count?: { actions: number }
  }
  onToggle: (enabled: boolean) => void
  onToggleAutoApprove: (autoApprove: boolean) => void
}) {
  const agentInfo = {
    TASK_REASSIGNER: {
      name: 'Task Reassigner',
      description: 'Automatically reassign tasks from overloaded team members',
    },
    NUDGE_SENDER: {
      name: 'Nudge Sender',
      description: 'Send reminders for stale PRs and blocked tasks',
    },
    SCOPE_ADJUSTER: {
      name: 'Scope Adjuster',
      description: 'Suggest sprint scope changes based on velocity',
    },
  }

  const info = agentInfo[agent.type as keyof typeof agentInfo] || {
    name: agent.type,
    description: '',
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-background-secondary p-2">
            <Bot className="h-5 w-5 text-foreground-muted" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{info.name}</span>
              {agent._count && agent._count.actions > 0 && (
                <Badge variant="warning">{agent._count.actions} pending</Badge>
              )}
            </div>
            <p className="text-sm text-foreground-muted">{info.description}</p>
          </div>
        </div>
        <Switch checked={agent.enabled} onCheckedChange={onToggle} />
      </div>
      {agent.enabled && (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-foreground-muted" />
            <span className="text-sm text-foreground-muted">Auto-approve actions</span>
          </div>
          <Switch
            checked={agent.autoApprove}
            onCheckedChange={onToggleAutoApprove}
          />
        </div>
      )}
    </Card>
  )
}

function IntegrationIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    GITHUB: <Github className="h-5 w-5" />,
    JIRA: <span className="text-lg font-bold">J</span>,
    LINEAR: <span className="text-lg font-bold">L</span>,
    NOTION: <span className="text-lg font-bold">N</span>,
    SLACK: <span className="text-lg font-bold">S</span>,
    DISCORD: <span className="text-lg font-bold">D</span>,
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background-secondary">
      {icons[type] || <Plug className="h-5 w-5" />}
    </div>
  )
}

function IntegrationsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-60" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  )
}
