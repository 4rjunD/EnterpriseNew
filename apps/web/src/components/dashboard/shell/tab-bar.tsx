'use client'

import { cn } from '@nexflow/ui/utils'
import { Badge } from '@/components/nf/badge'
import { TEAM_TYPES, ROLES, type TeamType, type UserRole } from '@/lib/theme'

export interface TabBarProps {
  teamType: TeamType
  userRole: UserRole
  activeTab: string
  onTabChange: (tab: string) => void
  tabCounts?: Record<string, number>
  className?: string
}

// Tab definitions with visibility rules
const TAB_DEFINITIONS: Record<string, {
  label: string
  countColor?: 'critical' | 'warning' | 'nf'
  visibleTo: UserRole[]
}> = {
  Today: { label: 'Today', countColor: 'critical', visibleTo: ['cofounder', 'admin', 'member'] },
  Predictions: { label: 'Predictions', countColor: 'critical', visibleTo: ['cofounder', 'admin', 'member'] },
  Team: { label: 'Team', visibleTo: ['cofounder', 'admin'] },
  Milestones: { label: 'Milestones', visibleTo: ['cofounder', 'admin', 'member'] },
  Sprint: { label: 'Sprint', visibleTo: ['cofounder', 'admin'] },
  Projects: { label: 'Projects', visibleTo: ['cofounder', 'admin'] },
  Clients: { label: 'Clients', visibleTo: ['cofounder', 'admin'] },
  Velocity: { label: 'Velocity', visibleTo: ['cofounder', 'admin'] },
  Quality: { label: 'Quality', visibleTo: ['cofounder', 'admin'] },
  Insights: { label: 'Insights', visibleTo: ['cofounder'] }, // Co-founder exclusive
  Integrations: { label: 'Integrations', countColor: 'nf', visibleTo: ['cofounder', 'admin'] },
  Risks: { label: 'Risks', visibleTo: ['cofounder', 'admin', 'member'] },
  Schedule: { label: 'Schedule', visibleTo: ['member'] }, // Member only
}

export function TabBar({
  teamType,
  userRole,
  activeTab,
  onTabChange,
  tabCounts = {},
  className,
}: TabBarProps) {
  const config = TEAM_TYPES[teamType]

  // Filter tabs based on team type and user role
  const visibleTabs = config.tabs.filter((tab) => {
    const tabDef = TAB_DEFINITIONS[tab]
    if (!tabDef) return false
    return tabDef.visibleTo.includes(userRole)
  })

  // Add Schedule tab for members
  if (userRole === 'member' && !visibleTabs.includes('Schedule')) {
    visibleTabs.push('Schedule')
  }

  return (
    <nav
      className={cn(
        'flex items-center gap-1 px-4 border-b border-border bg-background overflow-x-auto',
        className
      )}
    >
      {visibleTabs.map((tab) => {
        const tabDef = TAB_DEFINITIONS[tab]
        const isActive = activeTab === tab
        const count = tabCounts[tab]

        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={cn(
              'relative px-3 py-3 text-sm whitespace-nowrap transition-colors',
              isActive
                ? 'text-foreground font-medium'
                : 'text-foreground-secondary hover:text-foreground'
            )}
          >
            <span className="flex items-center gap-2">
              {tabDef?.label || tab}
              {count !== undefined && count > 0 && (
                <Badge
                  variant={tabDef?.countColor || 'default'}
                  size="sm"
                  className="min-w-[18px] justify-center"
                >
                  {count}
                </Badge>
              )}
            </span>

            {/* Active indicator */}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
