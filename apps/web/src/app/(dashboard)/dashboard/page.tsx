'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { SummaryCardRow } from '@/components/layout/summary-card-row'
import { DashboardWrapper } from '@/components/dashboard/dashboard-wrapper'

// Existing detail components (fallback)
import { DashboardDetail } from '@/components/dashboard/dashboard-detail'
import { TeamDetail } from '@/components/team/team-detail'
import { TasksDetail } from '@/components/tasks/tasks-detail'
import { PredictionsDetail } from '@/components/predictions/predictions-detail'
import { IntegrationsDetail } from '@/components/integrations/integrations-detail'

// New focused tabs
import {
  TodayTab,
  PredictionsTab,
  TeamTab,
  SprintTab,
  RisksTab,
  IntegrationsTab,
} from '@/components/dashboard/tabs'

export type CardType =
  | 'dashboard'
  | 'team'
  | 'tasks'
  | 'predictions'
  | 'integrations'
  // New internal tabs
  | 'today'
  | 'sprint'
  | 'risks'

// Feature flag for new UI
const USE_NEW_UI = process.env.NEXT_PUBLIC_USE_NEW_UI === 'true'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [activeCard, setActiveCard] = useState<CardType>(USE_NEW_UI ? 'today' : 'dashboard')

  // Show loading state while session is being fetched
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#333] border-t-[#ededed] rounded-full animate-spin" />
      </div>
    )
  }

  // For new UI with full header, use DashboardWrapper
  if (USE_NEW_UI) {
    // Use session data - the (dashboard) layout should redirect if no session
    const user = {
      id: session?.user?.id || '',
      name: session?.user?.name || null,
      email: session?.user?.email || '',
      image: session?.user?.image || null,
      role: (session?.user as { role?: string })?.role || 'member',
    }

    const workspace = {
      name: (session?.user?.name?.split(' ')[0] || 'My') + "'s Workspace",
      teamType: 'launch' as const,
      targetDate: undefined, // Will be fetched from project context if set
    }

    return <DashboardWrapper user={user} workspace={workspace} />
  }

  // Legacy UI
  const renderContent = () => {
    switch (activeCard) {
      case 'dashboard':
        return <DashboardDetail />
      case 'team':
        return <TeamDetail />
      case 'tasks':
        return <TasksDetail />
      case 'predictions':
        return <PredictionsDetail />
      case 'integrations':
        return <IntegrationsDetail />
      default:
        return <DashboardDetail />
    }
  }

  return (
    <div className="space-y-6">
      <SummaryCardRow activeCard={activeCard} onCardSelect={setActiveCard} />
      <div className="min-h-[600px]">
        {renderContent()}
      </div>
    </div>
  )
}
