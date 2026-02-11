'use client'

import { useSession } from 'next-auth/react'
import { cn } from '@nexflow/ui/utils'
import type { CardType } from '@/app/(dashboard)/dashboard/page'

// Demo mode - show all tabs
const DEMO_MODE = false

interface SummaryCardRowProps {
  activeCard: CardType
  onCardSelect: (card: CardType) => void
}

const navItems: Array<{ id: CardType; label: string; managerOnly?: boolean }> = [
  { id: 'dashboard', label: 'Overview' },
  { id: 'bottlenecks', label: 'Bottlenecks', managerOnly: true },
  { id: 'team', label: 'Team' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'predictions', label: 'Predictions', managerOnly: true },
  { id: 'insights', label: 'Insights', managerOnly: true },
  { id: 'projects', label: 'Projects' },
  { id: 'integrations', label: 'Integrations', managerOnly: true },
]

export function SummaryCardRow({ activeCard, onCardSelect }: SummaryCardRowProps) {
  const { data: session } = useSession()
  const isManager = DEMO_MODE || session?.user?.role !== 'IC'

  const visibleItems = navItems.filter((item) => !item.managerOnly || isManager)

  return (
    <div className="border-b border-border">
      <nav className="-mb-px flex gap-6" aria-label="Tabs">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onCardSelect(item.id)}
            className={cn(
              'whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors',
              activeCard === item.id
                ? 'border-foreground text-foreground'
                : 'border-transparent text-foreground-muted hover:border-border hover:text-foreground'
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
