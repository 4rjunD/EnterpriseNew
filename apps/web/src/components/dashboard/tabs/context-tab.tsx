'use client'

import { useState, useEffect } from 'react'
import { cn } from '@nexflow/ui/utils'
import { trpc } from '@/lib/trpc'
import { toast } from '@nexflow/ui/toast'
import {
  Building2,
  Users,
  Target,
  Code2,
  AlertTriangle,
  Save,
  Plus,
  X,
  Milestone,
  Calendar,
} from 'lucide-react'

interface Milestone {
  name: string
  description?: string
  targetDate: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  progress: number
}

function Section({ title, icon, children, description }: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  description?: string
}) {
  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#888]">{icon}</span>
        <h3 className="text-[14px] font-medium text-[#ededed]">{title}</h3>
      </div>
      {description && (
        <p className="text-[12px] text-[#555] mb-3">{description}</p>
      )}
      {children}
    </div>
  )
}

function TagInput({ value, onChange, placeholder }: {
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
}) {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()])
      }
      setInputValue('')
    }
  }

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1a1a1a] rounded text-[12px] text-[#888]"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="text-[#555] hover:text-[#ff4444]"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-[#111] border border-[#252525] rounded px-3 py-2 text-[13px] text-[#ededed] placeholder:text-[#555] focus:border-[#333] outline-none"
      />
    </div>
  )
}

function MilestoneCard({ milestone, onUpdate, onDelete }: {
  milestone: Milestone
  onUpdate: (updates: Partial<Milestone>) => void
  onDelete: () => void
}) {
  const statusColors = {
    NOT_STARTED: '#555',
    IN_PROGRESS: '#f5a623',
    COMPLETED: '#50e3c2',
  }

  return (
    <div className="p-3 bg-[#111] border border-[#1a1a1a] rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <input
          type="text"
          value={milestone.name}
          onChange={e => onUpdate({ name: e.target.value })}
          className="bg-transparent text-[13px] font-medium text-[#ededed] focus:outline-none w-full"
          placeholder="Milestone name"
        />
        <button onClick={onDelete} className="text-[#555] hover:text-[#ff4444] ml-2">
          <X className="w-4 h-4" />
        </button>
      </div>
      <input
        type="text"
        value={milestone.description || ''}
        onChange={e => onUpdate({ description: e.target.value })}
        className="bg-transparent text-[11px] text-[#888] focus:outline-none w-full mb-2"
        placeholder="Description (optional)"
      />
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={milestone.targetDate.split('T')[0]}
          onChange={e => onUpdate({ targetDate: new Date(e.target.value).toISOString() })}
          className="bg-[#0a0a0a] border border-[#252525] rounded px-2 py-1 text-[11px] text-[#888]"
        />
        <select
          value={milestone.status}
          onChange={e => onUpdate({ status: e.target.value as Milestone['status'] })}
          className="bg-[#0a0a0a] border border-[#252525] rounded px-2 py-1 text-[11px]"
          style={{ color: statusColors[milestone.status] }}
        >
          <option value="NOT_STARTED">Not Started</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <div className="flex-1 flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="100"
            value={milestone.progress}
            onChange={e => onUpdate({ progress: parseInt(e.target.value) })}
            className="flex-1 h-1 bg-[#252525] rounded appearance-none cursor-pointer"
          />
          <span className="text-[11px] font-mono text-[#555] w-8">{milestone.progress}%</span>
        </div>
      </div>
    </div>
  )
}

