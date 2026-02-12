'use client'

import { trpc } from '@/lib/trpc'
import { cn } from '@nexflow/ui/utils'
import { RefreshCw, Check, AlertCircle, Clock, Github, Trello } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const integrationIcons: Record<string, React.ReactNode> = {
  GITHUB: <Github className="w-4 h-4" />,
  LINEAR: (
    <svg className="w-4 h-4" viewBox="0 0 100 100" fill="currentColor">
      <path d="M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 97.1782c.6889.6889.0915 1.8189-.857 1.5765C21.0533 94.8035 5.30537 79.046 1.22541 61.5228ZM.00189135 46.8891c-.01764375.2833.08887825.5599.28957165.7606l52.060279 52.0603c.2007.2007.4773.3073.7606.2896 2.3692-.1476 4.6938-.46 6.9624-.9259.7645-.157 1.0301-1.0963.4782-1.6481L2.57708 39.4485c-.55185-.5519-1.49117-.2863-1.64812.4782-.46595 2.2686-.77828 4.5932-.92706 6.9624ZM4.21820958 29.8075c-.15255747.207-.1628024.4922-.01977537.7088L55.4837 81.801c.2165.2165.5018.2062.7088.0198 1.4231-1.2781 2.7779-2.6329 4.0559-4.0559.1864-.2071.1967-.4923-.0198-.7088L8.29373 25.1216c-.21654-.2165-.50175-.2062-.70883-.0198-1.42316 1.278-2.77795 2.6328-4.05571 4.0559-.14262.1863-.1331.5018.01977.7088l-.02056-.01ZM12.6587 14.5765c-.2165-.2165-.5018-.2063-.7088-.0198-1.4232 1.278-2.778 2.6328-4.0559 4.0559-.1864.2071-.19675.4923.01977.7088L59.198 70.6052c.2165.2165.5017.2063.7088.0198 1.4231-1.278 2.7779-2.6328 4.0559-4.0559.1864-.2071.1967-.4923-.0198-.7088L12.6587 14.5765Z" />
    </svg>
  ),
  JIRA: <Trello className="w-4 h-4" />,
  SLACK: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  ),
}

export function SyncStatusBar() {
  const { data: syncStatus, isLoading } = trpc.sync.getStatus.useQuery(undefined, {
    refetchInterval: 10000, // Poll every 10 seconds
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-background-secondary border border-border rounded-lg animate-pulse">
        <RefreshCw className="w-4 h-4 text-foreground-muted" />
        <span className="text-sm text-foreground-muted">Loading sync status...</span>
      </div>
    )
  }

  if (!syncStatus || syncStatus.integrations.length === 0) {
    return null
  }

  const inProgress = syncStatus.inProgress
  const connectedIntegrations = syncStatus.integrations.filter((i) => i.status === 'CONNECTED')
  const hasErrors = syncStatus.integrations.some((i) => i.syncError)

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 rounded-lg border transition-colors',
        inProgress
          ? 'bg-blue-500/10 border-blue-500/20'
          : hasErrors
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-background-secondary border-border'
      )}
    >
      <div className="flex items-center gap-4">
        {/* Sync status indicator */}
        <div className="flex items-center gap-2">
          {inProgress ? (
            <>
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-sm text-blue-400">Syncing...</span>
            </>
          ) : hasErrors ? (
            <>
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">Sync error</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-sm text-foreground-muted">Synced</span>
            </>
          )}
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-border" />

        {/* Integration status chips */}
        <div className="flex items-center gap-2">
          {connectedIntegrations.map((integration) => (
            <IntegrationChip key={integration.id} integration={integration} />
          ))}
        </div>
      </div>

      {/* Last sync time */}
      {!inProgress && syncStatus.recentLogs[0] && (
        <div className="flex items-center gap-1 text-xs text-foreground-muted">
          <Clock className="w-3 h-3" />
          <span>
            {formatDistanceToNow(new Date(syncStatus.recentLogs[0].completedAt || syncStatus.recentLogs[0].startedAt), {
              addSuffix: true,
            })}
          </span>
        </div>
      )}
    </div>
  )
}

function IntegrationChip({
  integration,
}: {
  integration: {
    id: string
    type: string
    status: string
    lastSyncAt: Date | null
    syncError: string | null
    lastSync: {
      itemsSynced: number
      status: string
    } | null
  }
}) {
  const hasError = integration.syncError
  const icon = integrationIcons[integration.type] || <div className="w-4 h-4 rounded bg-foreground-muted" />

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
        hasError ? 'bg-red-500/10 text-red-400' : 'bg-background text-foreground-muted'
      )}
      title={
        hasError
          ? `Error: ${integration.syncError}`
          : integration.lastSync
            ? `${integration.lastSync.itemsSynced} items synced`
            : 'No recent sync'
      }
    >
      {icon}
      <span className="capitalize">{integration.type.toLowerCase()}</span>
      {hasError && <AlertCircle className="w-3 h-3" />}
    </div>
  )
}
