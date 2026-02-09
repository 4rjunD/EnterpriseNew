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

interface Task {
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  storyPoints?: number | null
  dueDate?: Date | null
  labels?: string[]
  assignee?: { id: string; name: string | null } | null
}

interface TaskEditModalProps {
  open: boolean
  task: Task | null
  onClose: () => void
  onSuccess: () => void
}

export function TaskEditModal({ open, task, onClose, onSuccess }: TaskEditModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('BACKLOG')
  const [priority, setPriority] = useState('MEDIUM')
  const [storyPoints, setStoryPoints] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined)

  const { data: members } = trpc.team.listMembers.useQuery({})

  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Task updated successfully' })
      onSuccess()
    },
    onError: (error: { message: string }) => {
      toast({ title: 'Failed to update task', description: error.message, variant: 'destructive' })
    },
  })

  // Populate form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || '')
      setDescription(task.description || '')
      setStatus(task.status || 'BACKLOG')
      setPriority(task.priority || 'MEDIUM')
      setStoryPoints(task.storyPoints?.toString() || '')
      setDueDate(task.dueDate ? formatDateForInput(task.dueDate) : '')
      setAssigneeId(task.assignee?.id || undefined)
    }
  }, [task])

  const formatDateForInput = (date: Date | string) => {
    try {
      const d = new Date(date)
      if (isNaN(d.getTime())) return ''
      return d.toISOString().split('T')[0]
    } catch {
      return ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!task || !title.trim()) return

    updateMutation.mutate({
      id: task.id,
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      storyPoints: storyPoints ? parseInt(storyPoints, 10) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      assigneeId: assigneeId || null,
    })
  }

  return (
    <Modal open={open} onOpenChange={onClose}>
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>Edit Task</ModalTitle>
          </ModalHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter task title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Enter description (optional)..."
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
                    <SelectItem value="BACKLOG">Backlog</SelectItem>
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="IN_REVIEW">In Review</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="storyPoints">Story Points</Label>
                <Input
                  id="storyPoints"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={storyPoints}
                  onChange={(e) => setStoryPoints(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={assigneeId || 'unassigned'} onValueChange={(v) => setAssigneeId(v === 'unassigned' ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members?.map((member: { id: string; name: string | null; email: string }) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={updateMutation.isPending}>
              Save Changes
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
