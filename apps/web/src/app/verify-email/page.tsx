'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@nexflow/ui/button'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no-token'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('no-token')
      return
    }

    // The actual verification happens via redirect in the API route
    // This page shows the result based on URL params
    const error = searchParams.get('error')
    const msg = searchParams.get('message')

    if (error) {
      setStatus('error')
      switch (error) {
        case 'invalid_token':
          setMessage('This verification link is invalid.')
          break
        case 'token_expired':
          setMessage('This verification link has expired.')
          break
        case 'user_not_found':
          setMessage('User not found.')
          break
        default:
          setMessage('Verification failed.')
      }
    } else if (msg === 'already_verified' || msg === 'email_verified') {
      setStatus('success')
      setMessage(msg === 'already_verified' ? 'Your email is already verified.' : 'Your email has been verified!')
    } else {
      // Token present but no result yet - redirect to API
      window.location.href = `/api/auth/verify-email?token=${token}`
    }
  }, [token, searchParams])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent mx-auto" />
          <p className="text-sm text-foreground-muted">Verifying your email...</p>
        </div>
      </div>
    )
  }

  if (status === 'no-token') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-lg font-semibold text-foreground">NexFlow</h1>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="text-center">
              <h2 className="mb-2 text-lg font-medium text-foreground">Verify your email</h2>
              <p className="mb-6 text-sm text-foreground-muted">
                Check your inbox for a verification link. If you didn't receive one, you can request a new link from your settings.
              </p>
              <Link href="/login">
                <Button className="w-full">Go to login</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold text-foreground">NexFlow</h1>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="text-center">
            <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
              status === 'success' ? 'bg-green-50' : 'bg-red-50'
            }`}>
              {status === 'success' ? (
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <h2 className="mb-2 text-lg font-medium text-foreground">
              {status === 'success' ? 'Email verified' : 'Verification failed'}
            </h2>
            <p className="mb-6 text-sm text-foreground-muted">{message}</p>
            <Link href={status === 'success' ? '/dashboard' : '/login'}>
              <Button className="w-full">
                {status === 'success' ? 'Go to dashboard' : 'Back to login'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent mx-auto" />
          <p className="text-sm text-foreground-muted">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
