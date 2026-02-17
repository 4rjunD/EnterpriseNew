'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { cn } from '@nexflow/ui/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@nexflow/ui/dropdown-menu'
import { Settings, LogOut, User, Plus, RefreshCw } from 'lucide-react'
import { toast } from '@nexflow/ui/toast'
import type { TeamType } from '@/lib/theme'
import { TEAM_TYPES, getTabsForRole } from '@/lib/theme'
import { trpc } from '@/lib/trpc'

// Role colors - minimal, just text colors
const ROLE_COLORS = {
  cofounder: { color: '#a78bfa', label: 'Co-founder' },
  admin: { color: '#50e3c2', label: 'Admin' },
  member: { color: '#555', label: 'Member' },
} as const

type UserRole = keyof typeof ROLE_COLORS

// Logo - simple triangle
function NexFlowLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
      <path d="M12 2L2 22h20L12 2z" />
    </svg>
  )
}

// Animated metric
function AnimatedMetric({ value, unit, color }: { value: number; unit: string; color: string }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const duration = 800
    const steps = 20
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.round(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])

  return (
    <span className="text-[13px] font-mono font-semibold tabular-nums" style={{ color }}>
      {displayValue}{unit}
    </span>
  )
}

// Days counter
function DaysCounter({ targetDate }: { targetDate?: Date }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000) // Update every minute
    return () => clearInterval(timer)
  }, [])

  if (!targetDate) {
    return (
      <span className="text-[11px] font-mono text-[#555]">
        {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </span>
    )
  }

  const diff = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isUrgent = diff <= 7
  const isWarning = diff <= 14 && diff > 7

  return (
    <span className={cn(
      'text-[11px] font-mono px-1.5 py-0.5 rounded',
      isUrgent ? 'text-[#ff4444]' :
      isWarning ? 'text-[#f5a623]' :
      'text-[#555]'
    )}>
      {diff}d left
    </span>
  )
}

