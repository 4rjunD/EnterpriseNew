'use client'

import { useState, ReactNode } from 'react'
import { TopBar } from './top-bar'
import { TabBar } from './tab-bar'
import { InviteModal } from './invite-modal'
import type { TeamType, UserRole } from '@/lib/theme'

export interface WorkspaceData {
  name: string
  teamType: TeamType
  teamSize: number
  primaryMetricValue: number
  daysRemaining?: number
  sprintDay?: { current: number; total: number }
}

export interface UserData {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
}

export interface DashboardShellProps {
  workspace: WorkspaceData
  currentUser: UserData
  members?: UserData[]
  children: ReactNode
  activeTab: string
  onTabChange: (tab: string) => void
  tabCounts?: Record<string, number>
}

export function DashboardShell({
  workspace,
  currentUser,
  members = [],
  children,
  activeTab,
  onTabChange,
  tabCounts,
}: DashboardShellProps) {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState(currentUser.id)

  // Get the currently viewed user (for role preview)
  const viewedUser = members.find((m) => m.id === selectedUserId) || currentUser
  const effectiveRole = currentUser.role === 'cofounder' ? viewedUser.role : currentUser.role

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <TopBar
        workspaceName={workspace.name}
        teamType={workspace.teamType}
        primaryMetricValue={workspace.primaryMetricValue}
        daysRemaining={workspace.daysRemaining}
        sprintDay={workspace.sprintDay}
        currentUser={currentUser}
        members={members}
        selectedUserId={selectedUserId}
        onUserChange={setSelectedUserId}
        onInvite={() => setShowInviteModal(true)}
      />

      {/* Tab Bar */}
      <TabBar
        teamType={workspace.teamType}
        userRole={effectiveRole}
        activeTab={activeTab}
        onTabChange={onTabChange}
        tabCounts={tabCounts}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="animate-tab-in">{children}</div>
      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          workspaceName={workspace.name}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
}
