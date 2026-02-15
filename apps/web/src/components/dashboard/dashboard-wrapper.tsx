'use client'

import { useState, useMemo } from 'react'
import { NexFlowHeader } from '@/components/layout/nexflow-header'
import {
  TodayTab,
  PredictionsTab,
  TeamTab,
  SprintTab,
  RisksTab,
  IntegrationsTab,
  MilestonesTab,
  InsightsTab,
  QualityTab,
  VelocityTab,
  ClientsTab,
  ScheduleTab,
  ProjectsTab,
} from '@/components/dashboard/tabs'
import { type TeamType } from '@/lib/theme'
import { trpc } from '@/lib/trpc'

type UserRole = 'cofounder' | 'admin' | 'member'

interface DashboardWrapperProps {
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
    role: string
  }
  workspace?: {
    name: string
    teamType: TeamType
    targetDate?: string | Date
  }
}

export function DashboardWrapper({ user, workspace }: DashboardWrapperProps) {
  // Map the database role to our role type
  const userRole: UserRole = useMemo(() => {
    const role = user.role.toLowerCase()
    if (role === 'admin' || role === 'cofounder') return role as UserRole
    return 'member'
  }, [user.role])

  const teamType = workspace?.teamType || 'launch'
  const [activeTab, setActiveTab] = useState('today')

  // Fetch real badge counts from the database
  const { data: tasksData } = trpc.tasks.list.useQuery({ status: ['TODO', 'IN_PROGRESS', 'BLOCKED'], limit: 100 }, { retry: false })
  const { data: predictions } = trpc.predictions.list.useQuery({}, { retry: false })
  const { data: bottlenecks } = trpc.bottlenecks.list.useQuery({}, { retry: false })

  // Calculate real badge counts
  const tabBadges = useMemo(() => {
    const urgentTasks = tasksData?.tasks?.filter(t => t.priority === 'URGENT' || t.priority === 'HIGH').length || 0
    const activePredictions = predictions?.filter(p => p.status === 'ACTIVE' && p.impact === 'HIGH').length || 0
    const activeRisks = bottlenecks?.filter(r => r.status === 'ACTIVE' && (r.severity === 'CRITICAL' || r.severity === 'HIGH')).length || 0

    return {
      today: urgentTasks,
      predictions: activePredictions,
      risks: activeRisks,
    }
  }, [tasksData, predictions, bottlenecks])

  // Parse workspace target date if string
  const workspaceWithDate = useMemo(() => {
    if (!workspace) return undefined
    return {
      ...workspace,
      targetDate: workspace.targetDate
        ? new Date(workspace.targetDate)
        : undefined,
    }
  }, [workspace])

  // Render the active tab with teamType prop
  const renderTab = () => {
    const props = { teamType }

    switch (activeTab) {
      case 'today':
        return <TodayTab {...props} />
      case 'predictions':
        return <PredictionsTab {...props} />
      case 'team':
        return <TeamTab />
      case 'sprint':
        return <SprintTab />
      case 'risks':
        return <RisksTab {...props} />
      case 'integrations':
        return <IntegrationsTab />
      case 'milestones':
        return <MilestonesTab {...props} />
      case 'insights':
        return <InsightsTab />
      case 'quality':
        return <QualityTab />
      case 'velocity':
        return <VelocityTab />
      case 'clients':
        return <ClientsTab />
      case 'schedule':
        return <ScheduleTab />
      case 'projects':
        return <ProjectsTab />
      default:
        return <TodayTab {...props} />
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header - 52px fixed height */}
      <NexFlowHeader
        user={{
          ...user,
          role: userRole,
        }}
        workspace={workspaceWithDate}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabBadges={tabBadges}
      />

      {/* Main content - Vercel-style centered layout */}
      {/* 880px max width, 24px padding on sides, 16px top padding below tabs */}
      <main className="mx-auto px-6 pt-4 pb-8" style={{ maxWidth: 880 }}>
        {renderTab()}
      </main>
    </div>
  )
}
