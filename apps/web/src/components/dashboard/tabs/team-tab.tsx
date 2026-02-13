'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'
import { ROLES, type UserRole } from '@/lib/theme'

// Team member type
interface TeamMember {
  id: string
  name: string
  role: UserRole
  avatar?: string
  email: string
  velocity: number      // 0-100
  load: number          // Current workload 0-100
  tasksCompleted: number
  prsReviewed: number
  avgReviewTime: number // hours
  status: 'online' | 'away' | 'offline'
  focus?: string        // What they're working on
  blockers: number
}

// Mock team data
const mockTeam: TeamMember[] = [
  {
    id: '1',
    name: 'Alex Chen',
    role: 'cofounder',
    email: 'alex@startup.io',
    velocity: 92,
    load: 85,
    tasksCompleted: 24,
    prsReviewed: 18,
    avgReviewTime: 4.2,
    status: 'online',
    focus: 'Auth system refactor',
    blockers: 0,
  },
  {
    id: '2',
    name: 'Maya Johnson',
    role: 'admin',
    email: 'maya@startup.io',
    velocity: 88,
    load: 65,
    tasksCompleted: 19,
    prsReviewed: 8,
    avgReviewTime: 2.1,
    status: 'online',
    focus: 'Payment integration',
    blockers: 1,
  },
  {
    id: '3',
    name: 'Jordan Lee',
    role: 'member',
    email: 'jordan@startup.io',
    velocity: 75,
    load: 110,
    tasksCompleted: 12,
    prsReviewed: 4,
    avgReviewTime: 6.5,
    status: 'away',
    focus: 'Onboarding flow',
    blockers: 2,
  },
  {
    id: '4',
    name: 'Sam Rivera',
    role: 'member',
    email: 'sam@startup.io',
    velocity: 95,
    load: 45,
    tasksCompleted: 28,
    prsReviewed: 12,
    avgReviewTime: 1.8,
    status: 'online',
    focus: 'API documentation',
    blockers: 0,
  },
]

