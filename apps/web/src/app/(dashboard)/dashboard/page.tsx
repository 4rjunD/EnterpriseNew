'use client'

import { useState } from 'react'
import { SummaryCardRow } from '@/components/layout/summary-card-row'
import { DashboardDetail } from '@/components/dashboard/dashboard-detail'
import { BottlenecksDetail } from '@/components/bottlenecks/bottlenecks-detail'
import { TeamDetail } from '@/components/team/team-detail'
import { TasksDetail } from '@/components/tasks/tasks-detail'
import { PredictionsDetail } from '@/components/predictions/predictions-detail'
import { InsightsDetail } from '@/components/insights/insights-detail'
import { ProjectsDetail } from '@/components/projects/projects-detail'
import { IntegrationsDetail } from '@/components/integrations/integrations-detail'

export type CardType =
  | 'dashboard'
  | 'bottlenecks'
  | 'team'
  | 'tasks'
  | 'predictions'
  | 'insights'
  | 'projects'
  | 'integrations'

export default function DashboardPage() {
  const [activeCard, setActiveCard] = useState<CardType>('dashboard')

  const renderDetailContent = () => {
    switch (activeCard) {
      case 'dashboard':
        return <DashboardDetail />
      case 'bottlenecks':
        return <BottlenecksDetail />
      case 'team':
        return <TeamDetail />
      case 'tasks':
        return <TasksDetail />
      case 'predictions':
        return <PredictionsDetail />
      case 'insights':
        return <InsightsDetail />
      case 'projects':
        return <ProjectsDetail />
      case 'integrations':
        return <IntegrationsDetail />
      default:
        return <DashboardDetail />
    }
  }

  return (
    <div className="space-y-8">
      <SummaryCardRow activeCard={activeCard} onCardSelect={setActiveCard} />
      <div className="min-h-[600px]">
        {renderDetailContent()}
      </div>
    </div>
  )
}
