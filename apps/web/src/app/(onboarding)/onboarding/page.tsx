'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Button } from '@nexflow/ui/button'
import { Input } from '@nexflow/ui/input'
import { trpc } from '@/lib/trpc'
import { CheckCircle2, Users, Link2, Bot, ArrowRight, Plus, X, Loader2, Check, LogOut, Lightbulb } from 'lucide-react'
import { Textarea } from '@nexflow/ui/textarea'
import { toast } from '@nexflow/ui/toast'

type Step = 'welcome' | 'team' | 'invite' | 'integrations' | 'project' | 'agents' | 'complete'

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
  const [projectContext, setProjectContext] = useState({
    buildingDescription: '',
    milestones: [{ name: '', targetDate: '' }],
    goals: [''],
    techStack: [''],
  })

  const createTeam = trpc.team.createTeam.useMutation()
  const completeOnboarding = trpc.onboarding.complete.useMutation()
  const sendInvites = trpc.invitations.sendBulk.useMutation()
  const saveProjectContext = trpc.onboarding.saveProjectContext.useMutation()
  const { data: integrations } = trpc.integrations.list.useQuery()

  const steps = [
    { key: 'welcome' as const, label: 'Welcome' },
    { key: 'team' as const, label: 'Teams' },
    { key: 'invite' as const, label: 'Invite' },
    { key: 'integrations' as const, label: 'Connect' },
    { key: 'project' as const, label: 'Project' },
    { key: 'agents' as const, label: 'Agents' },
    { key: 'complete' as const, label: 'Done' },
  ]

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep)

  // Helper to change step and persist to localStorage
  const goToStep = (step: Step) => {
    setCurrentStep(step)
    localStorage.setItem(ONBOARDING_STEP_KEY, step)
  }

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
    goToStep('invite')
  }

  const handleSendInvites = async () => {
    const validEmails = inviteEmails.filter((e) => e.trim() && e.includes('@'))

    if (validEmails.length === 0) {
      goToStep('integrations')
      return
    }

    setIsLoading(true)
    try {
      const result = await sendInvites.mutateAsync({ emails: validEmails })
      setInvitesSent(result.sent)
      if (result.sent > 0) {
        toast({ title: `Sent ${result.sent} invitation${result.sent > 1 ? 's' : ''}` })
      }
      goToStep('integrations')
    } catch (error: any) {
      console.error('Failed to send invites:', error)
      toast({ title: 'Failed to send invitations', description: error?.message, variant: 'destructive' })
      goToStep('integrations')
    } finally {
      setIsLoading(false)
    }
  }

  // Project context helpers
  const updateProjectDescription = (value: string) => {
    setProjectContext((prev) => ({ ...prev, buildingDescription: value }))
  }

  const addMilestone = () => {
    setProjectContext((prev) => ({
      ...prev,
      milestones: [...prev.milestones, { name: '', targetDate: '' }],
    }))
  }

  const updateMilestone = (index: number, field: 'name' | 'targetDate', value: string) => {
    setProjectContext((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }))
  }

  const removeMilestone = (index: number) => {
    if (projectContext.milestones.length > 1) {
      setProjectContext((prev) => ({
        ...prev,
        milestones: prev.milestones.filter((_, i) => i !== index),
      }))
    }
  }

  const addGoal = () => {
    setProjectContext((prev) => ({ ...prev, goals: [...prev.goals, ''] }))
  }

  const updateGoal = (index: number, value: string) => {
    setProjectContext((prev) => ({
      ...prev,
      goals: prev.goals.map((g, i) => (i === index ? value : g)),
    }))
  }

  const removeGoal = (index: number) => {
    if (projectContext.goals.length > 1) {
      setProjectContext((prev) => ({
        ...prev,
        goals: prev.goals.filter((_, i) => i !== index),
      }))
    }
  }

  const addTechStack = () => {
    setProjectContext((prev) => ({ ...prev, techStack: [...prev.techStack, ''] }))
  }

  const updateTechStack = (index: number, value: string) => {
    setProjectContext((prev) => ({
      ...prev,
      techStack: prev.techStack.map((t, i) => (i === index ? value : t)),
    }))
  }

  const removeTechStack = (index: number) => {
    if (projectContext.techStack.length > 1) {
      setProjectContext((prev) => ({
        ...prev,
        techStack: prev.techStack.filter((_, i) => i !== index),
      }))
    }
  }

  const handleSaveProjectContext = async () => {
    if (projectContext.buildingDescription.trim().length < 10) {
      toast({
        title: 'Please describe your project',
        description: 'Add at least a few sentences about what you\'re building.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      await saveProjectContext.mutateAsync({
        buildingDescription: projectContext.buildingDescription,
        milestones: projectContext.milestones.filter((m) => m.name.trim()),
        goals: projectContext.goals.filter((g) => g.trim()),
        techStack: projectContext.techStack.filter((t) => t.trim()),
      })
      toast({ title: 'Project context saved' })
      goToStep('agents')
    } catch (error: any) {
      console.error('Failed to save project context:', error)
      toast({
        title: 'Failed to save project context',
        description: error?.message,
        variant: 'destructive',
      })
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
                    ? 'bg-status-healthy text-white'
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
                  <div className="w-10 h-10 rounded-lg bg-status-critical-light flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-status-critical" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Detect bottlenecks</h3>
                    <p className="text-sm text-foreground-muted">Automatically identify stuck PRs, stale tasks, and blockers</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-background-secondary rounded-lg border border-border">
                  <div className="w-10 h-10 rounded-lg bg-status-healthy-light flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-status-healthy" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">AI-powered actions</h3>
                    <p className="text-sm text-foreground-muted">Smart nudges, task reassignment, and scope adjustments</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-background-secondary rounded-lg border border-border">
                  <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center flex-shrink-0">
                    <Link2 className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Connect your tools</h3>
                    <p className="text-sm text-foreground-muted">Sync with Linear, GitHub, Slack, and more</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => goToStep('team')}
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
                        className="text-foreground-muted hover:text-status-critical transition-colors"
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
                  onClick={() => goToStep('invite')}
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
                        className="px-3 text-foreground-muted hover:text-status-critical transition-colors"
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
                  onClick={() => goToStep('integrations')}
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
                  onClick={() => goToStep('project')}
                  className="flex-1 h-11 text-foreground-muted hover:text-foreground"
                >
                  Skip for now
                </Button>
                <Button
                  onClick={() => goToStep('project')}
                  className="flex-1 h-11 bg-foreground text-background hover:bg-foreground/90"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Project Context Step */}
          {currentStep === 'project' && (
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">What are you building?</h2>
              <p className="text-foreground-muted mb-6">
                Help our AI understand your project to provide better insights and recommendations.
              </p>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Describe your project
                </label>
                <Textarea
                  value={projectContext.buildingDescription}
                  onChange={(e) => updateProjectDescription(e.target.value)}
                  placeholder="We're building a SaaS platform for team collaboration. Our main goals are to improve async communication and reduce meeting overhead..."
                  className="h-24 bg-background-secondary border-border resize-none"
                />
              </div>

              {/* Milestones */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Key milestones <span className="text-foreground-muted font-normal">(optional)</span>
                </label>
                <div className="space-y-2">
                  {projectContext.milestones.map((milestone, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={milestone.name}
                        onChange={(e) => updateMilestone(index, 'name', e.target.value)}
                        placeholder="Beta launch"
                        className="flex-1 h-10 bg-background-secondary border-border"
                      />
                      <Input
                        type="date"
                        value={milestone.targetDate}
                        onChange={(e) => updateMilestone(index, 'targetDate', e.target.value)}
                        className="w-40 h-10 bg-background-secondary border-border"
                      />
                      {projectContext.milestones.length > 1 && (
                        <button
                          onClick={() => removeMilestone(index)}
                          className="px-2 text-foreground-muted hover:text-status-critical transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addMilestone}
                  className="mt-2 text-sm text-foreground-muted hover:text-foreground flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add milestone
                </button>
              </div>

              {/* Goals */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Project goals <span className="text-foreground-muted font-normal">(optional)</span>
                </label>
                <div className="space-y-2">
                  {projectContext.goals.map((goal, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={goal}
                        onChange={(e) => updateGoal(index, e.target.value)}
                        placeholder="Launch MVP by Q2"
                        className="flex-1 h-10 bg-background-secondary border-border"
                      />
                      {projectContext.goals.length > 1 && (
                        <button
                          onClick={() => removeGoal(index)}
                          className="px-2 text-foreground-muted hover:text-status-critical transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addGoal}
                  className="mt-2 text-sm text-foreground-muted hover:text-foreground flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add goal
                </button>
              </div>

              {/* Tech Stack */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tech stack <span className="text-foreground-muted font-normal">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {projectContext.techStack.map((tech, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 bg-background-secondary border border-border rounded-lg px-3 py-1.5"
                    >
                      <Input
                        value={tech}
                        onChange={(e) => updateTechStack(index, e.target.value)}
                        placeholder="React"
                        className="w-24 h-6 p-0 border-0 bg-transparent text-sm"
                      />
                      {projectContext.techStack.length > 1 && (
                        <button
                          onClick={() => removeTechStack(index)}
                          className="text-foreground-muted hover:text-status-critical transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addTechStack}
                    className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-border rounded-lg text-sm text-foreground-muted hover:text-foreground hover:border-foreground/30 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
              </div>

              <div className="p-4 bg-accent-light border border-border rounded-lg mb-6">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground-muted">
                    This context helps AI agents make smarter decisions about task priorities,
                    reassignments, and deadline predictions based on your project goals.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => goToStep('agents')}
                  className="flex-1 h-11 text-foreground-muted hover:text-foreground"
                >
                  Skip for now
                </Button>
                <Button
                  onClick={handleSaveProjectContext}
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
                onClick={() => goToStep('complete')}
                className="w-full h-11 bg-foreground text-background hover:bg-foreground/90"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === 'complete' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-status-healthy-light rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-status-healthy" />
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
      <div className="flex items-center gap-3 p-4 bg-background-secondary border border-status-healthy/30 rounded-lg">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm">{name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Check className="w-3 h-3 text-status-healthy" />
            <span className="text-xs font-medium text-status-healthy">Connected</span>
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
        <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
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
