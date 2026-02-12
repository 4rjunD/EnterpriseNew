'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@nexflow/ui/button'
import { toast } from '@nexflow/ui/toast'
import { cn } from '@nexflow/ui/utils'
import { Pencil, Save, X, Loader2 } from 'lucide-react'

interface ContextEditorProps {
  initialContext?: {
    buildingDescription: string
    goals: string[]
    techStack: string[]
  } | null
}

export function ContextEditor({ initialContext }: ContextEditorProps) {
  const [isEditing, setIsEditing] = useState(!initialContext)
  const [description, setDescription] = useState(initialContext?.buildingDescription || '')

  const utils = trpc.useUtils()
  const upsertMutation = trpc.context.upsert.useMutation({
    onSuccess: () => {
      toast({ title: 'Context saved', description: 'Project context has been updated' })
      utils.context.invalidate()
      setIsEditing(false)
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const handleSave = () => {
    if (!description.trim()) {
      toast({ title: 'Error', description: 'Please provide a project description', variant: 'destructive' })
      return
    }

    upsertMutation.mutate({
      buildingDescription: description,
      goals: initialContext?.goals || [],
      techStack: initialContext?.techStack || [],
    })
  }

  const handleCancel = () => {
    setDescription(initialContext?.buildingDescription || '')
    setIsEditing(false)
  }

  if (!isEditing && initialContext) {
    return (
      <div className="group relative">
        <div className="prose prose-sm prose-invert max-w-none">
          <p className="text-foreground-secondary whitespace-pre-wrap">{description}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Pencil className="w-4 h-4 mr-1" />
          Edit
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!initialContext && (
        <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <h3 className="font-medium text-foreground mb-1">Tell NexFlow about your project</h3>
          <p className="text-sm text-foreground-muted">
            This helps our AI understand your goals and provide better insights, predictions, and recommendations.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          What are you building?
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your project, its goals, target users, and key features..."
          className={cn(
            'w-full min-h-[150px] p-3 rounded-lg border bg-background-secondary',
            'text-foreground placeholder:text-foreground-muted',
            'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50',
            'resize-y'
          )}
        />
        <p className="mt-1 text-xs text-foreground-muted">
          Be specific - include your tech stack, timeline goals, and what success looks like.
        </p>
      </div>

      <div className="flex items-center justify-end gap-2">
        {initialContext && (
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={upsertMutation.isLoading || !description.trim()}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {upsertMutation.isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-1" />
              Save Context
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
