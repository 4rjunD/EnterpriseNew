'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { cn } from '@nexflow/ui/utils'
import { Card } from '@/components/nf/card'
import type { OnboardingData } from './onboarding-flow'

// Icon components
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

interface StepSignInProps {
  data: OnboardingData
  onSignedIn: () => void
}

// Save onboarding data to localStorage
const STORAGE_KEY = 'nexflow_onboarding_data'

export function saveOnboardingData(data: OnboardingData) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }
}

export function loadOnboardingData(): OnboardingData | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return null
      }
    }
  }
  return null
}

export function clearOnboardingData() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function StepSignIn({ data, onSignedIn }: StepSignInProps) {
  const { data: session, status } = useSession()
  const [isSigningIn, setIsSigningIn] = useState<'google' | 'github' | null>(null)

  // Save data to localStorage before OAuth redirect
  useEffect(() => {
    saveOnboardingData(data)
  }, [data])

  // If already signed in, proceed
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      onSignedIn()
    }
  }, [status, session, onSignedIn])

  const handleSignIn = async (provider: 'google' | 'github') => {
    setIsSigningIn(provider)
    // Save data before redirect
    saveOnboardingData(data)

    try {
      await signIn(provider, {
        callbackUrl: '/onboarding?step=scanning',
      })
    } catch (error) {
      console.error('Sign-in failed:', error)
      setIsSigningIn(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-semibold text-foreground tracking-tighter">
          Almost ready — sign in to save
        </h1>
        <p className="text-sm text-foreground-secondary max-w-md mx-auto">
          Sign in to save your workspace and access it from anywhere. Your configuration is stored locally and will be applied after sign-in.
        </p>
      </div>

      {/* OAuth Buttons */}
      <div className="max-w-sm mx-auto space-y-3">
        <button
          onClick={() => handleSignIn('google')}
          disabled={isSigningIn !== null}
          className={cn(
            'w-full flex items-center justify-center gap-3 px-6 py-3.5',
            'bg-white text-gray-800 rounded-lg font-medium text-sm',
            'border border-gray-200 shadow-sm',
            'hover:bg-gray-50 hover:border-gray-300 transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <GoogleIcon />
          {isSigningIn === 'google' ? 'Signing in...' : 'Continue with Google'}
        </button>

        <button
          onClick={() => handleSignIn('github')}
          disabled={isSigningIn !== null}
          className={cn(
            'w-full flex items-center justify-center gap-3 px-6 py-3.5',
            'bg-[#24292e] text-white rounded-lg font-medium text-sm',
            'border border-[#1b1f23]',
            'hover:bg-[#2f363d] transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <GitHubIcon />
          {isSigningIn === 'github' ? 'Signing in...' : 'Continue with GitHub'}
        </button>
      </div>

      {/* Workspace preview */}
      <Card className="max-w-sm mx-auto" padding="sm">
        <div className="p-4 space-y-3">
          <div className="text-xs text-foreground-tertiary uppercase tracking-wider font-mono">
            Your workspace
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground-secondary">Name</span>
              <span className="text-sm font-medium text-foreground">{data.workspaceName || 'Untitled'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground-secondary">Team type</span>
              <span className="text-sm font-medium text-foreground capitalize">{data.teamType || 'Not set'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground-secondary">Team size</span>
              <span className="text-sm font-medium text-foreground">{data.teamSize} members</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground-secondary">Integrations</span>
              <span className="text-sm font-medium text-foreground">{data.connectedIntegrations.length} connected</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Info */}
      <p className="text-xs text-foreground-tertiary text-center max-w-sm mx-auto">
        Your workspace configuration is saved locally. After signing in, NexFlow will create your workspace and start syncing your data.
      </p>
    </div>
  )
}
