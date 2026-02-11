'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@nexflow/ui/button'
import { Input } from '@nexflow/ui/input'
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (fetchError || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h1>
          <p className="text-slate-400 mb-6">
            {fetchError?.message || 'This invitation link is invalid or has expired.'}
          </p>
          <Link href="/login">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-8 max-w-md w-full">
        <div className="text-center mb-8">
          {invitation.organizationLogo ? (
            <img
              src={invitation.organizationLogo}
              alt={invitation.organizationName}
              className="w-16 h-16 rounded-xl mx-auto mb-4"
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">
                {invitation.organizationName.charAt(0)}
              </span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-white mb-2">
            Join {invitation.organizationName}
          </h1>
          <p className="text-slate-400">
            You&apos;ve been invited to join as {invitation.role.toLowerCase()}
            {invitation.teamName && ` on the ${invitation.teamName} team`}.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email
            </label>
            <Input
              type="email"
              value={invitation.email}
              disabled
              className="bg-slate-700/50 border-slate-600 text-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Your Name
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Confirm Password
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Create Account & Join'
            )}
          </Button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
