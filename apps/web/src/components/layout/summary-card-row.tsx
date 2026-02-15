'use client'

import { useSession } from 'next-auth/react'
import { cn } from '@nexflow/ui/utils'
import type { CardType } from '@/app/(dashboard)/dashboard/page'

// Feature flag for new UI
const USE_NEW_UI = process.env.NEXT_PUBLIC_USE_NEW_UI === 'true'

interface SummaryCardRowProps {
  activeCard: CardType
  onCardSelect: (card: CardType) => void
}

// Simplified internal tool tabs
const internalNavItems: Array<{
  id: CardType
  label: string
  badge?: number
}> = [
  { id: 'today', label: 'Today' },
  { id: 'predictions', label: 'Predictions' },
  { id: 'team', label: 'Team' },
  { id: 'sprint', label: 'Sprint' },
  { id: 'risks', label: 'Risks' },
  { id: 'integrations', label: 'Integrations' },
]

// Legacy nav items (fallback)
const legacyNavItems: Array<{ id: CardType; label: string }> = [
  { id: 'dashboard', label: 'Overview' },
  { id: 'team', label: 'Team' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'predictions', label: 'Predictions' },
  { id: 'integrations', label: 'Integrations' },
]

export function SummaryCardRow({ activeCard, onCardSelect }: SummaryCardRowProps) {
  const navItems = USE_NEW_UI ? internalNavItems : legacyNavItems

  return (
    <div className="border-b border-border bg-background sticky top-0 z-10">
      <nav className="-mb-px flex gap-1 overflow-x-auto px-4" aria-label="Tabs">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onCardSelect(item.id)}
            className={cn(
              'relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors',
              activeCard === item.id
                ? 'text-foreground'
                : 'text-foreground-secondary hover:text-foreground'
            )}
          >
            <span className="flex items-center gap-2">
              {item.label}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="min-w-[18px] px-1.5 py-0.5 bg-status-critical text-white text-xs rounded-full">
                  {item.badge}
                </span>
              )}
            </span>
            {/* Active indicator */}
            {activeCard === item.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}
