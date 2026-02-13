'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { cn } from '@nexflow/ui/utils'
import { trpc } from '@/lib/trpc'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@nexflow/ui/dropdown-menu'
import { Settings, LogOut, User, Plus } from 'lucide-react'
import { BreathingDot } from '@/components/nf/breathing-dot'
import type { TeamType } from '@/lib/theme'

// Role colors
const ROLE_COLORS = {
  cofounder: { bg: 'bg-[#a78bfa]', text: 'text-white', label: 'Co-founder' },
  admin: { bg: 'bg-[#50e3c2]', text: 'text-black', label: 'Admin' },
  member: { bg: 'bg-[#0070f3]', text: 'text-white', label: 'Member' },
} as const

type UserRole = keyof typeof ROLE_COLORS

// Import team type configs from theme
import { TEAM_TYPES, getTabsForRole } from '@/lib/theme'


// Mock team members (will be replaced with real data)
const MOCK_TEAM = [
  { id: '1', name: 'You', role: 'cofounder' as UserRole },
  { id: '2', name: 'Sarah', role: 'admin' as UserRole },
  { id: '3', name: 'Mike', role: 'member' as UserRole },
]

// Logo component
function NexFlowLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
      <path d="M12 2L2 22h20L12 2z" />
    </svg>
  )
}

// Animated number component
function AnimatedMetric({ value, unit, color }: { value: number; unit: string; color: string }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const duration = 1000
    const steps = 30
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
    <span className={cn('font-mono font-medium tabular-nums', color)}>
      {displayValue}{unit}
    </span>
  )
}

// Days counter
function DaysCounter({ targetDate }: { targetDate?: Date }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!targetDate) {
    return (
      <span className="text-xs text-gray-500 font-mono">
        {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </span>
    )
  }

  const diff = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isUrgent = diff <= 7
  const isWarning = diff <= 14 && diff > 7

  return (
    <div className={cn(
      'px-2 py-1 rounded text-xs font-mono',
      isUrgent ? 'bg-red-500/20 text-red-400' :
      isWarning ? 'bg-amber-500/20 text-amber-400' :
      'bg-gray-800 text-gray-400'
    )}>
      {diff}d left
    </div>
  )
}

// Role switcher (segmented buttons)
function RoleSwitcher({
  members,
  currentUserId,
  viewAsRole,
  onRoleChange
}: {
  members: typeof MOCK_TEAM
  currentUserId: string
  viewAsRole: UserRole
  onRoleChange: (role: UserRole) => void
}) {
  return (
    <div className="flex items-center border border-[#333] rounded-md overflow-hidden">
      {members.map((member) => {
        const roleConfig = ROLE_COLORS[member.role]
        const isActive = member.role === viewAsRole
        return (
          <button
            key={member.id}
            onClick={() => onRoleChange(member.role)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 text-xs transition-colors',
              isActive ? 'bg-[#1a1a1a]' : 'bg-transparent hover:bg-[#111]'
            )}
          >
            <span className="text-white">{member.name}</span>
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-medium',
              roleConfig.bg, roleConfig.text
            )}>
              {member.role === 'cofounder' ? 'CF' : member.role === 'admin' ? 'A' : 'M'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// Tab badge
function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-medium rounded-full min-w-[18px] text-center">
      {count}
    </span>
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
  const [viewAsRole, setViewAsRole] = useState<UserRole>(user.role)
  const teamType = workspace?.teamType || 'launch'
  const tabs = getTabsForRole(teamType, viewAsRole)
  const teamConfig = TEAM_TYPES[teamType]

  // Mock metric value (would come from real data)
  const metricValue = teamType === 'engineering' ? 7 : 78

  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || user.email[0].toUpperCase()

  const roleConfig = ROLE_COLORS[user.role]

  return (
    <div className="bg-black border-b border-[#1a1a1a]">
      {/* Main header row */}
      <div className="h-[52px] flex items-center justify-between px-4">
        {/* Left section */}
        <div className="flex items-center gap-3">
          {/* Logo and name */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <NexFlowLogo />
            <span className="text-sm font-semibold text-white">NexFlow</span>
          </Link>

          <span className="text-gray-600">/</span>

          {/* Workspace name */}
          <span className="text-sm text-gray-300">
            {workspace?.name || 'Workspace'}
          </span>

          {/* Role switcher */}
          <RoleSwitcher
            members={MOCK_TEAM}
            currentUserId={user.id}
            viewAsRole={viewAsRole}
            onRoleChange={setViewAsRole}
          />
        </div>

        {/* Right section */}
        <div className="flex items-center gap-4">
          {/* NexFlow AI pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] rounded-full border border-[#333]">
            <BreathingDot variant="warning" size="sm" />
            <span className="text-xs text-amber-400">NexFlow AI active</span>
          </div>

          {/* Primary metric pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] rounded-full border border-[#333]">
            <AnimatedMetric
              value={metricValue}
              unit={teamConfig.primaryMetricUnit}
              color={
                teamType === 'engineering'
                  ? metricValue >= 5 ? 'text-green-400' : metricValue >= 3 ? 'text-amber-400' : 'text-red-400'
                  : metricValue >= 70 ? 'text-green-400' : metricValue >= 50 ? 'text-amber-400' : 'text-red-400'
              }
            />
            <span className="text-xs text-gray-500">{teamType === 'launch' ? 'launch' : teamType === 'product' ? 'sprint' : teamType === 'agency' ? 'util' : 'deploys'}</span>
          </div>

          {/* Days counter */}
          <DaysCounter targetDate={workspace?.targetDate} />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#1a1a1a] transition-colors">
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-white">
                  {user.image ? (
                    <img src={user.image} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <span className="text-sm text-white hidden md:inline">{user.name || user.email}</span>
                <span className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-medium',
                  roleConfig.bg, roleConfig.text
                )}>
                  {roleConfig.label}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#1a1a1a] border-[#333]">
              <DropdownMenuLabel className="text-gray-300">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#333]" />
              <DropdownMenuItem asChild className="text-gray-300 hover:bg-[#252525] hover:text-white cursor-pointer">
                <Link href="/dashboard/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-gray-300 hover:bg-[#252525] hover:text-white cursor-pointer">
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#333]" />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-red-400 hover:bg-[#252525] hover:text-red-300 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center justify-between px-4 border-t border-[#1a1a1a]">
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab.toLowerCase() === tab.toLowerCase()
            const badge = tabBadges[tab.toLowerCase()] || 0
            return (
              <button
                key={tab}
                onClick={() => onTabChange(tab.toLowerCase())}
                className={cn(
                  'relative px-3 py-2.5 text-sm transition-colors',
                  isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                )}
              >
                <span className="flex items-center">
                  {tab}
                  <TabBadge count={badge} />
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Invite button (cofounder/admin only) */}
        {(viewAsRole === 'cofounder' || viewAsRole === 'admin') && (
          <Link
            href="/dashboard/invite"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-[#333] rounded hover:border-[#555] transition-colors"
          >
            <Plus className="w-3 h-3" />
            Invite
          </Link>
        )}
      </div>
    </div>
  )
}
