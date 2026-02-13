'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { FormField, Input } from '@/components/nf/input'
import type { OnboardingData } from './onboarding-flow'

interface StepWorkspaceProps {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
}

export function StepWorkspace({ data, updateData }: StepWorkspaceProps) {
  const { data: session } = useSession()

  // Pre-fill from OAuth session
  useEffect(() => {
    if (session?.user) {
      const updates: Partial<OnboardingData> = {}

      if (session.user.email && !data.userEmail) {
        updates.userEmail = session.user.email
      }

      if (session.user.name && !data.userName) {
        updates.userName = session.user.name
      }

      if (Object.keys(updates).length > 0) {
        updateData(updates)
      }
    }
  }, [session, data.userEmail, data.userName, updateData])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-semibold text-foreground tracking-tighter">
          Create your workspace
        </h1>
        <p className="text-sm text-foreground-secondary max-w-md mx-auto">
          NexFlow analyzes your team's tools and tells everyone exactly what to do each day.
        </p>
      </div>

      {/* Form */}
      <div className="space-y-5 max-w-md mx-auto">
        <FormField label="Workspace name" required>
          <Input
            value={data.workspaceName}
            onChange={(e) => updateData({ workspaceName: e.target.value })}
            placeholder="Acme Inc."
            autoFocus
          />
        </FormField>

        <FormField label="Your name" required>
          <Input
            value={data.userName}
            onChange={(e) => updateData({ userName: e.target.value })}
            placeholder="Jane Smith"
          />
        </FormField>

        <FormField
          label="Email"
          hint={session?.user?.email ? "Pre-filled from your account" : "We'll use this for notifications"}
        >
          <Input
            type="email"
            value={data.userEmail}
            onChange={(e) => updateData({ userEmail: e.target.value })}
            placeholder="jane@acme.com"
            disabled={!!session?.user?.email}
            className={session?.user?.email ? 'bg-background-secondary cursor-not-allowed' : ''}
          />
        </FormField>

        {/* Signed in indicator */}
        {session?.user && (
          <div className="flex items-center gap-2 px-3 py-2 bg-status-success/10 rounded-lg border border-status-success/20">
            <div className="w-2 h-2 rounded-full bg-status-success" />
            <span className="text-xs text-status-success">
              Signed in as {session.user.email}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
