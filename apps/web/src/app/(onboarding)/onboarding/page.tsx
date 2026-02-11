'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Button } from '@nexflow/ui/button'
import { Input } from '@nexflow/ui/input'
import { trpc } from '@/lib/trpc'
import { CheckCircle2, Users, Link2, Bot, ArrowRight, Plus, X, Loader2, Check, LogOut } from 'lucide-react'
import { toast } from '@nexflow/ui/toast'

type Step = 'welcome' | 'team' | 'invite' | 'integrations' | 'agents' | 'complete'

const ONBOARDING_STEP_KEY = 'nexflow_onboarding_step'

const TEAM_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
]

const TEAM_SUGGESTIONS = [
  { name: 'Engineering', color: '#3B82F6' },
  { name: 'Product', color: '#10B981' },
  { name: 'Design', color: '#F59E0B' },
  { name: 'Operations', color: '#8B5CF6' },
]

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState<Step>('welcome')
  const [teams, setTeams] = useState<{ name: string; color: string }[]>([])
  const [newTeamName, setNewTeamName] = useState('')
  const [inviteEmails, setInviteEmails] = useState<string[]>([''])
  const [isLoading, setIsLoading] = useState(false)
  const [invitesSent, setInvitesSent] = useState(0)

  const createTeam = trpc.team.createTeam.useMutation()
  const completeOnboarding = trpc.onboarding.complete.useMutation()
  const sendInvites = trpc.invitations.sendBulk.useMutation()
  const { data: integrations } = trpc.integrations.list.useQuery()

  const steps = [
    { key: 'welcome' as const, label: 'Welcome' },
    { key: 'team' as const, label: 'Teams' },
    { key: 'invite' as const, label: 'Invite' },
    { key: 'integrations' as const, label: 'Connect' },
    { key: 'agents' as const, label: 'Agents' },
    { key: 'complete' as const, label: 'Done' },
  ]

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep)

  // Handle OAuth redirects and restore step from localStorage
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success) {
      const name = success.replace('_connected', '').replace('_', ' ')
      toast({ title: `${name.charAt(0).toUpperCase() + name.slice(1)} connected!` })
      setCurrentStep('integrations')
      localStorage.setItem(ONBOARDING_STEP_KEY, 'integrations')
      window.history.replaceState({}, '', '/onboarding')
      return
    }

    if (error) {
      toast({ title: 'Connection failed', description: 'Please try again.', variant: 'destructive' })
      setCurrentStep('integrations')
      localStorage.setItem(ONBOARDING_STEP_KEY, 'integrations')
      window.history.replaceState({}, '', '/onboarding')
      return
    }

    const savedStep = localStorage.getItem(ONBOARDING_STEP_KEY) as Step | null
    if (savedStep && steps.some(s => s.key === savedStep)) {
      setCurrentStep(savedStep)
    }
  }, [searchParams])

  // Persist current step to localStorage
  useEffect(() => {
    localStorage.setItem(ONBOARDING_STEP_KEY, currentStep)
  }, [currentStep])

  // Helper to check if an integration is connected
  const isIntegrationConnected = (type: string) => {
    return integrations?.connected?.some(
      (i) => i.type.toUpperCase() === type.toUpperCase()
    ) ?? false
  }

  const addTeam = () => {
    if (newTeamName.trim() && !teams.find(t => t.name.toLowerCase() === newTeamName.trim().toLowerCase())) {
      const colorIndex = teams.length % TEAM_COLORS.length
      setTeams([...teams, { name: newTeamName.trim(), color: TEAM_COLORS[colorIndex] }])
      setNewTeamName('')
    }
  }

  const addSuggestedTeam = (suggestion: { name: string; color: string }) => {
    if (!teams.find(t => t.name.toLowerCase() === suggestion.name.toLowerCase())) {
      setTeams([...teams, suggestion])
    }
  }

  const removeTeam = (index: number) => {
    setTeams(teams.filter((_, i) => i !== index))
  }

  const addEmailField = () => {
    setInviteEmails([...inviteEmails, ''])
  }

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...inviteEmails]
    newEmails[index] = value
    setInviteEmails(newEmails)
  }

  const removeEmail = (index: number) => {
    if (inviteEmails.length > 1) {
      setInviteEmails(inviteEmails.filter((_, i) => i !== index))
    }
  }

  const handleCreateTeams = async () => {
    // Always move forward - teams can be created later from dashboard
    // Try to create teams in background but don't block
    if (teams.length > 0) {
      // Fire and forget - don't wait for this
      Promise.all(
        teams.map((team) =>
          createTeam.mutateAsync({ name: team.name, color: team.color }).catch(() => {})
        )
      ).then(() => {
        // Teams created successfully (or failed silently)
      })
    }
    setCurrentStep('invite')
  }

  const handleSendInvites = async () => {
    const validEmails = inviteEmails.filter((e) => e.trim() && e.includes('@'))

    if (validEmails.length === 0) {
      setCurrentStep('integrations')
      return
    }

    setIsLoading(true)
    try {
      const result = await sendInvites.mutateAsync({ emails: validEmails })
      setInvitesSent(result.sent)
      if (result.sent > 0) {
        toast({ title: `Sent ${result.sent} invitation${result.sent > 1 ? 's' : ''}` })
      }
      setCurrentStep('integrations')
    } catch (error: any) {
      console.error('Failed to send invites:', error)
      toast({ title: 'Failed to send invitations', description: error?.message, variant: 'destructive' })
      setCurrentStep('integrations')
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      await completeOnboarding.mutateAsync()
      localStorage.removeItem(ONBOARDING_STEP_KEY)
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Failed to complete onboarding:', error)
      // Still redirect to dashboard even if marking complete failed
      // The user can still use the app
      localStorage.removeItem(ONBOARDING_STEP_KEY)
      router.push('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left sidebar - Progress */}
      <div className="hidden lg:flex w-80 bg-background-secondary border-r border-border flex-col p-8">
        <div className="mb-12">
          <h1 className="text-xl font-semibold text-foreground">NexFlow</h1>
          <p className="text-sm text-foreground-muted mt-1">Setup your workspace</p>
        </div>

        <nav className="space-y-1">
          {steps.map((step, index) => (
            <div
              key={step.key}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                index === currentStepIndex
                  ? 'bg-background text-foreground'
                  : index < currentStepIndex
                  ? 'text-foreground-muted'
                  : 'text-foreground-muted/50'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  index < currentStepIndex
                    ? 'bg-emerald-500 text-white'
                    : index === currentStepIndex
                    ? 'bg-foreground text-background'
                    : 'bg-border text-foreground-muted'
                }`}
              >
                {index < currentStepIndex ? <Check className="w-3.5 h-3.5" /> : index + 1}
              </div>
              <span className="text-sm font-medium">{step.label}</span>
            </div>
          ))}
        </nav>

        {/* Sign out link */}
        <div className="mt-auto pt-8">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-lg">
          {/* Mobile progress */}
          <div className="lg:hidden mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-foreground-muted">
                Step {currentStepIndex + 1} of {steps.length}
              </span>
              <span className="text-sm font-medium text-foreground">{steps[currentStepIndex].label}</span>
            </div>
            <div className="h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground transition-all duration-300"
                style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Welcome Step */}
          {currentStep === 'welcome' && (
            <div>
              <h2 className="text-3xl font-semibold text-foreground mb-3">
                Welcome to NexFlow
              </h2>
              <p className="text-foreground-muted mb-8 text-lg">
                AI-powered engineering management that helps your team ship faster.
                Let&apos;s get your workspace configured in a few quick steps.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4 p-4 bg-background-secondary rounded-lg border border-border">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Detect bottlenecks</h3>
                    <p className="text-sm text-foreground-muted">Automatically identify stuck PRs, stale tasks, and blockers</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-background-secondary rounded-lg border border-border">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">AI-powered actions</h3>
                    <p className="text-sm text-foreground-muted">Smart nudges, task reassignment, and scope adjustments</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-background-secondary rounded-lg border border-border">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Link2 className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Connect your tools</h3>
                    <p className="text-sm text-foreground-muted">Sync with Linear, GitHub, Slack, and more</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setCurrentStep('team')}
                className="w-full h-11 bg-foreground text-background hover:bg-foreground/90"
              >
                Get started <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Create Teams Step */}
          {currentStep === 'team' && (
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Create your teams</h2>
              <p className="text-foreground-muted mb-6">
                Organize your workspace by creating teams. You can add more later.
              </p>

              {/* Suggestions */}
              {teams.length === 0 && (
                <div className="mb-6">
                  <p className="text-sm text-foreground-muted mb-3">Quick add:</p>
                  <div className="flex flex-wrap gap-2">
                    {TEAM_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion.name}
                        onClick={() => addSuggestedTeam(suggestion)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-background-secondary border border-border rounded-full text-sm text-foreground hover:border-foreground/30 transition-colors"
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: suggestion.color }} />
                        {suggestion.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Added teams */}
              {teams.length > 0 && (
                <div className="space-y-2 mb-6">
                  {teams.map((team, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 bg-background-secondary border border-border rounded-lg px-4 py-3"
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                      <span className="text-foreground flex-1">{team.name}</span>
                      <button
                        onClick={() => removeTeam(index)}
                        className="text-foreground-muted hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add team input */}
              <div className="flex gap-2 mb-8">
                <Input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Enter team name..."
                  className="flex-1 h-11 bg-background-secondary border-border"
                  onKeyDown={(e) => e.key === 'Enter' && addTeam()}
                />
                <Button
                  onClick={addTeam}
                  variant="outline"
                  className="h-11 px-4 border-border hover:bg-background-secondary"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep('invite')}
                  className="flex-1 h-11 text-foreground-muted hover:text-foreground"
                >
                  Skip for now
                </Button>
                <Button
                  onClick={handleCreateTeams}
                  disabled={isLoading}
                  className="flex-1 h-11 bg-foreground text-background hover:bg-foreground/90"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Invite Members Step */}
          {currentStep === 'invite' && (
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Invite your team</h2>
              <p className="text-foreground-muted mb-6">
                Add team members by email. They&apos;ll receive an invitation to join your workspace.
              </p>

              <div className="space-y-3 mb-4">
                {inviteEmails.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmail(index, e.target.value)}
                      placeholder="colleague@company.com"
                      className="flex-1 h-11 bg-background-secondary border-border"
                    />
                    {inviteEmails.length > 1 && (
                      <button
                        onClick={() => removeEmail(index)}
                        className="px-3 text-foreground-muted hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addEmailField}
                className="w-full mb-8 py-3 border border-dashed border-border rounded-lg text-sm text-foreground-muted hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add another
              </button>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep('integrations')}
                  className="flex-1 h-11 text-foreground-muted hover:text-foreground"
                >
                  Skip for now
                </Button>
                <Button
                  onClick={handleSendInvites}
                  disabled={isLoading}
                  className="flex-1 h-11 bg-foreground text-background hover:bg-foreground/90"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Send invites <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Integrations Step */}
          {currentStep === 'integrations' && (
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Connect your tools</h2>
              <p className="text-foreground-muted mb-6">
                Connect your project management and development tools to enable AI-powered insights.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-8">
                <IntegrationCard
                  name="Linear"
                  description="Issue tracking"
                  icon="L"
                  color="#5E6AD2"
                  href="/api/integrations/linear/authorize"
                  connected={isIntegrationConnected('LINEAR')}
                />
                <IntegrationCard
                  name="GitHub"
                  description="Code & PRs"
                  icon="G"
                  color="#24292F"
                  href="/api/integrations/github/authorize"
                  connected={isIntegrationConnected('GITHUB')}
                />
                <IntegrationCard
                  name="Slack"
                  description="Notifications"
                  icon="S"
                  color="#4A154B"
                  href="/api/integrations/slack/authorize"
                  connected={isIntegrationConnected('SLACK')}
                />
                <IntegrationCard
                  name="Discord"
                  description="Notifications"
                  icon="D"
                  color="#5865F2"
                  href="/api/integrations/discord/authorize"
                  connected={isIntegrationConnected('DISCORD')}
                />
              </div>

              <p className="text-sm text-foreground-muted mb-6 text-center">
                You can connect more integrations from Settings later.
              </p>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep('agents')}
                  className="flex-1 h-11 text-foreground-muted hover:text-foreground"
                >
                  Skip for now
                </Button>
                <Button
                  onClick={() => setCurrentStep('agents')}
                  className="flex-1 h-11 bg-foreground text-background hover:bg-foreground/90"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Agents Step */}
          {currentStep === 'agents' && (
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">AI Agents</h2>
              <p className="text-foreground-muted mb-6">
                NexFlow includes AI agents that help manage your engineering workflow automatically.
              </p>

              <div className="space-y-3 mb-8">
                <AgentCard
                  name="Task Reassigner"
                  description="Suggests reassigning overdue or blocked tasks to available team members based on workload and skills."
                />
                <AgentCard
                  name="Nudge Sender"
                  description="Sends gentle reminders for stale tasks and PRs awaiting review, respecting quiet hours."
                />
                <AgentCard
                  name="Scope Adjuster"
                  description="Identifies scope creep and suggests adjustments to keep projects on track for deadlines."
                />
              </div>

              <p className="text-sm text-foreground-muted mb-6 text-center">
                Agents are disabled by default. Enable them in Settings when you&apos;re ready.
              </p>

              <Button
                onClick={() => setCurrentStep('complete')}
                className="w-full h-11 bg-foreground text-background hover:bg-foreground/90"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === 'complete' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">You&apos;re all set</h2>
              <p className="text-foreground-muted mb-8">
                Your workspace is ready. Connect your integrations and run your first analysis to start detecting bottlenecks.
              </p>

              {invitesSent > 0 && (
                <p className="text-sm text-foreground-muted mb-6">
                  {invitesSent} invitation{invitesSent > 1 ? 's' : ''} sent to your team.
                </p>
              )}

              <Button
                onClick={handleComplete}
                disabled={isLoading}
                className="w-full h-11 bg-foreground text-background hover:bg-foreground/90"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Go to Dashboard'
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function IntegrationCard({
  name,
  description,
  icon,
  color,
  href,
  connected,
}: {
  name: string
  description: string
  icon: string
  color: string
  href: string
  connected: boolean
}) {
  if (connected) {
    return (
      <div className="flex items-center gap-3 p-4 bg-background-secondary border border-emerald-500/30 rounded-lg">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm">{name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Check className="w-3 h-3 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-500">Connected</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <a
      href={href}
      className="flex items-center gap-3 p-4 bg-background-secondary border border-border rounded-lg hover:border-foreground/20 transition-colors"
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
        style={{ backgroundColor: color }}
      >
        {icon}
      </div>
      <div>
        <p className="font-medium text-foreground text-sm">{name}</p>
        <p className="text-xs text-foreground-muted">{description}</p>
      </div>
    </a>
  )
}

function AgentCard({
  name,
  description,
}: {
  name: string
  description: string
}) {
  return (
    <div className="p-4 bg-background-secondary border border-border rounded-lg">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <span className="font-medium text-foreground text-sm">{name}</span>
      </div>
      <p className="text-sm text-foreground-muted pl-11">{description}</p>
    </div>
  )
}

function OnboardingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-lg p-8">
        <div className="h-8 w-48 bg-background-secondary rounded animate-pulse mb-4" />
        <div className="h-4 w-72 bg-background-secondary rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-background-secondary rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingContent />
    </Suspense>
  )
}
