'use client'

import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@nexflow/ui/modal'
import { AvatarWithStatus } from '@nexflow/ui/avatar'
import { Badge } from '@nexflow/ui/badge'
import { Skeleton } from '@nexflow/ui/skeleton'
import { Card } from '@nexflow/ui/card'
import {
  Mail,
  Briefcase,
  CheckSquare,
  GitPullRequest,
  Clock,
} from 'lucide-react'

interface MemberDetailDrawerProps {
  memberId: string | null
  open: boolean
  onClose: () => void
}

export function MemberDetailDrawer({
  memberId,
  open,
  onClose,
}: MemberDetailDrawerProps) {
  const { data: session } = useSession()
  const isManager = session?.user?.role !== 'IC'

  const { data: member, isLoading } = trpc.team.getMemberDetails.useQuery(
    { userId: memberId! },
    { enabled: !!memberId && open }
  )

  return (
    <Modal open={open} onOpenChange={onClose}>
      <ModalContent className="max-w-lg">
        {isLoading ? (
          <MemberDetailSkeleton />
        ) : member ? (
          <>
            <ModalHeader className="flex-row items-center gap-4">
              <AvatarWithStatus
                status={member.status?.toLowerCase() as 'online' | 'busy' | 'away' | 'offline'}
                src={member.image || undefined}
                fallback={getInitials(member.name || member.email)}
                className="h-16 w-16"
              />
              <div>
                <ModalTitle>{member.name || 'Unknown'}</ModalTitle>
                <ModalDescription>{member.email}</ModalDescription>
                <div className="mt-2 flex gap-2">
                  <Badge variant="outline">{member.role}</Badge>
                  {member.teams?.filter((tm: any) => tm?.team).map((tm: { team: { name: string; id: string } }) => (
                    <Badge key={tm.team.id} variant="secondary">
                      {tm.team.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </ModalHeader>

            <div className="space-y-4 pt-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-accent" />
                    <span className="text-sm text-foreground-muted">Active Tasks</span>
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {member.assignedTasks?.length ?? 0}
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <GitPullRequest className="h-4 w-4 text-status-healthy" />
                    <span className="text-sm text-foreground-muted">Open PRs</span>
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {member.pullRequests?.length ?? 0}
                  </div>
                </Card>
              </div>

              {/* Recent Tasks */}
              {member.assignedTasks && member.assignedTasks.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-foreground">
                    Current Tasks
                  </h4>
                  <div className="space-y-2">
                    {member.assignedTasks.slice(0, 5).map((task: { id: string; title: string; status: string; priority: string }) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between rounded-lg border border-border p-2"
                      >
                        <span className="text-sm truncate max-w-[200px]">
                          {task.title}
                        </span>
                        <Badge
                          variant={
                            task.priority === 'URGENT' || task.priority === 'HIGH'
                              ? 'critical'
                              : 'secondary'
                          }
                        >
                          {task.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Behavioral Metrics (Manager only) */}
              {isManager && member.behavioralMetrics && member.behavioralMetrics.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-foreground">
                    Activity Insights
                  </h4>
                  <Card className="p-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-foreground-muted">Avg Response Time</span>
                        <div className="font-medium">
                          {Math.round(
                            member.behavioralMetrics.reduce(
                              (sum: number, m: { avgResponseTimeMs: number | null }) =>
                                sum + (m.avgResponseTimeMs || 0),
                              0
                            ) / member.behavioralMetrics.length / 60000
                          )}{' '}
                          min
                        </div>
                      </div>
                      <div>
                        <span className="text-foreground-muted">Collaboration Score</span>
                        <div className="font-medium">
                          {Math.round(
                            member.behavioralMetrics.reduce(
                              (sum: number, m: { collaborationScore: number | null }) =>
                                sum + (m.collaborationScore || 0),
                              0
                            ) / member.behavioralMetrics.length
                          )}
                          %
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-foreground-muted">
            Member not found
          </div>
        )}
      </ModalContent>
    </Modal>
  )
}

function MemberDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-32" />
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
