'use client'

import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { cn } from '@nexflow/ui/utils'
import { AgentChat } from './agent-chat'

export function AgentFab() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-40',
          'w-14 h-14 rounded-full',
          'bg-accent hover:bg-accent-hover text-white',
          'shadow-lg hover:shadow-xl',
          'flex items-center justify-center',
          'transition-all duration-300',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2',
          isOpen && 'rotate-45 scale-90 opacity-0 pointer-events-none'
        )}
        title="Open NexFlow AI"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {/* Pulse animation when not open */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-accent/30 animate-ping pointer-events-none" />
      )}

      {/* Chat Panel */}
      <AgentChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
