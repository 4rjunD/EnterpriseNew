'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { cn } from '@nexflow/ui/utils'
import { trpc } from '@/lib/trpc'
import { Card } from '@/components/nf/card'
import { Badge } from '@/components/nf/badge'
import { Button } from '@/components/nf/button'
import { BreathingDot } from '@/components/nf/breathing-dot'
import { TEAM_TYPES } from '@/lib/theme'
import type { OnboardingData } from './onboarding-flow'

interface StepScanningProps {
  data: OnboardingData
  onComplete: () => void
}

// Scanning phases with sprint-style timing
const SCANNING_PHASES = [
  { text: 'Connecting to your integrations...', duration: 800, progress: 12 },
  { text: 'Scanning repositories...', duration: 600, progress: 25 },
  { text: 'Analyzing commit patterns...', duration: 900, progress: 38 },
  { text: 'Fetching pull requests...', duration: 700, progress: 52 },
  { text: 'Mapping team velocity...', duration: 800, progress: 65 },
  { text: 'Detecting bottlenecks...', duration: 600, progress: 78 },
  { text: 'Generating predictions...', duration: 900, progress: 88 },
  { text: 'Building your action queue...', duration: 700, progress: 95 },
  { text: 'Finalizing setup...', duration: 500, progress: 100 },
]

