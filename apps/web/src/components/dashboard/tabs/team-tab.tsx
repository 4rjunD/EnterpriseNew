'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/nf/card'
import { Badge, RoleBadge } from '@/components/nf/badge'
import { BreathingDot } from '@/components/nf/breathing-dot'
import { AnimPercent, StatCounter } from '@/components/nf/anim-num'
import { Progress } from '@/components/nf/progress'
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

// Member card component
function MemberCard({ member }: { member: TeamMember }) {
  const roleConfig = ROLES[member.role]
  const isOverloaded = member.load > 100

  return (
    <Card
      hover
      glow={isOverloaded ? 'warning' : member.blockers > 0 ? 'critical' : 'none'}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          {/* Avatar */}
          <div className="relative">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium',
              roleConfig.bgClass, roleConfig.colorClass
            )}>
              {member.name.charAt(0)}
            </div>
            {/* Status indicator */}
            <div className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background-card',
              member.status === 'online' && 'bg-status-success',
              member.status === 'away' && 'bg-status-warning',
              member.status === 'offline' && 'bg-foreground-tertiary'
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">{member.name}</span>
              <RoleBadge role={member.role} />
            </div>
            <p className="text-xs text-foreground-secondary truncate">{member.email}</p>
          </div>

          {/* Blockers indicator */}
          {member.blockers > 0 && (
            <Badge variant="critical" size="sm">
              {member.blockers} blocker{member.blockers > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Focus */}
        {member.focus && (
          <div className="mb-4 px-3 py-2 bg-background-secondary rounded-md">
            <span className="text-xs text-foreground-tertiary">Currently working on:</span>
            <p className="text-sm text-foreground">{member.focus}</p>
          </div>
        )}

        {/* Stats */}
        <div className="space-y-3">
          {/* Velocity */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-foreground-secondary">Velocity</span>
              <span className={cn(
                'font-mono',
                member.velocity >= 80 ? 'text-status-success' :
                member.velocity >= 60 ? 'text-status-warning' :
                'text-status-critical'
              )}>{member.velocity}%</span>
            </div>
            <Progress value={member.velocity} showGlow={false} />
          </div>

          {/* Workload */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-foreground-secondary">Workload</span>
              <span className={cn(
                'font-mono',
                member.load <= 80 ? 'text-status-success' :
                member.load <= 100 ? 'text-status-warning' :
                'text-status-critical'
              )}>{member.load}%</span>
            </div>
            <div className="h-1.5 bg-background-tertiary rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  member.load <= 80 ? 'bg-status-success' :
                  member.load <= 100 ? 'bg-status-warning' :
                  'bg-status-critical'
                )}
                style={{ width: `${Math.min(member.load, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-4 pt-3 border-t border-border grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-mono text-foreground">{member.tasksCompleted}</div>
            <div className="text-xs text-foreground-tertiary">Tasks</div>
          </div>
          <div>
            <div className="text-lg font-mono text-foreground">{member.prsReviewed}</div>
            <div className="text-xs text-foreground-tertiary">Reviews</div>
          </div>
          <div>
            <div className={cn(
              'text-lg font-mono',
              member.avgReviewTime <= 4 ? 'text-status-success' :
              member.avgReviewTime <= 8 ? 'text-status-warning' :
              'text-status-critical'
            )}>{member.avgReviewTime}h</div>
            <div className="text-xs text-foreground-tertiary">Avg Review</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Team stats
function TeamStats({ team }: { team: TeamMember[] }) {
  const avgVelocity = Math.round(team.reduce((acc, m) => acc + m.velocity, 0) / team.length)
  const overloaded = team.filter(m => m.load > 100).length
  const totalBlockers = team.reduce((acc, m) => acc + m.blockers, 0)
  const online = team.filter(m => m.status === 'online').length

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-foreground">{avgVelocity}%</div>
          <div className="text-xs text-foreground-secondary">Team Velocity</div>
        </CardContent>
      </Card>
      <Card padding="sm" glow={overloaded > 0 ? 'warning' : 'none'}>
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-status-warning">{overloaded}</div>
          <div className="text-xs text-foreground-secondary">Overloaded</div>
        </CardContent>
      </Card>
      <Card padding="sm" glow={totalBlockers > 0 ? 'critical' : 'none'}>
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-status-critical">{totalBlockers}</div>
          <div className="text-xs text-foreground-secondary">Total Blockers</div>
        </CardContent>
      </Card>
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-status-success">{online}/{team.length}</div>
          <div className="text-xs text-foreground-secondary">Online Now</div>
        </CardContent>
      </Card>
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Team</h2>
          <p className="text-sm text-foreground-secondary mt-1">
            Real-time team capacity and performance
          </p>
        </div>

        {/* Sort control */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground-secondary">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-background-secondary border border-border rounded-md px-2 py-1 text-sm text-foreground"
          >
            <option value="load">Workload</option>
            <option value="velocity">Velocity</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <TeamStats team={team} />

      {/* Team grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedTeam.map(member => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>

      {/* Load balancing suggestion */}
      {team.some(m => m.load > 100) && team.some(m => m.load < 60) && (
        <div className="p-4 bg-nf-muted border border-nf/20 rounded-lg">
          <div className="flex items-start gap-3">
            <BreathingDot variant="nf" size="md" />
            <div>
              <h4 className="text-sm font-medium text-nf mb-1">Load Balancing Opportunity</h4>
              <p className="text-xs text-foreground-secondary leading-relaxed">
                NexFlow detected uneven workload distribution. Consider reassigning tasks from
                overloaded team members to those with capacity. Click a team member to see
                their task assignments.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
