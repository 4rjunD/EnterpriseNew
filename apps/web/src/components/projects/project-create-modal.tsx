'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
} from '@nexflow/ui/modal'
import { Button } from '@nexflow/ui/button'
import { Input } from '@nexflow/ui/input'
import { Label } from '@nexflow/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@nexflow/ui/select'
import { toast } from '@nexflow/ui/toast'

interface ProjectCreateModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ProjectCreateModal({ open, onClose, onSuccess }: ProjectCreateModalProps) {
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('PLANNING')
  const [teamId, setTeamId] = useState<string | undefined>(undefined)
  const [startDate, setStartDate] = useState('')
  const [targetDate, setTargetDate] = useState('')

  const { data: teams } = trpc.team.listTeams.useQuery()

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Project created successfully' })
      resetForm()
      onSuccess()
    },
    onError: (error: { message: string }) => {
      toast({ title: 'Failed to create project', description: error.message, variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setName('')
    setKey('')
    setKeyManuallyEdited(false)
    setDescription('')
    setStatus('PLANNING')
    setTeamId(undefined)
    setStartDate('')
    setTargetDate('')
  }

  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false)

  // Auto-generate key from name (only if not manually edited)
  useEffect(() => {
    if (name && !keyManuallyEdited) {
      const generatedKey = name
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .split(/\s+/)
        .map(word => word[0])
        .filter(Boolean)
        .join('')
        .slice(0, 5)
      setKey(generatedKey || '')
    }
  }, [name, keyManuallyEdited])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !key.trim()) return

    createMutation.mutate({
      name: name.trim(),
      key: key.trim().toUpperCase(),
      description: description.trim() || undefined,
      teamId: teamId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      targetDate: targetDate ? new Date(targetDate) : undefined,
    })
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>Create New Project</ModalTitle>
          </ModalHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter project name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="key">Key *</Label>
                <Input
                  id="key"
                  placeholder="KEY"
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value.toUpperCase())
                    setKeyManuallyEdited(true)
                  }}
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Enter project description (optional)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNING">Planning</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Team</Label>
                <Select value={teamId || 'none'} onValueChange={(v) => setTeamId(v === 'none' ? undefined : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No team</SelectItem>
                    {teams?.map((team: { id: string; name: string }) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetDate">Target Date</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create Project
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
