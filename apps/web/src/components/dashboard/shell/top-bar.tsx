'use client'

import { cn } from '@nexflow/ui/utils'
import { Badge, RoleBadge } from '@/components/nf/badge'
import { NexFlowStatus } from '@/components/nf/breathing-dot'
import { AnimPercent } from '@/components/nf/anim-num'
import { Button } from '@/components/nf/button'
import { TEAM_TYPES, ROLES, type TeamType, type UserRole } from '@/lib/theme'

export interface TopBarProps {
  workspaceName: string
  teamType: TeamType
  primaryMetricValue: number
  daysRemaining?: number
  sprintDay?: { current: number; total: number }
  currentUser: {
    name: string
    role: UserRole
    avatar?: string
  }
  members?: Array<{
    id: string
    name: string
    role: UserRole
  }>
  selectedUserId?: string
  onUserChange?: (userId: string) => void
  onInvite?: () => void
  className?: string
}

export function TopBar({
  workspaceName,
  teamType,
  primaryMetricValue,
  daysRemaining,
  sprintDay,
  currentUser,
  members,
  selectedUserId,
  onUserChange,
  onInvite,
  className,
}: TopBarProps) {
  const config = TEAM_TYPES[teamType]
  const roleConfig = ROLES[currentUser.role]

  // Determine metric color based on value
  const metricColor =
    primaryMetricValue >= 80
      ? 'success'
      : primaryMetricValue >= 60
      ? 'warning'
      : 'critical'

  const metricBgClass = {
    success: 'bg-status-success-muted text-status-success',
    warning: 'bg-status-warning-muted text-status-warning',
    critical: 'bg-status-critical-muted text-status-critical',
  }[metricColor]

  // Get metric suffix based on team type
  const metricSuffix = {
    launch: 'launch',
    product: 'sprint',
    agency: 'utilization',
    engineering: '/wk',
  }[teamType]

  return (
    <header
      className={cn(
        'h-13 px-4 flex items-center justify-between border-b border-border bg-background',
        className
      )}
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-foreground"
          >
            <path
              d="M12 2L2 19h20L12 2z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-sm font-semibold text-foreground">NexFlow</span>
        </div>

        {/* Separator */}
        <span className="text-foreground-tertiary">/</span>

        {/* Workspace name */}
        <span className="text-sm text-foreground-secondary">{workspaceName}</span>

        {/* Role switcher (for co-founders to preview other roles) */}
        {currentUser.role === 'cofounder' && members && members.length > 1 && (
          <div className="hidden md:flex items-center gap-1 ml-4 p-1 bg-background-secondary rounded-button border border-border">
            {members.slice(0, 4).map((member) => (
              <button
                key={member.id}
                onClick={() => onUserChange?.(member.id)}
                className={cn(
                  'px-2 py-1 text-xs rounded-button transition-colors',
                  selectedUserId === member.id
                    ? 'bg-accent text-black'
                    : 'text-foreground-secondary hover:text-foreground'
                )}
              >
                {member.name.split(' ')[0]}
                <span className="ml-1 opacity-60">({ROLES[member.role].name})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* NexFlow AI Status */}
        <NexFlowStatus className="hidden sm:flex" />

        {/* Primary Metric */}
        <div className={cn('px-2.5 py-1 rounded-button text-xs font-mono', metricBgClass)}>
          <AnimPercent value={primaryMetricValue} showSymbol={false} />
          <span className="ml-0.5">% {metricSuffix}</span>
        </div>

        {/* Days/Sprint counter */}
        {daysRemaining !== undefined && (
          <span className="text-xs font-mono text-foreground-secondary hidden md:block">
            {daysRemaining} days
          </span>
        )}
        {sprintDay && (
          <span className="text-xs font-mono text-foreground-secondary hidden md:block">
            Day {sprintDay.current} of {sprintDay.total}
          </span>
        )}

        {/* Invite button (for co-founder/admin) */}
        {(currentUser.role === 'cofounder' || currentUser.role === 'admin') && onInvite && (
          <Button variant="primary" size="sm" onClick={onInvite}>
            + Invite
          </Button>
        )}

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
              roleConfig.bgClass,
              roleConfig.colorClass
            )}
          >
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block">
            <p className="text-sm text-foreground leading-tight">{currentUser.name}</p>
            <RoleBadge role={currentUser.role} />
          </div>
        </div>
      </div>
    </header>
  )
}
