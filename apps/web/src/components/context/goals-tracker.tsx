'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@nexflow/ui/button'
import { toast } from '@nexflow/ui/toast'
import { cn } from '@nexflow/ui/utils'
import { Plus, X, Loader2, Code, Target } from 'lucide-react'

interface GoalsTrackerProps {
  goals: string[]
  techStack: string[]
}

export function GoalsTracker({ goals, techStack }: GoalsTrackerProps) {
  const [isEditingGoals, setIsEditingGoals] = useState(false)
  const [isEditingTech, setIsEditingTech] = useState(false)
  const [localGoals, setLocalGoals] = useState(goals)
  const [localTech, setLocalTech] = useState(techStack)
  const [newGoal, setNewGoal] = useState('')
  const [newTech, setNewTech] = useState('')

  const utils = trpc.useUtils()
  const { data: context } = trpc.context.get.useQuery()

  const upsertMutation = trpc.context.upsert.useMutation({
    onSuccess: () => {
      toast({ title: 'Updated successfully' })
      utils.context.invalidate()
      setIsEditingGoals(false)
      setIsEditingTech(false)
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const handleAddGoal = () => {
    if (!newGoal.trim()) return
    const updated = [...localGoals, newGoal.trim()]
    setLocalGoals(updated)
    setNewGoal('')

    if (context) {
      upsertMutation.mutate({
        buildingDescription: context.buildingDescription,
        goals: updated,
        techStack: localTech,
      })
    }
  }

  const handleRemoveGoal = (index: number) => {
    const updated = localGoals.filter((_, i) => i !== index)
    setLocalGoals(updated)

    if (context) {
      upsertMutation.mutate({
        buildingDescription: context.buildingDescription,
        goals: updated,
        techStack: localTech,
      })
    }
  }

  const handleAddTech = () => {
    if (!newTech.trim()) return
    const updated = [...localTech, newTech.trim()]
    setLocalTech(updated)
    setNewTech('')

    if (context) {
      upsertMutation.mutate({
        buildingDescription: context.buildingDescription,
        goals: localGoals,
        techStack: updated,
      })
    }
  }

  const handleRemoveTech = (index: number) => {
    const updated = localTech.filter((_, i) => i !== index)
    setLocalTech(updated)

    if (context) {
      upsertMutation.mutate({
        buildingDescription: context.buildingDescription,
        goals: localGoals,
        techStack: updated,
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Goals Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-purple-400" />
          <h4 className="text-sm font-medium text-foreground">Goals</h4>
        </div>

        {localGoals.length === 0 && !isEditingGoals ? (
          <div className="text-center py-4">
            <p className="text-sm text-foreground-muted mb-2">No goals defined</p>
            <Button variant="outline" size="sm" onClick={() => setIsEditingGoals(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Goal
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {localGoals.map((goal, idx) => (
              <div
                key={idx}
                className="group flex items-center justify-between gap-2 p-2 rounded-md bg-background-secondary/50"
              >
                <span className="text-sm text-foreground">{goal}</span>
                <button
                  onClick={() => handleRemoveGoal(idx)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-red-400 transition-opacity"
                  disabled={upsertMutation.isLoading}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Add new goal */}
            {isEditingGoals ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New goal..."
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                  className="flex-1 px-2 py-1 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleAddGoal}
                  disabled={upsertMutation.isLoading || !newGoal.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {upsertMutation.isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingGoals(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingGoals(true)}
                className="w-full text-foreground-muted hover:text-foreground"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Goal
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tech Stack Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Code className="w-4 h-4 text-blue-400" />
          <h4 className="text-sm font-medium text-foreground">Tech Stack</h4>
        </div>

        {localTech.length === 0 && !isEditingTech ? (
          <div className="text-center py-4">
            <p className="text-sm text-foreground-muted mb-2">No tech stack defined</p>
            <Button variant="outline" size="sm" onClick={() => setIsEditingTech(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Technology
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {localTech.map((tech, idx) => (
                <div
                  key={idx}
                  className="group flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs"
                >
                  <span>{tech}</span>
                  <button
                    onClick={() => handleRemoveTech(idx)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/10 text-red-400 transition-opacity"
                    disabled={upsertMutation.isLoading}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new tech */}
            {isEditingTech ? (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="e.g., React, TypeScript..."
                  value={newTech}
                  onChange={(e) => setNewTech(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTech()}
                  className="flex-1 px-2 py-1 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleAddTech}
                  disabled={upsertMutation.isLoading || !newTech.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {upsertMutation.isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingTech(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingTech(true)}
                className="w-full text-foreground-muted hover:text-foreground"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Technology
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