export function StepScanning({ data, onComplete }: StepScanningProps) {
  const { data: session } = useSession()
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [targetProgress, setTargetProgress] = useState(0)
  const [scanComplete, setScanComplete] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const teamType = data.teamType || 'launch'
  const config = TEAM_TYPES[teamType]

  // tRPC mutation to complete onboarding
  const completeOnboarding = trpc.onboarding.complete.useMutation()

  // Fetch real connected integrations
  const { data: integrationsData } = trpc.integrations.list.useQuery()

  // Fetch real bottlenecks if any
  const { data: bottlenecksData } = trpc.bottlenecks.list.useQuery(undefined, {
    enabled: scanComplete,
  })

  // Fetch real tasks if any
  const { data: tasksData } = trpc.tasks.list.useQuery(
    { limit: 5 },
    { enabled: scanComplete }
  )

  // Sprint-style progress animation
  useEffect(() => {
    if (scanComplete) return

    const currentPhase = SCANNING_PHASES[phaseIndex]
    if (!currentPhase) {
      setScanComplete(true)
      return
    }

    // Set target progress for this phase
    setTargetProgress(currentPhase.progress)

    // Move to next phase after duration
    const timer = setTimeout(() => {
      if (phaseIndex < SCANNING_PHASES.length - 1) {
        setPhaseIndex(phaseIndex + 1)
      } else {
        setScanComplete(true)
      }
    }, currentPhase.duration)

    return () => clearTimeout(timer)
  }, [phaseIndex, scanComplete])

  // Smooth progress bar animation toward target
  useEffect(() => {
    if (progress >= targetProgress) return

    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + 2
        if (next >= targetProgress) {
          clearInterval(timer)
          return targetProgress
        }
        return next
      })
    }, 30)

    return () => clearInterval(timer)
  }, [targetProgress, progress])

  // Handle dashboard redirect
  const handleOpenDashboard = useCallback(async () => {
    setIsRedirecting(true)
    try {
      // Send invites if any were added
      const validInvites = data.invites.filter(inv => inv.email.trim())
      await completeOnboarding.mutateAsync({
        invites: validInvites.length > 0 ? validInvites : undefined,
      })
      // Force a full page reload to refresh session
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      // Try redirect anyway
      window.location.href = '/dashboard'
    }
  }, [completeOnboarding, data.invites])

  const currentPhase = SCANNING_PHASES[phaseIndex]
  const connectedIntegrations = integrationsData?.connected || []
  const hasRealData = connectedIntegrations.length > 0

  // Calculate items needing attention
  const bottleneckCount = bottlenecksData?.length || 0
  const taskCount = tasksData?.tasks?.length || 0
  const itemsNeedingAttention = bottleneckCount + Math.min(taskCount, 3)

  if (!scanComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-12">
        {/* Animated status indicator */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-nf/5 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-nf/10 flex items-center justify-center">
              <BreathingDot variant="nf" size="lg" />
            </div>
          </div>
          {/* Rotating ring */}
          <svg
            className="absolute inset-0 w-20 h-20 -rotate-90"
            viewBox="0 0 80 80"
          >
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="hsl(var(--nf) / 0.2)"
              strokeWidth="2"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="hsl(var(--nf))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${(progress / 100) * 226} 226`}
              className="transition-all duration-300 ease-out"
            />
          </svg>
        </div>

        {/* Phase text with fade animation */}
        <div className="text-center space-y-2 h-16">
          <p
            key={phaseIndex}
            className="text-lg font-medium text-foreground animate-fade-in-up"
          >
            {currentPhase?.text}
          </p>
          <p className="text-sm text-foreground-tertiary font-mono">
            {progress}% complete
          </p>
        </div>

        {/* Sprint-style progress bar */}
        <div className="w-full max-w-md space-y-3">
          <div className="h-1.5 bg-background-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-nf rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Phase indicators */}
          <div className="flex justify-between px-1">
            {SCANNING_PHASES.map((phase, i) => (
              <div
                key={i}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all duration-200',
                  i <= phaseIndex ? 'bg-nf' : 'bg-background-tertiary'
                )}
              />
            ))}
          </div>
        </div>

        {/* Connected integrations */}
        <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
          <span>Scanning:</span>
          {connectedIntegrations.length > 0 ? (
            connectedIntegrations.slice(0, 3).map((int, i) => (
              <span
                key={int.type}
                className={cn(
                  'px-2 py-0.5 bg-background-secondary rounded',
                  i <= Math.floor(phaseIndex / 3) && 'text-foreground-secondary'
                )}
              >
                {int.name}
              </span>
            ))
          ) : (
            <span className="px-2 py-0.5 bg-background-secondary rounded text-foreground-tertiary">
              No integrations connected
            </span>
          )}
        </div>
      </div>
    )
  }

  // Scan complete - show success
  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Success header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-status-success/10 flex items-center justify-center mx-auto animate-scale-in">
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

        <div>
          <h2 className="text-2xl font-semibold text-foreground tracking-tighter">
            {data.workspaceName} is ready
          </h2>
          <p className="text-sm text-foreground-secondary mt-2">
            {hasRealData ? (
              <>
                NexFlow analyzed your data
                {itemsNeedingAttention > 0 && (
                  <>
                    {' '}and found{' '}
                    <span className="text-status-warning font-medium">
                      {itemsNeedingAttention} item{itemsNeedingAttention !== 1 ? 's' : ''}
                    </span>{' '}
                    that need attention.
                  </>
                )}
              </>
            ) : (
              <>
                Connect your tools in the dashboard to start getting AI-powered insights.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Dashboard Preview */}
      <Card className="overflow-hidden" padding="none">
        {/* Mini top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background-secondary">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-foreground">
                <path d="M12 2L2 19h20L12 2z" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span className="text-xs font-semibold text-foreground">NexFlow</span>
              <span className="text-foreground-tertiary">/</span>
              <span className="text-xs text-foreground-secondary">{data.workspaceName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 bg-nf-muted rounded">
            <BreathingDot variant="nf" size="sm" />
            <span className="text-[10px] font-mono text-nf">Active</span>
          </div>
        </div>

        {/* Mini tab bar */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-border">
          {config.tabs.slice(0, 5).map((tab, i) => (
            <span
              key={tab}
              className={cn(
                'text-xs',
                i === 0 ? 'text-foreground font-medium' : 'text-foreground-tertiary'
              )}
            >
              {tab}
            </span>
          ))}
        </div>

        {/* Preview content */}
        <div className="p-4 space-y-2">
          {hasRealData ? (
            // Show real bottlenecks/tasks if available
            bottlenecksData && bottlenecksData.length > 0 ? (
              bottlenecksData.slice(0, 3).map((bottleneck, i) => (
                <div
                  key={bottleneck.id}
                  className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg"
                >
                  <Badge
                    variant={bottleneck.severity === 'CRITICAL' ? 'critical' : 'warning'}
                    size="sm"
                    pulse={i === 0}
                  >
                    {bottleneck.severity}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{bottleneck.title}</p>
                    <p className="text-xs text-foreground-tertiary">{bottleneck.description}</p>
                  </div>
                </div>
              ))
            ) : tasksData?.tasks && tasksData.tasks.length > 0 ? (
              tasksData.tasks.slice(0, 3).map((task, i) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg"
                >
                  <Badge
                    variant={task.priority === 'URGENT' ? 'critical' : 'warning'}
                    size="sm"
                  >
                    {task.status}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{task.title}</p>
                    <p className="text-xs text-foreground-tertiary">
                      {task.assignee?.name || 'Unassigned'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-foreground-tertiary text-sm">
                Your dashboard is ready. Items will appear once we sync your integrations.
              </div>
            )
          ) : (
            // Empty state - no integrations connected
            <div className="text-center py-6 space-y-2">
              <p className="text-foreground-secondary text-sm">
                No integrations connected yet
              </p>
              <p className="text-foreground-tertiary text-xs">
                Connect GitHub, Linear, or Slack in the dashboard to start tracking your team.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* CTA Section */}
      <div className="flex flex-col items-center gap-4 pt-4">
        <Button
          variant="primary"
          size="lg"
          onClick={handleOpenDashboard}
          loading={isRedirecting}
          disabled={isRedirecting}
        >
          {isRedirecting ? 'Opening dashboard...' : 'Open your dashboard'}
          {!isRedirecting && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="ml-2">
              <path
                d="M3 8H13M10 5L13 8L10 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </Button>

        {/* Signed in indicator */}
        {session?.user && (
          <p className="text-xs text-foreground-tertiary">
            Signed in as {session.user.email}
          </p>
        )}
      </div>
    </div>
  )
}
