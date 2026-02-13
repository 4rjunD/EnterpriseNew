'use client'

import { useCallback } from 'react'
import { cn } from '@nexflow/ui/utils'
import { Button, IconButton } from '@/components/nf/button'
import { Input, SegmentedControl } from '@/components/nf/input'
import type { OnboardingData } from './onboarding-flow'

type InviteRole = 'member' | 'admin' | 'cofounder'

interface Invite {
  email: string
  name: string
  role: InviteRole
}

interface StepInviteProps {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
}

export function StepInvite({ data, updateData }: StepInviteProps) {
  const invites = data.invites

  const addInvite = useCallback(() => {
    updateData({
      invites: [...invites, { email: '', name: '', role: 'member' as InviteRole }],
    })
  }, [invites, updateData])

  const removeInvite = useCallback(
    (index: number) => {
      updateData({
        invites: invites.filter((_, i) => i !== index),
      })
    },
    [invites, updateData]
  )

  const updateInvite = useCallback(
    (index: number, updates: Partial<Invite>) => {
      const newInvites = [...invites]
      newInvites[index] = { ...newInvites[index], ...updates }
      updateData({ invites: newInvites })
    },
    [invites, updateData]
  )

  // Ensure at least one row exists
  if (invites.length === 0) {
    addInvite()
    return null
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-semibold text-foreground tracking-tighter">
          Invite your team
        </h1>
        <p className="text-sm text-foreground-secondary max-w-md mx-auto">
          Team members will get personalized action queues based on their role and assignments.
        </p>
      </div>

      {/* Invite Form */}
      <div className="space-y-3 max-w-lg mx-auto">
        {invites.map((invite, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center gap-3 p-3 bg-background-card border border-border rounded-card',
              'animate-fade-in-up'
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex-1 grid grid-cols-2 gap-3">
              <Input
                value={invite.email}
                onChange={(e) => updateInvite(index, { email: e.target.value })}
                placeholder="email@example.com"
                type="email"
              />
              <Input
                value={invite.name}
                onChange={(e) => updateInvite(index, { name: e.target.value })}
                placeholder="Name"
              />
            </div>

            <SegmentedControl
              value={invite.role}
              onChange={(role) => updateInvite(index, { role })}
              options={[
                { value: 'member', label: 'Member' },
                { value: 'admin', label: 'Admin' },
                { value: 'cofounder', label: 'Co-founder' },
              ]}
            />

            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => removeInvite(index)}
              className="text-foreground-tertiary hover:text-status-critical"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 4L12 12M12 4L4 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </IconButton>
          </div>
        ))}

        <Button
          variant="ghost"
          onClick={addInvite}
          className="w-full text-foreground-secondary"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr-2">
            <path
              d="M8 3V13M3 8H13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Add another person
        </Button>
      </div>

      {/* Team size note */}
      {data.teamSize > 20 && (
        <p className="text-xs text-foreground-tertiary text-center">
          For larger teams, you can also bulk-import from a CSV after setup.
        </p>
      )}

      {/* Co-founder explanation */}
      {invites.some((i) => i.role === 'cofounder') && (
        <div className="bg-purple-muted border border-purple/20 rounded-card p-4 max-w-lg mx-auto animate-fade-in-up">
          <p className="text-sm text-foreground">
            <span className="font-medium text-purple">Co-founders</span> get exclusive access to the Insights tab — strategic intelligence worth $200/hr of consulting, showing productivity patterns, process bottlenecks, and cross-team trends.
          </p>
        </div>
      )}
    </div>
  )
}
