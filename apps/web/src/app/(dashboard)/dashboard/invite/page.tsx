'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@nexflow/ui/button'
import { Input } from '@nexflow/ui/input'
import { toast } from '@nexflow/ui/toast'
import { cn } from '@nexflow/ui/utils'
import {
  UserPlus,
  Mail,
  Trash2,
  Plus,
  RefreshCw,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

type Role = 'IC' | 'MANAGER' | 'ADMIN'

interface InviteEntry {
  email: string
  error?: string
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function InviteForm({ onSuccess }: { onSuccess: () => void }) {
  const [entries, setEntries] = useState<InviteEntry[]>([{ email: '' }])
  const [role, setRole] = useState<Role>('IC')

  const sendMutation = trpc.invitations.sendBulk.useMutation({
    onSuccess: (data) => {
      if (data.sent > 0) {
        toast({
          title: 'Invitations sent',
          description: `Successfully sent ${data.sent} of ${data.total} invitations`,
        })
        onSuccess()
        setEntries([{ email: '' }])
      } else {
        toast({
          title: 'No invitations sent',
          description: 'All emails were already invited or exist as users',
          variant: 'destructive',
        })
      }
    },
    onError: (error) => {
      toast({
        title: 'Failed to send invitations',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const addEntry = () => {
    setEntries([...entries, { email: '' }])
  }

  const removeEntry = (index: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index))
    }
  }

  const updateEntry = (index: number, email: string) => {
    const updated = [...entries]
    updated[index] = {
      email,
      error: email && !isValidEmail(email) ? 'Invalid email address' : undefined,
    }
    setEntries(updated)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const validEmails = entries
      .map((e) => e.email.trim())
      .filter((email) => email && isValidEmail(email))

    if (validEmails.length === 0) {
      toast({
        title: 'No valid emails',
        description: 'Please enter at least one valid email address',
        variant: 'destructive',
      })
      return
    }

    sendMutation.mutate({ emails: validEmails, role })
  }

  const validCount = entries.filter((e) => e.email && isValidEmail(e.email)).length

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Role selection */}
      <div className="space-y-2">
        <label className="text-[12px] font-medium text-[#888] uppercase tracking-[0.5px]">
          Role
        </label>
        <div className="flex gap-2">
          {(['IC', 'MANAGER', 'ADMIN'] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                'px-4 py-2 rounded-md text-[13px] font-medium transition-colors',
                role === r
                  ? 'bg-[#ededed] text-[#000]'
                  : 'bg-[#1a1a1a] text-[#888] hover:text-[#ededed] hover:bg-[#252525]'
              )}
            >
              {r === 'IC' ? 'Individual Contributor' : r === 'MANAGER' ? 'Manager' : 'Admin'}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#555]">
          {role === 'IC' && 'Can view and manage their own tasks'}
          {role === 'MANAGER' && 'Can manage team tasks and view reports'}
          {role === 'ADMIN' && 'Full access including integrations and settings'}
        </p>
      </div>

      {/* Email entries */}
      <div className="space-y-2">
        <label className="text-[12px] font-medium text-[#888] uppercase tracking-[0.5px]">
          Email Addresses
        </label>
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={entry.email}
                  onChange={(e) => updateEntry(index, e.target.value)}
                  className={cn(
                    'bg-[#0a0a0a] border-[#1a1a1a] text-[#ededed] placeholder:text-[#555]',
                    entry.error && 'border-[#ff4444]'
                  )}
                />
                {entry.error && (
                  <p className="text-[11px] text-[#ff4444] mt-1">{entry.error}</p>
                )}
              </div>
              {entries.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEntry(index)}
                  className="text-[#555] hover:text-[#ff4444]"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={addEntry}
          className="text-[#888] hover:text-[#ededed]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add another email
        </Button>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between pt-4 border-t border-[#1a1a1a]">
        <p className="text-[12px] text-[#555]">
          {validCount} valid email{validCount !== 1 ? 's' : ''} to invite
        </p>
        <Button
          type="submit"
          disabled={validCount === 0 || sendMutation.isLoading}
          className="bg-[#ededed] text-[#000] hover:bg-[#fff]"
        >
          {sendMutation.isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Send Invitations
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

function InvitationRow({
  invitation,
  onResend,
  onCancel,
}: {
  invitation: {
    id: string
    email: string
    role: string
    status: string
    invitedBy: string
    createdAt: string | Date
    expiresAt: string | Date
  }
  onResend: (id: string) => void
  onCancel: (id: string) => void
}) {
  const isExpired = new Date(invitation.expiresAt) < new Date()
  const status = isExpired && invitation.status === 'PENDING' ? 'EXPIRED' : invitation.status

  const statusConfig = {
    PENDING: { label: 'Pending', color: '#f5a623', icon: Clock },
    ACCEPTED: { label: 'Accepted', color: '#50e3c2', icon: CheckCircle2 },
    EXPIRED: { label: 'Expired', color: '#ff4444', icon: XCircle },
    CANCELLED: { label: 'Cancelled', color: '#555', icon: XCircle },
  }[status] || { label: status, color: '#555', icon: Clock }

  const StatusIcon = statusConfig.icon

  return (
    <div className="flex items-center gap-4 p-4 border-b border-[#1a1a1a] last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[#ededed] truncate">{invitation.email}</span>
          <span
            className={cn(
              'text-[10px] font-mono uppercase tracking-[0.5px]',
              invitation.role === 'ADMIN' && 'text-[#50e3c2]',
              invitation.role === 'MANAGER' && 'text-[#a78bfa]',
              invitation.role === 'IC' && 'text-[#555]'
            )}
          >
            {invitation.role}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-[#555]">Invited by {invitation.invitedBy}</span>
          <span className="text-[#333]">·</span>
          <span className="text-[11px] text-[#555]">
            {new Date(invitation.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded"
          style={{ backgroundColor: `${statusConfig.color}10` }}
        >
          <StatusIcon className="w-3.5 h-3.5" style={{ color: statusConfig.color }} />
          <span className="text-[11px] font-mono uppercase" style={{ color: statusConfig.color }}>
            {statusConfig.label}
          </span>
        </div>

        {(status === 'PENDING' || status === 'EXPIRED') && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onResend(invitation.id)}
              className="text-[#888] hover:text-[#ededed]"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Resend
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(invitation.id)}
              className="text-[#555] hover:text-[#ff4444]"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function InvitationsList() {
  const { data: invitations, isLoading, refetch } = trpc.invitations.list.useQuery()

  const resendMutation = trpc.invitations.resend.useMutation({
    onSuccess: () => {
      toast({ title: 'Invitation resent' })
      refetch()
    },
    onError: (error) => {
      toast({ title: 'Failed to resend', description: error.message, variant: 'destructive' })
    },
  })

  const cancelMutation = trpc.invitations.cancel.useMutation({
    onSuccess: () => {
      toast({ title: 'Invitation cancelled' })
      refetch()
    },
    onError: (error) => {
      toast({ title: 'Failed to cancel', description: error.message, variant: 'destructive' })
    },
  })

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-[#1a1a1a] rounded" />
        ))}
      </div>
    )
  }

  const pendingInvitations = invitations?.filter((i) => i.status === 'PENDING') || []
  const otherInvitations = invitations?.filter((i) => i.status !== 'PENDING') || []

  if (!invitations || invitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Mail className="w-8 h-8 text-[#555] mb-3" />
        <p className="text-[13px] text-[#888]">No invitations sent yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {pendingInvitations.length > 0 && (
        <div>
          <h3 className="text-[12px] font-medium text-[#888] uppercase tracking-[0.5px] mb-2">
            Pending ({pendingInvitations.length})
          </h3>
          <div className="border border-[#1a1a1a] rounded-md overflow-hidden">
            {pendingInvitations.map((inv) => (
              <InvitationRow
                key={inv.id}
                invitation={inv}
                onResend={(id) => resendMutation.mutate({ id })}
                onCancel={(id) => cancelMutation.mutate({ id })}
              />
            ))}
          </div>
        </div>
      )}

      {otherInvitations.length > 0 && (
        <div>
          <h3 className="text-[12px] font-medium text-[#888] uppercase tracking-[0.5px] mb-2">
            History
          </h3>
          <div className="border border-[#1a1a1a] rounded-md overflow-hidden">
            {otherInvitations.map((inv) => (
              <InvitationRow
                key={inv.id}
                invitation={inv}
                onResend={(id) => resendMutation.mutate({ id })}
                onCancel={(id) => cancelMutation.mutate({ id })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function InvitePage() {
  const utils = trpc.useUtils()

  const handleInviteSuccess = () => {
    utils.invitations.list.invalidate()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard?card=team"
          className="flex items-center justify-center w-8 h-8 rounded-md border border-[#1a1a1a] text-[#888] hover:text-[#ededed] hover:border-[#252525] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">
            Invite Team Members
          </h1>
          <p className="text-[13px] text-[#888] mt-1">
            Send invitations to add teammates to your organization
          </p>
        </div>
      </div>

      {/* Invite form */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-[#888]" />
          <h2 className="text-[14px] font-medium text-[#ededed]">New Invitations</h2>
        </div>
        <InviteForm onSuccess={handleInviteSuccess} />
      </div>

      {/* Invitations list */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-[#888]" />
          <h2 className="text-[14px] font-medium text-[#ededed]">Sent Invitations</h2>
        </div>
        <InvitationsList />
      </div>
    </div>
  )
}
