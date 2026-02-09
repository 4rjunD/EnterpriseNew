'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import { AvatarGrid } from './avatar-grid'
import { WorkloadHeatmap } from './workload-heatmap'
import { MemberDetailDrawer } from './member-detail-drawer'
import { Skeleton } from '@nexflow/ui/skeleton'
import { Input } from '@nexflow/ui/input'
import { Search, Users, Activity } from 'lucide-react'

export function TeamDetail() {
  const { data: session } = useSession()
  const isManager = session?.user?.role !== 'IC'
  const [search, setSearch] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'directory' | 'workload' | 'teams'>('directory')

  const { data: members, isLoading } = trpc.team.listMembers.useQuery({
    search: search || undefined,
  })

  const { data: teams } = trpc.team.listTeams.useQuery()

  const { data: heatmapData, isLoading: heatmapLoading } = trpc.team.getWorkloadHeatmap.useQuery(
    {},
    { enabled: isManager }
  )

  const teamsList = Array.isArray(teams) ? teams : []

  if (isLoading) {
    return <TeamSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
        <Input
          placeholder="Search team members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Vercel-style tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('directory')}
            className={`whitespace-nowrap border-b-2 py-2 text-sm font-medium transition-colors ${
              activeTab === 'directory'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-foreground-muted hover:text-foreground'
            }`}
          >
            Directory
          </button>
          {isManager && (
            <button
              onClick={() => setActiveTab('workload')}
              className={`whitespace-nowrap border-b-2 py-2 text-sm font-medium transition-colors ${
                activeTab === 'workload'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-foreground-muted hover:text-foreground'
              }`}
            >
              Workload
            </button>
          )}
          <button
            onClick={() => setActiveTab('teams')}
            className={`whitespace-nowrap border-b-2 py-2 text-sm font-medium transition-colors ${
              activeTab === 'teams'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-foreground-muted hover:text-foreground'
            }`}
          >
            Teams ({teamsList.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="pt-2">
        {activeTab === 'directory' && (
          <AvatarGrid
            members={members ?? []}
            onMemberClick={setSelectedMemberId}
          />
        )}

        {activeTab === 'workload' && isManager && (
          heatmapLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : (
            <WorkloadHeatmap data={heatmapData ?? []} />
          )
        )}

        {activeTab === 'teams' && (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {teamsList.map((team) => (
              <div
                key={team.id}
                className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-background-secondary"
              >
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: team.color || '#A3A3A3' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{team.name}</div>
                  <div className="text-xs text-foreground-muted">
                    {team.memberCount} members · {team.taskCount} tasks
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Member Detail Drawer */}
      <MemberDetailDrawer
        memberId={selectedMemberId}
        open={!!selectedMemberId}
        onClose={() => setSelectedMemberId(null)}
      />
    </div>
  )
}

function TeamSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-80" />
      <Skeleton className="h-10 w-60" />
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  )
}
