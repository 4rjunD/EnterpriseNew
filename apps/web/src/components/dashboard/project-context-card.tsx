'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@nexflow/ui/card'
import { Button } from '@nexflow/ui/button'
import { Textarea } from '@nexflow/ui/textarea'
import { Input } from '@nexflow/ui/input'
import { toast } from '@nexflow/ui/toast'
import { Lightbulb, Save, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'

export function ProjectContextCard() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [description, setDescription] = useState('')
  const [goals, setGoals] = useState<string[]>([''])
  const [techStack, setTechStack] = useState<string[]>([''])

  const { data: context, isLoading } = trpc.onboarding.getProjectContext.useQuery()
  const saveContext = trpc.onboarding.saveProjectContext.useMutation()
  const utils = trpc.useUtils()

  // Load existing context
  useEffect(() => {
    if (context) {
      setDescription(context.buildingDescription || '')
      setGoals(context.goals?.length ? context.goals : [''])
      setTechStack(context.techStack?.length ? context.techStack : [''])
    }
  }, [context])

  const handleSave = async () => {
    if (description.trim().length < 10) {
      toast({
        title: 'Please add more detail',
        description: 'Describe your project in at least a few sentences.',
        variant: 'destructive',
      })
      return
    }

    try {
      await saveContext.mutateAsync({
        buildingDescription: description,
        goals: goals.filter((g) => g.trim()),
        techStack: techStack.filter((t) => t.trim()),
      })
      toast({ title: 'Project context saved' })
      setIsEditing(false)
      utils.onboarding.getProjectContext.invalidate()
    } catch (error: any) {
      toast({
        title: 'Failed to save',
        description: error?.message,
        variant: 'destructive',
      })
    }
  }

  const addGoal = () => setGoals([...goals, ''])
  const updateGoal = (index: number, value: string) => {
    const newGoals = [...goals]
    newGoals[index] = value
    setGoals(newGoals)
  }
  const removeGoal = (index: number) => {
    if (goals.length > 1) setGoals(goals.filter((_, i) => i !== index))
  }

  const addTech = () => setTechStack([...techStack, ''])
  const updateTech = (index: number, value: string) => {
    const newTech = [...techStack]
    newTech[index] = value
    setTechStack(newTech)
  }
  const removeTech = (index: number) => {
    if (techStack.length > 1) setTechStack(techStack.filter((_, i) => i !== index))
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Project Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-background-secondary rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  const hasContext = context?.buildingDescription

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Project Context
          </CardTitle>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-foreground-muted hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasContext && !isEditing ? (
          <div className="text-center py-4">
            <p className="text-sm text-foreground-muted mb-3">
              Tell us what you're building so AI can give better recommendations
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditing(true)
                setIsExpanded(true)
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Project Context
            </Button>
          </div>
        ) : isEditing || isExpanded ? (
          <div className="space-y-4">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                What are you building?
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="We're building a platform for..."
                className="h-20 bg-background-secondary border-border resize-none text-sm"
                disabled={!isEditing}
              />
            </div>

            {/* Goals */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Goals
              </label>
              <div className="space-y-2">
                {goals.map((goal, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={goal}
                      onChange={(e) => updateGoal(index, e.target.value)}
                      placeholder="Ship MVP by Q2"
                      className="flex-1 h-8 bg-background-secondary border-border text-sm"
                      disabled={!isEditing}
                    />
                    {isEditing && goals.length > 1 && (
                      <button
                        onClick={() => removeGoal(index)}
                        className="text-foreground-muted hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {isEditing && (
                <button
                  onClick={addGoal}
                  className="mt-1 text-xs text-foreground-muted hover:text-foreground flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add goal
                </button>
              )}
            </div>

            {/* Tech Stack */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Tech Stack
              </label>
              <div className="flex flex-wrap gap-2">
                {techStack.map((tech, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-background-secondary border border-border rounded px-2 py-1"
                  >
                    <Input
                      value={tech}
                      onChange={(e) => updateTech(index, e.target.value)}
                      placeholder="React"
                      className="w-16 h-5 p-0 border-0 bg-transparent text-xs"
                      disabled={!isEditing}
                    />
                    {isEditing && techStack.length > 1 && (
                      <button
                        onClick={() => removeTech(index)}
                        className="text-foreground-muted hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <button
                    onClick={addTech}
                    className="flex items-center gap-1 px-2 py-1 border border-dashed border-border rounded text-xs text-foreground-muted hover:text-foreground hover:border-foreground/30"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {isEditing ? (
                <>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saveContext.isPending}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {saveContext.isPending ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsEditing(false)
                      if (!hasContext) setIsExpanded(false)
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="w-full"
                >
                  Edit Context
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div
            className="cursor-pointer"
            onClick={() => setIsExpanded(true)}
          >
            <p className="text-sm text-foreground-muted line-clamp-2">
              {description}
            </p>
            <p className="text-xs text-foreground-muted/70 mt-1">
              Click to expand
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
