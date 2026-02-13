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

// Demo mode
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export default function DashboardPage() {
  const { data: session } = useSession()
  const [activeCard, setActiveCard] = useState<CardType>(USE_NEW_UI ? 'today' : 'dashboard')

  // For new UI with full header, use DashboardWrapper
  if (USE_NEW_UI) {
    const user = session?.user || {
      id: 'demo-user',
      name: DEMO_MODE ? 'Demo User' : 'User',
      email: DEMO_MODE ? 'demo@nexflow.io' : 'user@example.com',
      image: null,
      role: 'cofounder',
    }

    const workspace = {
      name: DEMO_MODE ? 'Acme Startup' : (session?.user?.name?.split(' ')[0] || 'My') + "'s Workspace",
      teamType: 'launch' as const,
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
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