// Member card component - clean, minimal
function MemberCard({ member }: { member: TeamMember }) {
  const isOverloaded = member.load > 100
  const hasBlockers = member.blockers > 0

  // Determine card accent
  const accentColor = isOverloaded ? '#f5a623' : hasBlockers ? '#ff4444' : undefined

  return (
    <div
      className={cn(
        'bg-[#0a0a0a] border border-[#1a1a1a] rounded-md transition-colors hover:border-[#252525]',
        accentColor && 'border-l-2'
      )}
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar with status */}
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[13px] font-medium text-[#ededed]">
              {member.name.charAt(0)}
            </div>
            <div className={cn(
              'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a0a0a]',
              member.status === 'online' && 'bg-[#50e3c2]',
              member.status === 'away' && 'bg-[#f5a623]',
              member.status === 'offline' && 'bg-[#555]'
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-[#ededed] truncate">{member.name}</span>
              {/* Role - minimal text label */}
              <span className={cn(
                'text-[10px] font-mono uppercase tracking-[0.5px]',
                member.role === 'cofounder' && 'text-[#a78bfa]',
                member.role === 'admin' && 'text-[#50e3c2]',
                member.role === 'member' && 'text-[#555]'
              )}>
                {member.role === 'cofounder' ? 'Co-founder' : member.role === 'admin' ? 'Admin' : 'Member'}
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#555] truncate">{member.email}</p>
          </div>

          {/* Blockers - small dot indicator */}
          {hasBlockers && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-[#ff4444]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff4444]" />
              <span>{member.blockers}</span>
            </div>
          )}
        </div>

        {/* Focus - subtle */}
        {member.focus && (
          <div className="mb-3 text-[12px]">
            <span className="text-[#555]">Working on: </span>
            <span className="text-[#888]">{member.focus}</span>
          </div>
        )}

        {/* Stats bars */}
        <div className="space-y-2">
          {/* Velocity */}
          <div>
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-[#555]">Velocity</span>
              <span className={cn(
                member.velocity >= 80 ? 'text-[#50e3c2]' :
                member.velocity >= 60 ? 'text-[#f5a623]' :
                'text-[#ff4444]'
              )}>{member.velocity}%</span>
            </div>
            <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  member.velocity >= 80 ? 'bg-[#50e3c2]' :
                  member.velocity >= 60 ? 'bg-[#f5a623]' :
                  'bg-[#ff4444]'
                )}
                style={{ width: `${member.velocity}%` }}
              />
            </div>
          </div>

          {/* Workload */}
          <div>
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-[#555]">Workload</span>
              <span className={cn(
                member.load <= 80 ? 'text-[#50e3c2]' :
                member.load <= 100 ? 'text-[#f5a623]' :
                'text-[#ff4444]'
              )}>{member.load}%</span>
            </div>
            <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  member.load <= 80 ? 'bg-[#50e3c2]' :
                  member.load <= 100 ? 'bg-[#f5a623]' :
                  'bg-[#ff4444]'
                )}
                style={{ width: `${Math.min(member.load, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick stats - grid with border dividers */}
        <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
          <div className="grid grid-cols-3 gap-px bg-[#1a1a1a] rounded overflow-hidden">
            <div className="bg-[#0a0a0a] p-2 text-center">
              <div className="text-[16px] font-mono font-semibold text-[#ededed]">{member.tasksCompleted}</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555]">Tasks</div>
            </div>
            <div className="bg-[#0a0a0a] p-2 text-center">
              <div className="text-[16px] font-mono font-semibold text-[#ededed]">{member.prsReviewed}</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555]">Reviews</div>
            </div>
            <div className="bg-[#0a0a0a] p-2 text-center">
              <div className={cn(
                'text-[16px] font-mono font-semibold',
                member.avgReviewTime <= 4 ? 'text-[#50e3c2]' :
                member.avgReviewTime <= 8 ? 'text-[#f5a623]' :
                'text-[#ff4444]'
              )}>{member.avgReviewTime}h</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555]">Avg Review</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Team stats - 4 column grid
function TeamStats({ team }: { team: TeamMember[] }) {
  const avgVelocity = Math.round(team.reduce((acc, m) => acc + m.velocity, 0) / team.length)
  const overloaded = team.filter(m => m.load > 100).length
  const totalBlockers = team.reduce((acc, m) => acc + m.blockers, 0)
  const online = team.filter(m => m.status === 'online').length

  const stats = [
    { value: `${avgVelocity}%`, label: 'Team Velocity', color: '#ededed' },
    { value: overloaded.toString(), label: 'Overloaded', color: overloaded > 0 ? '#f5a623' : '#ededed' },
    { value: totalBlockers.toString(), label: 'Total Blockers', color: totalBlockers > 0 ? '#ff4444' : '#ededed' },
    { value: `${online}/${team.length}`, label: 'Online Now', color: '#50e3c2' },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <div key={i} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
          <div className="text-[20px] font-mono font-semibold" style={{ color: stat.color }}>{stat.value}</div>
          <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555] mt-1">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

export function TeamTab() {
  const [team] = useState<TeamMember[]>(mockTeam)
  const [sortBy, setSortBy] = useState<'name' | 'velocity' | 'load'>('load')

  // Sort team
  const sortedTeam = [...team].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    if (sortBy === 'velocity') return b.velocity - a.velocity
    return b.load - a.load
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Team</h2>
          <p className="text-[13px] text-[#888] mt-1">
            Real-time team capacity and performance
          </p>
        </div>

        {/* Sort control - minimal select */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#555]">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md px-2 py-1 text-[13px] text-[#ededed] hover:border-[#252525] focus:border-[#252525] outline-none"
          >
            <option value="load">Workload</option>
            <option value="velocity">Velocity</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <TeamStats team={team} />

      {/* Team grid - 2 columns on larger screens for better readability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sortedTeam.map(member => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>

      {/* Load balancing suggestion - minimal */}
      {team.some(m => m.load > 100) && team.some(m => m.load < 60) && (
        <div className="p-4 border border-[#d4a574]/20 rounded-md">
          <div className="flex items-start gap-3">
            <span className="w-2 h-2 rounded-full bg-[#d4a574] mt-1.5 animate-pulse" />
            <div>
              <h4 className="text-[13px] font-medium text-[#d4a574] mb-1">Load Balancing Opportunity</h4>
              <p className="text-[12px] text-[#555] leading-[1.5]">
                NexFlow detected uneven workload distribution. Consider reassigning tasks from
                overloaded team members to those with capacity.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
