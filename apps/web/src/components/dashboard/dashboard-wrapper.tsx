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
import { LAYOUT, type TeamType } from '@/lib/theme'

// Tab badges (would come from real data)
const DEFAULT_TAB_BADGES: Record<string, number> = {
  today: 3,
  predictions: 2,
  risks: 1,
}

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
      {/* New header with role switcher */}
      <NexFlowHeader
        user={{
          ...user,
          role: userRole,
        }}
        workspace={workspaceWithDate}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabBadges={DEFAULT_TAB_BADGES}
      />

      {/* Main content - Vercel-style centered layout */}
      <main
        className="mx-auto"
        style={{
          maxWidth: `${LAYOUT.maxContentWidth}px`,
          padding: `${LAYOUT.pagePadding}px`,
        }}
      >
        {renderTab()}
      </main>
    </div>
  )
}