export function ContextTab() {
  const utils = trpc.useUtils()
  const { data: context, isLoading } = trpc.onboarding.getProjectContext.useQuery()

  const [buildingDescription, setBuildingDescription] = useState('')
  const [goals, setGoals] = useState<string[]>([])
  const [techStack, setTechStack] = useState<string[]>([])
  const [industry, setIndustry] = useState('')
  const [companyStage, setCompanyStage] = useState('')
  const [teamDistribution, setTeamDistribution] = useState('')
  const [developmentMethod, setDevelopmentMethod] = useState('')
  const [primaryChallenges, setPrimaryChallenges] = useState<string[]>([])
  const [riskTolerance, setRiskTolerance] = useState('')
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Populate form when data loads
  useEffect(() => {
    if (context) {
      setBuildingDescription(context.buildingDescription || '')
      setGoals(context.goals || [])
      setTechStack(context.techStack || [])
      setIndustry(context.industry || '')
      setCompanyStage(context.companyStage || '')
      setTeamDistribution(context.teamDistribution || '')
      setDevelopmentMethod(context.developmentMethod || '')
      setPrimaryChallenges(context.primaryChallenges || [])
      setRiskTolerance(context.riskTolerance || '')
      setMilestones((context.milestones as Milestone[]) || [])
    }
  }, [context])

  const saveProjectContext = trpc.onboarding.saveProjectContext.useMutation({
    onSuccess: () => {
      setHasChanges(false)
      toast({ title: 'Project context saved' })
      utils.onboarding.getProjectContext.invalidate()
    },
    onError: (error) => {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' })
    },
  })

  const saveCompanyContext = trpc.onboarding.saveCompanyContext.useMutation({
    onSuccess: () => {
      toast({ title: 'Company context saved' })
    },
    onError: (error) => {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' })
    },
  })

  const handleSave = async () => {
    // Save project context
    await saveProjectContext.mutateAsync({
      buildingDescription: buildingDescription || 'Software project',
      goals,
      techStack,
      milestones: milestones.map(m => ({
        name: m.name,
        targetDate: m.targetDate,
        description: m.description,
      })),
    })

    // Save company context
    await saveCompanyContext.mutateAsync({
      industry: industry || undefined,
      companyStage: companyStage || undefined,
      teamDistribution: teamDistribution || undefined,
      developmentMethod: developmentMethod || undefined,
      primaryChallenges,
      riskTolerance: riskTolerance || undefined,
    })
  }

  const addMilestone = () => {
    setMilestones([...milestones, {
      name: '',
      description: '',
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'NOT_STARTED',
      progress: 0,
    }])
    setHasChanges(true)
  }

  const updateMilestone = (index: number, updates: Partial<Milestone>) => {
    const newMilestones = [...milestones]
    newMilestones[index] = { ...newMilestones[index], ...updates }
    setMilestones(newMilestones)
    setHasChanges(true)
  }

  const deleteMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index))
    setHasChanges(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-[#1a1a1a] rounded w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-40 bg-[#1a1a1a] rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold text-[#ededed] tracking-[-0.5px]">Project Context</h2>
          <p className="text-[13px] text-[#888] mt-1">
            Help our AI understand your project for better predictions and recommendations
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveProjectContext.isLoading}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium transition-colors',
            'bg-[#ededed] text-[#000] hover:bg-white',
            saveProjectContext.isLoading && 'opacity-50 cursor-wait'
          )}
        >
          <Save className="w-4 h-4" />
          {saveProjectContext.isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* What you're building */}
        <Section
          title="What You're Building"
          icon={<Target className="w-4 h-4" />}
          description="Describe your product or project in a few sentences"
        >
          <textarea
            value={buildingDescription}
            onChange={e => { setBuildingDescription(e.target.value); setHasChanges(true) }}
            placeholder="We're building an AI-powered engineering management platform that detects bottlenecks and predicts delivery risks..."
            className="w-full h-24 bg-[#111] border border-[#252525] rounded px-3 py-2 text-[13px] text-[#ededed] placeholder:text-[#555] focus:border-[#333] outline-none resize-none"
          />
        </Section>

        {/* Company Info */}
        <Section
          title="Company Profile"
          icon={<Building2 className="w-4 h-4" />}
          description="Help us tailor predictions to your company stage"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#555] uppercase tracking-wide">Industry</label>
              <select
                value={industry}
                onChange={e => { setIndustry(e.target.value); setHasChanges(true) }}
                className="w-full mt-1 bg-[#111] border border-[#252525] rounded px-2 py-1.5 text-[12px] text-[#ededed]"
              >
                <option value="">Select...</option>
                <option value="saas">SaaS</option>
                <option value="fintech">Fintech</option>
                <option value="healthtech">Healthtech</option>
                <option value="ecommerce">E-commerce</option>
                <option value="devtools">Developer Tools</option>
                <option value="ai_ml">AI/ML</option>
                <option value="consumer">Consumer</option>
                <option value="enterprise">Enterprise</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#555] uppercase tracking-wide">Stage</label>
              <select
                value={companyStage}
                onChange={e => { setCompanyStage(e.target.value); setHasChanges(true) }}
                className="w-full mt-1 bg-[#111] border border-[#252525] rounded px-2 py-1.5 text-[12px] text-[#ededed]"
              >
                <option value="">Select...</option>
                <option value="pre_seed">Pre-seed</option>
                <option value="seed">Seed</option>
                <option value="series_a">Series A</option>
                <option value="series_b">Series B+</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#555] uppercase tracking-wide">Team Distribution</label>
              <select
                value={teamDistribution}
                onChange={e => { setTeamDistribution(e.target.value); setHasChanges(true) }}
                className="w-full mt-1 bg-[#111] border border-[#252525] rounded px-2 py-1.5 text-[12px] text-[#ededed]"
              >
                <option value="">Select...</option>
                <option value="colocated">Co-located</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Fully Remote</option>
                <option value="distributed">Distributed (multi-timezone)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#555] uppercase tracking-wide">Methodology</label>
              <select
                value={developmentMethod}
                onChange={e => { setDevelopmentMethod(e.target.value); setHasChanges(true) }}
                className="w-full mt-1 bg-[#111] border border-[#252525] rounded px-2 py-1.5 text-[12px] text-[#ededed]"
              >
                <option value="">Select...</option>
                <option value="scrum">Scrum</option>
                <option value="kanban">Kanban</option>
                <option value="scrumban">Scrumban</option>
                <option value="waterfall">Waterfall</option>
                <option value="none">No formal process</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Goals */}
        <Section
          title="Goals"
          icon={<Target className="w-4 h-4" />}
          description="What are you trying to achieve? (Press Enter to add)"
        >
          <TagInput
            value={goals}
            onChange={(v) => { setGoals(v); setHasChanges(true) }}
            placeholder="e.g., Launch MVP by Q2, Reduce bug rate by 50%"
          />
        </Section>

        {/* Tech Stack */}
        <Section
          title="Tech Stack"
          icon={<Code2 className="w-4 h-4" />}
          description="Technologies you're using (Press Enter to add)"
        >
          <TagInput
            value={techStack}
            onChange={(v) => { setTechStack(v); setHasChanges(true) }}
            placeholder="e.g., React, Node.js, PostgreSQL, AWS"
          />
        </Section>

        {/* Challenges */}
        <Section
          title="Primary Challenges"
          icon={<AlertTriangle className="w-4 h-4" />}
          description="What challenges is your team facing? (Press Enter to add)"
        >
          <TagInput
            value={primaryChallenges}
            onChange={(v) => { setPrimaryChallenges(v); setHasChanges(true) }}
            placeholder="e.g., Scaling issues, Tech debt, Hiring"
          />
        </Section>

        {/* Risk Tolerance */}
        <Section
          title="Risk Tolerance"
          icon={<AlertTriangle className="w-4 h-4" />}
          description="How aggressive should our predictions be?"
        >
          <div className="flex gap-2">
            {['conservative', 'moderate', 'aggressive'].map(level => (
              <button
                key={level}
                onClick={() => { setRiskTolerance(level); setHasChanges(true) }}
                className={cn(
                  'flex-1 py-2 px-3 rounded text-[12px] font-medium capitalize transition-colors',
                  riskTolerance === level
                    ? 'bg-[#ededed] text-[#000]'
                    : 'bg-[#111] text-[#888] hover:bg-[#1a1a1a]'
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </Section>
      </div>

      {/* Milestones */}
      <Section
        title="Milestones"
        icon={<Milestone className="w-4 h-4" />}
        description="Track major deliverables and deadlines"
      >
        <div className="space-y-3">
          {milestones.map((milestone, index) => (
            <MilestoneCard
              key={index}
              milestone={milestone}
              onUpdate={(updates) => updateMilestone(index, updates)}
              onDelete={() => deleteMilestone(index)}
            />
          ))}
          <button
            onClick={addMilestone}
            className="w-full py-2 border border-dashed border-[#333] rounded-lg text-[12px] text-[#555] hover:text-[#888] hover:border-[#555] transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Milestone
          </button>
        </div>
      </Section>

      {/* AI Analysis Tip */}
      <div className="bg-[#f5a623]/10 border border-[#f5a623]/30 rounded-lg p-4">
        <p className="text-[13px] text-[#f5a623]">
          <strong>Tip:</strong> The more context you provide, the better our AI can predict risks and suggest improvements.
          After updating, click the <strong>Refresh</strong> button in the header to regenerate AI insights.
        </p>
      </div>
    </div>
  )
}
