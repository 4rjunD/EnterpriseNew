'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@nexflow/ui/button'
import { Input } from '@nexflow/ui/input'
import { Label } from '@nexflow/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@nexflow/ui/card'
import { trpc } from '@/lib/trpc'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: invitation, isLoading, error: fetchError } = trpc.invitations.getByToken.useQuery(
    { token },
    { retry: false }
  )

  const acceptMutation = trpc.invitations.accept.useMutation({
    onSuccess: () => {
      router.push('/login?message=Account created successfully. Please sign in.')
    },
    onError: (err) => {
      setError(err.message)
      setIsSubmitting(false)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsSubmitting(true)
    acceptMutation.mutate({ token, name, password })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-foreground-muted" />
      </div>
    )
  }

  if (fetchError || !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-status-critical-light rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-status-critical" />
            </div>
            <CardTitle className="text-2xl">Invalid Invitation</CardTitle>
            <CardDescription>
              {fetchError?.message || 'This invitation link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/login">
              <Button>Go to Login</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-foreground rounded-[12px] flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">
              {invitation.organizationName.charAt(0)}
            </span>
          </div>
          <CardTitle className="text-2xl">
            Join {invitation.organizationName}
          </CardTitle>
          <CardDescription>
            You&apos;ve been invited to join as {invitation.role.toLowerCase()}
            {invitation.teamName && ` on the ${invitation.teamName} team`}.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invitation.email}
                disabled
                className="bg-background-secondary text-foreground-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>

            {error && (
              <div className="bg-status-critical-light border border-status-critical/20 rounded-lg p-3 text-status-critical text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Create Account & Join
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center">
          <p className="text-sm text-foreground-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
