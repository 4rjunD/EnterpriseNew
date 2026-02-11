'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@nexflow/ui/button'
import { Input } from '@nexflow/ui/input'
import { trpc } from '@/lib/trpc'
import { CheckCircle2, Users, Link2, Bot, ArrowRight, Plus, X, Loader2 } from 'lucide-react'

type Step = 'welcome' | 'team' | 'invite' | 'integrations' | 'agents' | 'complete'

const TEAM_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('welcome')
  const [teams, setTeams] = useState<{ name: string; color: string }[]>([])
  const [newTeamName, setNewTeamName] = useState('')
  const [inviteEmails, setInviteEmails] = useState<string[]>([''])
  const [isLoading, setIsLoading] = useState(false)

  const utils = trpc.useUtils()
  const createTeam = trpc.team.createTeam.useMutation()
  const completeOnboarding = trpc.onboarding.complete.useMutation()
  const sendInvites = trpc.invitations.sendBulk.useMutation()

  const steps: { key: Step; title: string; icon: React.ReactNode }[] = [
    { key: 'welcome', title: 'Welcome', icon: <CheckCircle2 className="w-5 h-5" /> },
    { key: 'team', title: 'Create Teams', icon: <Users className="w-5 h-5" /> },
    { key: 'invite', title: 'Invite Members', icon: <Users className="w-5 h-5" /> },
    { key: 'integrations', title: 'Connect Tools', icon: <Link2 className="w-5 h-5" /> },
    { key: 'agents', title: 'AI Agents', icon: <Bot className="w-5 h-5" /> },
    { key: 'complete', title: 'Complete', icon: <CheckCircle2 className="w-5 h-5" /> },
  ]

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep)

  const addTeam = () => {
    if (newTeamName.trim()) {
      const colorIndex = teams.length % TEAM_COLORS.length
      setTeams([...teams, { name: newTeamName.trim(), color: TEAM_COLORS[colorIndex] }])
      setNewTeamName('')
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
    setIsLoading(true)
    try {
      for (const team of teams) {
        await createTeam.mutateAsync({ name: team.name, color: team.color })
      }
      setCurrentStep('invite')
    } catch (error) {
      console.error('Failed to create teams:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendInvites = async () => {
    setIsLoading(true)
    try {
      const validEmails = inviteEmails.filter((e) => e.trim() && e.includes('@'))
      if (validEmails.length > 0) {
        await sendInvites.mutateAsync({ emails: validEmails })
      }
      setCurrentStep('integrations')
    } catch (error) {
      console.error('Failed to send invites:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      await completeOnboarding.mutateAsync()
      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div
                key={step.key}
                className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    index <= currentStepIndex
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {step.icon}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-colors ${
                      index < currentStepIndex ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-8">
          {/* Welcome Step */}
          {currentStep === 'welcome' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">N</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">Welcome to NexFlow</h1>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                Let&apos;s get your workspace set up. This will only take a few minutes.
              </p>
              <Button
                onClick={() => setCurrentStep('team')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium"
              >
                Get Started <ArrowRight className="w-4 h-4 ml-2 inline" />
              </Button>
            </div>
          )}

          {/* Create Teams Step */}
          {currentStep === 'team' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Create Your Teams</h2>
              <p className="text-slate-400 mb-6">
                Organize your workspace by creating teams (e.g., Frontend, Backend, DevOps)
              </p>

              <div className="space-y-3 mb-6">
                {teams.map((team, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 bg-slate-700/50 rounded-lg px-4 py-3"
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="text-white flex-1">{team.name}</span>
                    <button
                      onClick={() => removeTeam(index)}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mb-6">
                <Input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Team name..."
                  className="flex-1 bg-slate-700 border-slate-600 text-white"
                  onKeyDown={(e) => e.key === 'Enter' && addTeam()}
                />
                <Button
                  onClick={addTeam}
                  variant="outline"
                  className="border-slate-600 text-white hover:bg-slate-700"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep('invite')}
                  className="text-slate-400 hover:text-white"
                >
                  Skip for now
                </Button>
                <Button
                  onClick={handleCreateTeams}
                  disabled={teams.length === 0 || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Continue <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Invite Members Step */}
          {currentStep === 'invite' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Invite Your Team</h2>
              <p className="text-slate-400 mb-6">
                Add team members by email. They&apos;ll receive an invitation to join.
              </p>

              <div className="space-y-3 mb-6">
                {inviteEmails.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmail(index, e.target.value)}
                      placeholder="colleague@company.com"
                      className="flex-1 bg-slate-700 border-slate-600 text-white"
                    />
                    {inviteEmails.length > 1 && (
                      <button
                        onClick={() => removeEmail(index)}
                        className="text-slate-400 hover:text-red-400 px-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                onClick={addEmailField}
                variant="outline"
                className="w-full mb-6 border-slate-600 border-dashed text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <Plus className="w-4 h-4 mr-2" /> Add another email
              </Button>

              <div className="flex justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep('integrations')}
                  className="text-slate-400 hover:text-white"
                >
                  Skip for now
                </Button>
                <Button
                  onClick={handleSendInvites}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Send Invites <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Integrations Step */}
          {currentStep === 'integrations' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Connect Your Tools</h2>
              <p className="text-slate-400 mb-6">
                Connect your project management and code tools to enable AI-powered insights.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <IntegrationCard
                  name="Linear"
                  description="Sync issues and projects"
                  icon="L"
                  color="#5E6AD2"
                  href="/api/integrations/linear/authorize"
                />
                <IntegrationCard
                  name="GitHub"
                  description="Track pull requests"
                  icon="G"
                  color="#24292F"
                  href="/api/integrations/github/authorize"
                />
                <IntegrationCard
                  name="Slack"
                  description="Team notifications"
                  icon="S"
                  color="#4A154B"
                  href="/api/integrations/slack/authorize"
                />
                <IntegrationCard
                  name="Discord"
                  description="Team notifications"
                  icon="D"
                  color="#5865F2"
                  href="/api/integrations/discord/authorize"
                />
              </div>

              <div className="flex justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep('agents')}
                  className="text-slate-400 hover:text-white"
                >
                  Skip for now
                </Button>
                <Button
                  onClick={() => setCurrentStep('agents')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Agents Step */}
          {currentStep === 'agents' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">AI Agents</h2>
              <p className="text-slate-400 mb-6">
                NexFlow uses AI agents to help manage your team automatically.
              </p>

              <div className="space-y-4 mb-6">
                <AgentCard
                  name="Task Reassigner"
                  description="Automatically suggests reassigning overdue or blocked tasks to available team members"
                  icon="T"
                />
                <AgentCard
                  name="Nudge Sender"
                  description="Sends gentle reminders for stale tasks and PRs awaiting review"
                  icon="N"
                />
                <AgentCard
                  name="Scope Adjuster"
                  description="Identifies scope creep and suggests adjustments to keep projects on track"
                  icon="S"
                />
              </div>

              <p className="text-sm text-slate-500 mb-6">
                You can configure these agents in Settings after setup.
              </p>

              <div className="flex justify-end">
                <Button
                  onClick={() => setCurrentStep('complete')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === 'complete' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">You&apos;re All Set!</h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                Your workspace is ready. Connect integrations and run your first AI analysis to get started.
              </p>
              <Button
                onClick={handleComplete}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Go to Dashboard</>
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
}: {
  name: string
  description: string
  icon: string
  color: string
  href: string
}) {
  return (
    <a
      href={href}
      className="block bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-colors border border-slate-600 hover:border-slate-500"
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <span className="text-white font-medium">{name}</span>
      </div>
      <p className="text-sm text-slate-400">{description}</p>
    </a>
  )
}

function AgentCard({
  name,
  description,
  icon,
}: {
  name: string
  description: string
  icon: string
}) {
  return (
    <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
          {icon}
        </div>
        <span className="text-white font-medium">{name}</span>
      </div>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  )
}
