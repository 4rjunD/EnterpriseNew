'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@nexflow/ui/utils'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/nf/button'
import { StepWorkspace } from './step-workspace'
import { StepTeamType } from './step-team-type'
import { StepConfigure } from './step-configure'
import { StepIntegrations } from './step-integrations'
import { StepInvite } from './step-invite'
import { StepSignIn, loadOnboardingData, clearOnboardingData } from './step-signin'
import { StepScanning } from './step-scanning'
import type { TeamType } from '@/lib/theme'

export interface OnboardingData {
  // Step 1: Workspace
  workspaceName: string
  userName: string
  userEmail: string
  // Step 2: Team Type
  teamType: TeamType | null
  teamSize: number
  // Step 3: Type-specific config
  // Launch
  launchDate?: string
  launchDescription?: string
  milestones?: string
  // Product
  sprintLength?: string
  currentSprintName?: string
  currentGoal?: string
  // Agency
  activeProjects?: string
  billingModel?: string
  targetUtilization?: string
  // Engineering
  targetDeploys?: string
  targetReviewTime?: string
  engineeringFocus?: string
  // Step 4: Integrations
  connectedIntegrations: string[]
  // Step 5: Invites
  invites: { email: string; name: string; role: 'member' | 'admin' | 'cofounder' }[]
}

const initialData: OnboardingData = {
  workspaceName: '',
  userName: '',
  userEmail: '',
  teamType: null,
  teamSize: 5,
  connectedIntegrations: [],
  invites: [],
}

// Steps:
// 1. Workspace
// 2. Team Type
// 3. Configure
// 4. Integrations
// 5. Invite (skippable)
// 6. Sign In (Google/GitHub OAuth)
// 7. Scanning (after auth)
const TOTAL_STEPS = 7

export function OnboardingFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  // Check if we're returning from OAuth (step=scanning in URL)
  const isReturningFromAuth = searchParams.get('step') === 'scanning'

  const [step, setStep] = useState(() => {
    // If returning from auth and signed in, go to scanning
    if (isReturningFromAuth) return 7
    return 1
  })

  const [data, setData] = useState<OnboardingData>(() => {
    // If returning from OAuth, load saved data
    if (typeof window !== 'undefined' && isReturningFromAuth) {
      const savedData = loadOnboardingData()
      if (savedData) return savedData
    }
    return initialData
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // tRPC mutation to mark onboarding as complete
  const completeOnboarding = trpc.onboarding.complete.useMutation()

  // If returning from auth, restore data from localStorage
  useEffect(() => {
    if (isReturningFromAuth && status === 'authenticated') {
      const savedData = loadOnboardingData()
      if (savedData) {
        setData(savedData)
        setStep(7) // Go to scanning
      }
    }
  }, [isReturningFromAuth, status])

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

  const canContinue = useCallback(() => {
    switch (step) {
      case 1:
        return data.workspaceName.trim() !== '' && data.userName.trim() !== ''
      case 2:
        return data.teamType !== null && data.teamSize >= 2 && data.teamSize <= 1000
      case 3:
        // Type-specific validation - only launch date is required for launch type
        if (data.teamType === 'launch') {
          return !!data.launchDate && data.launchDate.trim() !== ''
        }
        return true // Other types have optional fields
      case 4:
        return true // Integrations are optional - can connect later
      case 5:
        return true // Invites are optional
      case 6:
        return true // Sign-in step handles its own flow
      case 7:
        return true
      default:
        return false
    }
  }, [step, data])

  const handleNext = useCallback(async () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1)
    } else {
      // Complete onboarding
      setIsSubmitting(true)
      try {
        // Mark onboarding as complete in the database
        await completeOnboarding.mutateAsync()
        // Clear saved onboarding data
        clearOnboardingData()
        // Redirect to dashboard
        window.location.href = '/dashboard'
      } catch (error) {
        console.error('Error completing onboarding:', error)
        // Still try to redirect even if mutation fails
        window.location.href = '/dashboard'
      } finally {
        setIsSubmitting(false)
      }
    }
  }, [step, completeOnboarding])

  const handleBack = useCallback(() => {
    if (step > 1 && step < 7) {
      setStep(step - 1)
    }
  }, [step])

  const handleSkip = useCallback(() => {
    // Only step 5 (invites) can be skipped
    if (step === 5) {
      setStep(6)
    }
  }, [step])

  const handleSignedIn = useCallback(() => {
    // After sign-in, proceed to scanning
    setStep(7)
  }, [])

  const getEstimatedTime = () => {
    const times = [2, 2, 1, 2, 1, 1, 1]
    const remaining = times.slice(step - 1).reduce((a, b) => a + b, 0)
    return remaining
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return <StepWorkspace data={data} updateData={updateData} />
      case 2:
        return <StepTeamType data={data} updateData={updateData} />
      case 3:
        return <StepConfigure data={data} updateData={updateData} />
      case 4:
        return <StepIntegrations data={data} updateData={updateData} />
      case 5:
        return <StepInvite data={data} updateData={updateData} />
      case 6:
        return <StepSignIn data={data} onSignedIn={handleSignedIn} />
      case 7:
        return <StepScanning data={data} onComplete={handleNext} />
      default:
        return null
    }
  }

  // Show footer navigation (except on sign-in and scanning steps)
  const showFooter = step < 6

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-background-secondary z-50">
        <div
          className="h-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          {/* NexFlow Logo */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-foreground"
          >
            <path
              d="M12 2L2 19h20L12 2z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-sm font-semibold text-foreground">NexFlow</span>
        </div>
        <span className="text-xs text-foreground-tertiary font-mono">
          Step {Math.min(step, 6)} of 6 · ~{getEstimatedTime()} min left
        </span>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl animate-fade-in-up">{renderStep()}</div>
      </main>

      {/* Footer Navigation */}
      {showFooter && (
        <footer className="border-t border-border p-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1}
              className={cn(step === 1 && 'invisible')}
            >
              Back
            </Button>
            <div className="flex items-center gap-3">
              {step === 5 && (
                <button
                  onClick={handleSkip}
                  className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
                >
                  Skip for now
                </button>
              )}
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={!canContinue() || isSubmitting}
                loading={isSubmitting}
              >
                Continue
              </Button>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
