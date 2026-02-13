'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/nf/card'
import { Button } from '@/components/nf/button'
import { FormField, Input, SegmentedControl } from '@/components/nf/input'
import type { UserRole } from '@/lib/theme'

export interface InviteModalProps {
  workspaceName: string
  onClose: () => void
  onInvite?: (data: { email: string; name: string; role: UserRole }) => Promise<void>
}

export function InviteModal({ workspaceName, onClose, onInvite }: InviteModalProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('member')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !name) return

    setIsLoading(true)
    try {
      await onInvite?.({ email, name, role })
      setSuccess(true)
    } catch (error) {
      console.error('Failed to send invite:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Success state
  if (success) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <Card
          className="w-full max-w-md animate-modal"
          padding="lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center py-4">
            {/* Success checkmark */}
            <div className="w-16 h-16 rounded-full bg-status-success/10 flex items-center justify-center mx-auto mb-4 animate-scale-in">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                className="text-status-success"
              >
                <path
                  d="M8 16L14 22L24 10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h3 className="text-lg font-semibold text-foreground mb-2">Invite sent!</h3>
            <p className="text-sm text-foreground-secondary mb-6">
              NexFlow will start analyzing <span className="font-medium">{name}</span>'s data as soon as they connect their tools.
            </p>

            <Button variant="secondary" onClick={onClose}>
              Done
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md animate-modal"
        padding="none"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="p-6 pb-0">
          <CardTitle>Invite to {workspaceName}</CardTitle>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-4">
            <FormField label="Email" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                autoFocus
              />
            </FormField>

            <FormField label="Name" required>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
              />
            </FormField>

            <FormField label="Role">
              <SegmentedControl
                value={role}
                onChange={setRole}
                options={[
                  { value: 'member', label: 'Member' },
                  { value: 'admin', label: 'Admin' },
                  { value: 'cofounder', label: 'Co-founder' },
                ]}
              />
            </FormField>

            {/* Co-founder explanation */}
            {role === 'cofounder' && (
              <div className="bg-purple-muted border border-purple/20 rounded-card p-3 animate-fade-in-up">
                <p className="text-xs text-foreground">
                  <span className="font-medium text-purple">Co-founders</span> get exclusive access to the Insights tab — strategic intelligence showing productivity patterns, process bottlenecks, and cross-team trends.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="p-6 pt-0 flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
              disabled={!email || !name}
              className="flex-1"
            >
              Send invite via Resend
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-1.5">
                <path
                  d="M2 7H12M9 4L12 7L9 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
