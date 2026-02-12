'use client'

import { useState } from 'react'
import { Bot, User, ChevronDown, ChevronRight, Check, X, AlertCircle } from 'lucide-react'
import { cn } from '@nexflow/ui/utils'
import { Button } from '@nexflow/ui/button'

interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: unknown
}

interface PendingAction {
  id: string
  skill: string
  description: string
  params: Record<string, unknown>
  requiresApproval: boolean
}

interface AgentChatMessageProps {
  role: string
  content: string
  toolCalls?: ToolCall[]
  pendingActions?: PendingAction[]
  createdAt: Date
  messageId: string
  conversationId: string
  onApprove?: (action: PendingAction, messageId: string) => void
  onReject?: (action: PendingAction, messageId: string) => void
  isApproving?: boolean
}

export function AgentChatMessage({
  role,
  content,
  toolCalls,
  pendingActions,
  createdAt,
  messageId,
  conversationId,
  onApprove,
  onReject,
  isApproving,
}: AgentChatMessageProps) {
  const [showToolCalls, setShowToolCalls] = useState(false)
  const isUser = role === 'user'
  const isSystem = role === 'system'

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-foreground-muted bg-background-secondary px-3 py-1 rounded-full">
          {content}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-3 py-4', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-accent' : 'bg-background-secondary border border-border'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-black" />
        ) : (
          <Bot className="w-4 h-4 text-foreground" />
        )}
      </div>

      {/* Content */}
      <div className={cn('flex flex-col max-w-[80%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5',
            isUser
              ? 'bg-accent text-black rounded-br-md'
              : 'bg-background-secondary border border-border rounded-bl-md'
          )}
        >
          <div className="text-sm whitespace-pre-wrap">{content}</div>
        </div>

        {/* Tool calls (collapsible) */}
        {toolCalls && toolCalls.length > 0 && (
          <div className="mt-2 w-full">
            <button
              onClick={() => setShowToolCalls(!showToolCalls)}
              className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground transition-colors"
            >
              {showToolCalls ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              {toolCalls.length} tool call{toolCalls.length > 1 ? 's' : ''}
            </button>

            {showToolCalls && (
              <div className="mt-2 space-y-2">
                {toolCalls.map((tc) => (
                  <div
                    key={tc.id}
                    className="text-xs bg-background-tertiary border border-border rounded-lg p-2"
                  >
                    <div className="font-medium text-foreground">{tc.name}</div>
                    <pre className="mt-1 text-foreground-muted overflow-x-auto">
                      {JSON.stringify(tc.arguments, null, 2)}
                    </pre>
                    {tc.result && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <div className="text-foreground-muted">Result:</div>
                        <pre className="text-foreground overflow-x-auto">
                          {JSON.stringify(tc.result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending actions */}
        {pendingActions && pendingActions.length > 0 && (
          <div className="mt-3 space-y-2 w-full">
            {pendingActions.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                messageId={messageId}
                onApprove={onApprove}
                onReject={onReject}
                isApproving={isApproving}
              />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-foreground-muted mt-1">{formatTime(createdAt)}</span>
      </div>
    </div>
  )
}

interface ActionCardProps {
  action: PendingAction
  messageId: string
  onApprove?: (action: PendingAction, messageId: string) => void
  onReject?: (action: PendingAction, messageId: string) => void
  isApproving?: boolean
}

function ActionCard({ action, messageId, onApprove, onReject, isApproving }: ActionCardProps) {
  const getSkillIcon = (skill: string) => {
    switch (skill) {
      case 'send_nudge':
        return '📤'
      case 'reassign_task':
        return '🔄'
      case 'create_task':
        return '➕'
      case 'update_status':
        return '📝'
      case 'schedule_meeting':
        return '📅'
      default:
        return '⚡'
    }
  }

  const getSkillLabel = (skill: string) => {
    switch (skill) {
      case 'send_nudge':
        return 'Send Nudge'
      case 'reassign_task':
        return 'Reassign Task'
      case 'create_task':
        return 'Create Task'
      case 'update_status':
        return 'Update Status'
      case 'schedule_meeting':
        return 'Schedule Meeting'
      default:
        return skill
    }
  }

  return (
    <div className="bg-status-warning/10 border border-status-warning/30 rounded-lg p-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-status-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span>{getSkillIcon(action.skill)}</span>
            <span className="font-medium text-sm">{getSkillLabel(action.skill)}</span>
          </div>
          <p className="text-sm text-foreground-muted mt-1">{action.description}</p>

          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject?.(action, messageId)}
              disabled={isApproving}
            >
              <X className="w-3 h-3 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => onApprove?.(action, messageId)}
              disabled={isApproving}
              loading={isApproving}
            >
              <Check className="w-3 h-3 mr-1" />
              Approve
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
