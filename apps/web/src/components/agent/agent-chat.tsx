'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Maximize2, Minimize2, History, Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@nexflow/ui/button'
import { cn } from '@nexflow/ui/utils'
import { trpc } from '@/lib/trpc'
import { toast } from '@nexflow/ui/toast'
import { AgentChatMessage } from './agent-chat-message'
import { AgentChatInput } from './agent-chat-input'
import { AgentTyping } from './agent-typing'

interface PendingAction {
  id: string
  skill: string
  description: string
  params: Record<string, unknown>
  requiresApproval: boolean
}

interface AgentChatProps {
  isOpen: boolean
  onClose: () => void
}

export function AgentChat({ isOpen, onClose }: AgentChatProps) {
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const utils = trpc.useUtils()

  // Get conversation if we have an ID
  const { data: conversation, isLoading: loadingConversation } = trpc.agentChat.getConversation.useQuery(
    { conversationId: conversationId!, messageLimit: 50 },
    { enabled: !!conversationId }
  )

  // Get conversation list for history
  const { data: conversationsData } = trpc.agentChat.getConversations.useQuery(
    { limit: 10 },
    { enabled: showHistory }
  )

  // Chat mutation
  const chatMutation = trpc.agentChat.chat.useMutation({
    onSuccess: (data) => {
      setConversationId(data.conversationId)
      utils.agentChat.getConversation.invalidate({ conversationId: data.conversationId })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Approve action mutation
  const approveMutation = trpc.agentChat.approveAction.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Action completed',
          description: data.message,
        })
      } else {
        toast({
          title: 'Action failed',
          description: data.error,
          variant: 'destructive',
        })
      }
      if (conversationId) {
        utils.agentChat.getConversation.invalidate({ conversationId })
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Reject action mutation
  const rejectMutation = trpc.agentChat.rejectAction.useMutation({
    onSuccess: () => {
      toast({
        title: 'Action rejected',
      })
      if (conversationId) {
        utils.agentChat.getConversation.invalidate({ conversationId })
      }
    },
  })

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages])

  const handleSend = (message: string) => {
    chatMutation.mutate({ message, conversationId })
  }

  const handleApprove = (action: PendingAction, messageId: string) => {
    if (!conversationId) return

    approveMutation.mutate({
      conversationId,
      messageId,
      actionId: action.id,
      skillName: action.skill,
      params: action.params,
    })
  }

  const handleReject = (action: PendingAction, messageId: string) => {
    if (!conversationId) return

    rejectMutation.mutate({
      conversationId,
      messageId,
      actionId: action.id,
    })
  }

  const handleSelectConversation = (id: string) => {
    setConversationId(id)
    setShowHistory(false)
  }

  const handleNewConversation = () => {
    setConversationId(undefined)
    setShowHistory(false)
  }

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex flex-col bg-card border border-border rounded-2xl shadow-2xl transition-all duration-300',
        isExpanded
          ? 'w-[600px] h-[80vh] max-h-[800px]'
          : 'w-[400px] h-[600px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">NexFlow AI</h3>
            <p className="text-xs text-foreground-muted">Your engineering assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setShowHistory(!showHistory)}
            title="Conversation history"
          >
            <History className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleNewConversation}
            title="New conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onClose}
            title="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* History sidebar */}
      {showHistory && (
        <div className="absolute top-14 left-0 right-0 bg-card border-b border-border shadow-lg z-10 max-h-60 overflow-y-auto">
          <div className="p-2">
            <p className="text-xs font-medium text-foreground-muted px-2 py-1">
              Recent Conversations
            </p>
            {conversationsData?.conversations?.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-background-secondary transition-colors',
                  conv.id === conversationId && 'bg-background-secondary'
                )}
              >
                <div className="font-medium text-foreground truncate">
                  {conv.title || 'New Conversation'}
                </div>
                {conv.lastMessage && (
                  <div className="text-xs text-foreground-muted truncate mt-0.5">
                    {conv.lastMessage}
                  </div>
                )}
              </button>
            ))}
            {(!conversationsData?.conversations || conversationsData.conversations.length === 0) && (
              <p className="text-sm text-foreground-muted px-3 py-2">
                No conversations yet
              </p>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4">
        {!conversation?.messages?.length && !chatMutation.isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-accent" />
            </div>
            <h4 className="font-semibold text-foreground mb-2">
              Hi! I'm NexFlow AI
            </h4>
            <p className="text-sm text-foreground-muted mb-6 max-w-xs">
              I can help you track progress, identify blockers, write standups, and take actions on your behalf.
            </p>
            <div className="grid gap-2 w-full max-w-xs">
              <SuggestionButton
                onClick={() => handleSend("What's our current project status?")}
                disabled={chatMutation.isLoading}
              >
                What's our status?
              </SuggestionButton>
              <SuggestionButton
                onClick={() => handleSend("Write me a standup for today")}
                disabled={chatMutation.isLoading}
              >
                Write a standup
              </SuggestionButton>
              <SuggestionButton
                onClick={() => handleSend("Are there any blockers I should know about?")}
                disabled={chatMutation.isLoading}
              >
                Check for blockers
              </SuggestionButton>
              <SuggestionButton
                onClick={() => handleSend("What actions do you recommend?")}
                disabled={chatMutation.isLoading}
              >
                Suggest actions
              </SuggestionButton>
            </div>
          </div>
        ) : (
          <>
            {conversation?.messages?.map((msg) => (
              <AgentChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                toolCalls={msg.toolCalls as any}
                pendingActions={msg.pendingActions as PendingAction[] | undefined}
                createdAt={msg.createdAt}
                messageId={msg.id}
                conversationId={conversationId!}
                onApprove={handleApprove}
                onReject={handleReject}
                isApproving={approveMutation.isLoading}
              />
            ))}
            {chatMutation.isLoading && <AgentTyping />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <AgentChatInput onSend={handleSend} isLoading={chatMutation.isLoading} />
    </div>
  )
}

function SuggestionButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-left px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-background-secondary hover:border-border-hover transition-all text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  )
}
