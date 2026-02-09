'use client'

import { AvatarWithStatus } from '@nexflow/ui/avatar'
import { Badge } from '@nexflow/ui/badge'
import { Card } from '@nexflow/ui/card'

interface Member {
  id: string
  name: string | null
  email: string
  image: string | null
  status: string
  role: string
  workload: {
    activeTasks: number
    openPRs: number
  }
  teams: Array<{ id: string; name: string }>
}

interface AvatarGridProps {
  members: Member[]
  onMemberClick: (id: string) => void
}

export function AvatarGrid({ members, onMemberClick }: AvatarGridProps) {
  if (!members || !Array.isArray(members) || members.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-foreground-muted">
        No team members found
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
      {members.map((member) => (
        <Card
          key={member.id}
          className="cursor-pointer p-4 transition-all hover:shadow-card-hover"
          onClick={() => onMemberClick(member.id)}
        >
          <div className="flex flex-col items-center text-center">
            <AvatarWithStatus
              status={member.status.toLowerCase() as 'online' | 'busy' | 'away' | 'offline'}
              src={member.image || undefined}
              fallback={getInitials(member.name || member.email)}
              className="h-12 w-12"
            />
            <div className="mt-3">
              <div className="text-sm font-medium text-foreground truncate max-w-full">
                {member.name || member.email.split('@')[0]}
              </div>
              <div className="text-xs text-foreground-muted">
                {member.workload.activeTasks} tasks
              </div>
            </div>
            {member.teams.length > 0 && (
              <Badge variant="outline" className="mt-2 text-xs">
                {member.teams[0].name}
              </Badge>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

function getInitials(name: string): string {
  if (!name || !name.trim()) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'
}