// Team members display - shows real team from database
function TeamMembersBadge() {
  const { data: members, isLoading } = trpc.team.listMembers.useQuery({})

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 border border-[#1a1a1a] rounded">
        <div className="w-12 h-3 bg-[#1a1a1a] rounded animate-pulse" />
      </div>
    )
  }

  const memberCount = members?.length || 0

  // Don't show anything if just the current user
  if (memberCount <= 1) {
    return null
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border border-[#1a1a1a] rounded">
      <div className="flex -space-x-1.5">
        {members?.slice(0, 3).map((member) => (
          <div
            key={member.id}
            className="w-5 h-5 rounded-full bg-[#1a1a1a] border border-black flex items-center justify-center text-[8px] font-medium text-[#888]"
            title={member.name || member.email}
          >
            {(member.name || member.email).charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
      <span className="text-[10px] font-mono text-[#555]">
        {memberCount} member{memberCount !== 1 ? 's' : ''}
      </span>
    </div>
  )
}

// Tab badge - small red dot or number
function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[#ff4444]" />
  )
}

interface NexFlowHeaderProps {
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
    role: UserRole
  }
  workspace?: {
    name: string
    teamType: TeamType
    targetDate?: Date
  }
  activeTab: string
  onTabChange: (tab: string) => void
  tabBadges?: Record<string, number>
}

export function NexFlowHeader({
  user,
  workspace,
  activeTab,
  onTabChange,
  tabBadges = {},
}: NexFlowHeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const teamType = workspace?.teamType || 'launch'
  // Use the user's actual role for tab visibility
  const tabs = getTabsForRole(teamType, user.role)
  const teamConfig = TEAM_TYPES[teamType]

  // Get trpc utils for query invalidation
  const utils = trpc.useUtils()

  // Fetch real health score or show default for new users
  const { data: healthData, refetch: refetchHealth } = trpc.dashboard.getHealthScore.useQuery(undefined, {
    // Don't error if dashboard isn't ready yet
    retry: false,
  })
  const metricValue = healthData?.healthScore ?? 0

  // Refresh analysis mutation
  const refreshMutation = trpc.dashboard.refreshAnalysis.useMutation({
    onSuccess: (data) => {
      setIsRefreshing(false)
      if (data.success) {
        toast({
          title: 'Analysis refreshed',
          description: `Synced ${data.totalItemsSynced} items, created ${data.predictionsCreated} predictions, ${data.bottlenecksCreated} bottlenecks`,
        })
        // Invalidate all dashboard-related queries to refresh the UI
        utils.dashboard.invalidate()
        utils.tasks.getUnifiedTodos.invalidate()
        utils.predictions.invalidate()
        utils.bottlenecks.invalidate()
        utils.team.invalidate()
      } else {
        toast({
          title: 'Refresh completed with errors',
          description: data.errors.join(', '),
          variant: 'destructive',
        })
      }
    },
    onError: (error) => {
      setIsRefreshing(false)
      toast({
        title: 'Refresh failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleRefresh = () => {
    setIsRefreshing(true)
    refreshMutation.mutate()
  }

  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || user.email[0].toUpperCase()

  const roleConfig = ROLE_COLORS[user.role]

  return (
    <div className="bg-black border-b border-[#1a1a1a]">
      {/* Main header - 52px */}
      <div className="h-[52px] flex items-center justify-between px-6">
        {/* Left */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <NexFlowLogo />
            <span className="text-[13px] font-semibold text-white">NexFlow</span>
          </Link>

          <span className="text-[#333]">/</span>

          <span className="text-[13px] text-[#888]">
            {workspace?.name || 'Workspace'}
          </span>

          <TeamMembersBadge />
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 border rounded transition-all',
              isRefreshing
                ? 'border-[#50e3c2]/30 text-[#50e3c2] cursor-wait'
                : 'border-[#1a1a1a] text-[#555] hover:text-[#888] hover:border-[#252525]'
            )}
            title="Refresh all data and regenerate AI insights"
          >
            <RefreshCw className={cn('w-3 h-3', isRefreshing && 'animate-spin')} />
            <span className="text-[11px] font-mono hidden sm:inline">
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </span>
          </button>

          {/* NexFlow AI pill - minimal */}
          <div className="flex items-center gap-1.5 px-2 py-1 border border-[#d4a574]/30 rounded">
            <span className={cn('w-1.5 h-1.5 rounded-full bg-[#d4a574]', !isRefreshing && 'animate-pulse')} />
            <span className="text-[11px] font-mono text-[#d4a574]">AI</span>
          </div>

          {/* Health Score pill - only show if we have data */}
          {metricValue > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 border border-[#1a1a1a] rounded">
              <AnimatedMetric
                value={metricValue}
                unit="%"
                color={
                  metricValue >= 70 ? '#50e3c2' : metricValue >= 50 ? '#f5a623' : '#ff4444'
                }
              />
              <span className="text-[10px] font-mono text-[#555] uppercase">
                health
              </span>
            </div>
          )}

          <DaysCounter targetDate={workspace?.targetDate} />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#1a1a1a] transition-colors">
                <div className="w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[10px] font-medium text-white">
                  {user.image ? (
                    <img src={user.image} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <span className="text-[12px] text-[#ededed] hidden md:inline">{user.name || user.email}</span>
                <span
                  className="text-[9px] font-mono font-medium uppercase"
                  style={{ color: roleConfig.color }}
                >
                  {roleConfig.label}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-[#0a0a0a] border-[#1a1a1a]">
              <DropdownMenuLabel className="text-[#888]">
                <div className="flex flex-col">
                  <p className="text-[12px] font-medium text-[#ededed]">{user.name}</p>
                  <p className="text-[10px] text-[#555]">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#1a1a1a]" />
              <DropdownMenuItem asChild className="text-[12px] text-[#888] hover:bg-[#1a1a1a] hover:text-[#ededed] cursor-pointer">
                <Link href="/dashboard/profile">
                  <User className="mr-2 h-3.5 w-3.5" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-[12px] text-[#888] hover:bg-[#1a1a1a] hover:text-[#ededed] cursor-pointer">
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-3.5 w-3.5" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#1a1a1a]" />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-[12px] text-[#ff4444] hover:bg-[#1a1a1a] cursor-pointer"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tab bar - 40px */}
      <div className="h-[40px] flex items-center justify-between px-6 border-t border-[#1a1a1a]">
        <nav className="flex items-center">
          {tabs.map((tab) => {
            const isActive = activeTab.toLowerCase() === tab.toLowerCase()
            const badge = tabBadges[tab.toLowerCase()] || 0
            return (
              <button
                key={tab}
                onClick={() => onTabChange(tab.toLowerCase())}
                className={cn(
                  'relative px-3 py-2 text-[13px] transition-colors',
                  isActive ? 'text-[#ededed]' : 'text-[#555] hover:text-[#888]'
                )}
              >
                <span className="flex items-center">
                  {tab}
                  <TabBadge count={badge} />
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-3 right-3 h-px bg-[#ededed]" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Invite button - only show for admins/cofounders */}
        {(user.role === 'cofounder' || user.role === 'admin') && (
          <Link
            href="/dashboard/invite"
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-[#555] hover:text-[#888] border border-[#1a1a1a] rounded hover:border-[#252525] transition-colors"
          >
            <Plus className="w-3 h-3" />
            Invite
          </Link>
        )}
      </div>
    </div>
  )
}
