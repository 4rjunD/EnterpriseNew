'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'
import { trpc } from '@/lib/trpc'
import { Users, UserPlus, Mail } from 'lucide-react'
import Link from 'next/link'

interface TeamMember {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  status: string
  teams: Array<{ id: string; name: string; role: string }>
  workload: {
    activeTasks: number
    openPRs: number
  }
}

function MemberCard({ member }: { member: TeamMember }) {
  const totalWork = member.workload.activeTasks + member.workload.openPRs
  const isOverloaded = totalWork > 10
  const hasWork = totalWork > 0

  return (
    <div
      className={cn(
        'bg-[#0a0a0a] border border-[#1a1a1a] rounded-md transition-colors hover:border-[#252525]',
        isOverloaded && 'border-l-2 border-l-[#f5a623]'
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="relative flex-shrink-0">
            {member.image ? (
              <img
                src={member.image}
                alt={member.name || ''}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[13px] font-medium text-[#ededed]">
                {(member.name || member.email).charAt(0).toUpperCase()}
              </div>
            )}
            <div className={cn(
              'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a0a0a]',
              member.status === 'ONLINE' && 'bg-[#50e3c2]',
              member.status === 'AWAY' && 'bg-[#f5a623]',
              member.status === 'OFFLINE' && 'bg-[#555]'
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-[#ededed] truncate">
                {member.name || member.email.split('@')[0]}
              </span>
              <span className={cn(
                'text-[10px] font-mono uppercase tracking-[0.5px]',
                member.role === 'ADMIN' && 'text-[#50e3c2]',
                member.role === 'MANAGER' && 'text-[#a78bfa]',
                member.role === 'IC' && 'text-[#555]'
              )}>
                {member.role}
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#555] truncate">{member.email}</p>
          </div>
        </div>

        {member.teams.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {member.teams.map(team => (
              <span
                key={team.id}
                className="px-2 py-0.5 bg-[#1a1a1a] rounded text-[10px] text-[#888]"
              >
                {team.name}
              </span>
            ))}
          </div>
        )}

        <div className="pt-3 border-t border-[#1a1a1a]">
          <div className="grid grid-cols-2 gap-px bg-[#1a1a1a] rounded overflow-hidden">
            <div className="bg-[#0a0a0a] p-2 text-center">
              <div className={cn(
                'text-[16px] font-mono font-semibold',
                member.workload.activeTasks > 5 ? 'text-[#f5a623]' : 'text-[#ededed]'
              )}>
                {member.workload.activeTasks}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555]">Tasks</div>
            </div>
            <div className="bg-[#0a0a0a] p-2 text-center">
              <div className="text-[16px] font-mono font-semibold text-[#ededed]">
                {member.workload.openPRs}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#555]">Open PRs</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TeamStats({ members }: { members: TeamMember[] }) {
  const totalTasks = members.reduce((acc, m) => acc + m.workload.activeTasks, 0)
  const totalPRs = members.reduce((acc, m) => acc + m.workload.openPRs, 0)
  const online = members.filter(m => m.status === 'ONLINE').length
  const overloaded = members.filter(m => m.workload.activeTasks + m.workload.openPRs > 10).length

  const stats = [
    { value: members.length.toString(), label: 'Team Members', color: '#ededed' },
    { value: totalTasks.toString(), label: 'Active Tasks', color: '#ededed' },
    { value: totalPRs.toString(), label: 'Open PRs', color: '#ededed' },
    { value: `${online}/${members.length}`, label: 'Online', color: '#50e3c2' },
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
        <Users className="w-8 h-8 text-[#555]" />
      </div>
      <h3 className="text-[16px] font-medium text-[#ededed] mb-2">No team members yet</h3>
      <p className="text-[13px] text-[#888] text-center max-w-md mb-6">
        Invite your team to start collaborating. Team members will appear here once they accept their invitations.
      </p>
      <Link
        href="/dashboard/invite"
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#ededed] text-[#000] rounded-md text-[13px] font-medium hover:bg-[#fff] transition-colors"
      >
        <UserPlus className="w-4 h-4" />
        Invite Team Members
      </Link>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-[#1a1a1a] rounded w-48" />
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 bg-[#1a1a1a] rounded" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-40 bg-[#1a1a1a] rounded" />
        ))}
      </div>
    </div>
  )
}

export function TeamTab() {
  const { data: members, isLoading } = trpc.team.listMembers.useQuery({})
  const [sortBy, setSortBy] = useState<'name' | 'tasks' | 'status'>('tasks')

  if (isLoading) {
    return <LoadingSkeleton />
  }

  const teamMembers = members || []

  // Show empty state if only one member (the current user)
  if (teamMembers.length <= 1) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Team</h2>
          <p className="text-[13px] text-[#888] mt-1">
            View team capacity and workload distribution
          </p>
        </div>
        <EmptyState />
      </div>
    )
  }

  // Sort team
  const sortedTeam = [...teamMembers].sort((a, b) => {
    if (sortBy === 'name') return (a.name || a.email).localeCompare(b.name || b.email)
    if (sortBy === 'tasks') return b.workload.activeTasks - a.workload.activeTasks
    // Sort by status: online first, then away, then offline
    const statusOrder = { ONLINE: 0, AWAY: 1, OFFLINE: 2 }
    return (statusOrder[a.status as keyof typeof statusOrder] || 2) - (statusOrder[b.status as keyof typeof statusOrder] || 2)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Team</h2>
          <p className="text-[13px] text-[#888] mt-1">
            View team capacity and workload distribution
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#555]">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md px-2 py-1 text-[13px] text-[#ededed] hover:border-[#252525] focus:border-[#252525] outline-none"
            >
              <option value="tasks">Workload</option>
              <option value="status">Status</option>
              <option value="name">Name</option>
            </select>
          </div>

          <Link
            href="/dashboard/invite"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#1a1a1a] rounded-md text-[12px] text-[#888] hover:text-[#ededed] hover:border-[#252525] transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite
          </Link>
        </div>
      </div>

      <TeamStats members={teamMembers} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sortedTeam.map(member => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>
    </div>
  )
}
