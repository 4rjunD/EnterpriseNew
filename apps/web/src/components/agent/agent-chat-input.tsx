'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@nexflow/ui/button'
import { cn } from '@nexflow/ui/utils'

interface AgentChatInputProps {
  onSend: (message: string) => void
  isLoading?: boolean
  placeholder?: string
}

export function AgentChatInput({
  onSend,
  isLoading,
  placeholder = 'Ask NexFlow AI anything...',
}: AgentChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
    }
  }, [message])

  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      onSend(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-border bg-card p-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className={cn(
              'w-full resize-none rounded-xl border border-border bg-background px-4 py-3 pr-12',
              'text-sm text-foreground placeholder:text-foreground-muted',
              'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all'
            )}
          />
          <div className="absolute right-2 bottom-2">
            <Button
              size="icon"
              variant={message.trim() ? 'default' : 'ghost'}
              className="h-8 w-8"
              onClick={handleSubmit}
              disabled={!message.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-xs text-foreground-muted">
          Press Enter to send, Shift+Enter for new line
        </span>
        <span className="text-xs text-foreground-muted">Powered by Claude</span>
      </div>
    </div>
  )
}
