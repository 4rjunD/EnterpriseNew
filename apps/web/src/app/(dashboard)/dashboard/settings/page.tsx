'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Button } from '@nexflow/ui/button'
import { Input } from '@nexflow/ui/input'
import { Label } from '@nexflow/ui/label'
import { toast } from '@nexflow/ui/toast'

interface UserSettings {
  id: string
  name: string | null
  email: string
  image: string | null
  emailVerified: string | null
  createdAt: string
  role: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Profile form
  const [name, setName] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Delete form
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Resend verification
  const [isResendingVerification, setIsResendingVerification] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/user/settings')
      if (!res.ok) throw new Error('Failed to fetch settings')
      const data = await res.json()
      setSettings(data)
      setName(data.name || '')
    } catch {
      toast({ title: 'Failed to load settings', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingProfile(true)

    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      toast({ title: 'Profile updated' })
      fetchSettings()
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to save',
        variant: 'destructive',
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }

    if (newPassword.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' })
      return
    }

    setIsChangingPassword(true)

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to change password')
      }

      toast({ title: 'Password changed successfully' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to change password',
        variant: 'destructive',
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleResendVerification = async () => {
    setIsResendingVerification(true)

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send email')
      }

      toast({ title: 'Verification email sent' })
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to send email',
        variant: 'destructive',
      })
    } finally {
      setIsResendingVerification(false)
    }
  }

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()

    if (deleteConfirmation !== 'DELETE') {
      toast({ title: 'Please type DELETE to confirm', variant: 'destructive' })
      return
    }

    setIsDeleting(true)

    try {
      const res = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword, confirmation: deleteConfirmation }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete account')
      }

      toast({ title: 'Account deleted' })
      await signOut({ callbackUrl: '/login' })
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to delete account',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-foreground-muted">Manage your account settings</p>
      </div>

      {/* Profile Section */}
      <section className="rounded-lg border border-border p-6">
        <h2 className="mb-4 text-base font-medium text-foreground">Profile</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={settings?.email || ''} disabled className="bg-background-secondary" />
            {!settings?.emailVerified && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-amber-600">Email not verified</span>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification}
                  className="text-foreground underline hover:no-underline"
                >
                  {isResendingVerification ? 'Sending...' : 'Resend verification'}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <Button type="submit" disabled={isSavingProfile}>
            {isSavingProfile ? 'Saving...' : 'Save changes'}
          </Button>
        </form>
      </section>

      {/* Password Section */}
      <section className="rounded-lg border border-border p-6">
        <h2 className="mb-4 text-base font-medium text-foreground">Change password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <Button type="submit" disabled={isChangingPassword}>
            {isChangingPassword ? 'Changing...' : 'Change password'}
          </Button>
        </form>
      </section>

      {/* Danger Zone */}
      <section className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="mb-2 text-base font-medium text-red-900">Danger zone</h2>
        <p className="mb-4 text-sm text-red-700">
          Once you delete your account, there is no going back. Please be certain.
        </p>

        {!showDeleteModal ? (
          <Button
            variant="destructive"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete account
          </Button>
        ) : (
          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deletePassword" className="text-red-900">Your password</Label>
              <Input
                id="deletePassword"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password"
                className="border-red-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deleteConfirmation" className="text-red-900">
                Type DELETE to confirm
              </Label>
              <Input
                id="deleteConfirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Type DELETE"
                className="border-red-300"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletePassword('')
                  setDeleteConfirmation('')
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isDeleting || deleteConfirmation !== 'DELETE'}
              >
                {isDeleting ? 'Deleting...' : 'Delete my account'}
              </Button>
            </div>
          </form>
        )}
      </section>

      {/* Account Info */}
      <section className="text-sm text-foreground-muted">
        <p>Member since {settings?.createdAt ? new Date(settings.createdAt).toLocaleDateString() : '-'}</p>
        <p>Role: {settings?.role || '-'}</p>
      </section>
    </div>
  )
}
