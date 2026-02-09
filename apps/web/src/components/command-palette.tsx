'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Command } from 'cmdk'
import {
  LayoutDashboard,
  AlertTriangle,
  Users,
  CheckSquare,
  TrendingUp,
  Lightbulb,
  FolderOpen,
  Plug,
  Search,
  Plus,
  Settings,
  User,
  LogOut,
  FileText,
  GitPullRequest,
  Download,
} from 'lucide-react'
import { Modal, ModalContent } from '@nexflow/ui/modal'
import { cn } from '@nexflow/ui/utils'
import { toast } from '@nexflow/ui/toast'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateTask?: () => void
  onViewPRs?: () => void
}

export function CommandPalette({ open, onOpenChange, onCreateTask, onViewPRs }: CommandPaletteProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const handleSignOut = useCallback(() => {
    signOut({ callbackUrl: '/login' })
  }, [])

  const handleGenerateReport = useCallback(() => {
    toast({ title: 'Generating report...', description: 'Your report will download shortly.' })
    // Generate a simple JSON export of dashboard data
    const reportData = {
      generatedAt: new Date().toISOString(),
      type: 'Dashboard Summary Report',
      note: 'Full report generation can be implemented with actual data fetching.',
    }
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexflow-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast({ title: 'Report downloaded', description: 'Check your downloads folder.' })
  }, [])

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false)
      command()
    },
    [onOpenChange]
  )

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-2xl p-0 overflow-hidden">
        <Command className="rounded-lg border shadow-md" loop>
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-foreground-muted" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-foreground-muted"
            />
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-foreground-muted">
              No results found.
            </Command.Empty>

            {/* Navigation */}
            <Command.Group heading="Navigation" className="px-2 py-1.5">
              <CommandItem
                icon={LayoutDashboard}
                onSelect={() => runCommand(() => router.push('/dashboard'))}
              >
                Go to Dashboard
              </CommandItem>
              <CommandItem
                icon={AlertTriangle}
                onSelect={() =>
                  runCommand(() => router.push('/dashboard?card=bottlenecks'))
                }
              >
                View Bottlenecks
              </CommandItem>
              <CommandItem
                icon={Users}
                onSelect={() => runCommand(() => router.push('/dashboard?card=team'))}
              >
                View Team
              </CommandItem>
              <CommandItem
                icon={CheckSquare}
                onSelect={() => runCommand(() => router.push('/dashboard?card=tasks'))}
              >
                View Tasks
              </CommandItem>
              <CommandItem
                icon={TrendingUp}
                onSelect={() =>
                  runCommand(() => router.push('/dashboard?card=predictions'))
                }
              >
                View Predictions
              </CommandItem>
              <CommandItem
                icon={Lightbulb}
                onSelect={() =>
                  runCommand(() => router.push('/dashboard?card=insights'))
                }
              >
                View Insights
              </CommandItem>
              <CommandItem
                icon={FolderOpen}
                onSelect={() =>
                  runCommand(() => router.push('/dashboard?card=projects'))
                }
              >
                View Projects
              </CommandItem>
              <CommandItem
                icon={Plug}
                onSelect={() =>
                  runCommand(() => router.push('/dashboard?card=integrations'))
                }
              >
                Manage Integrations
              </CommandItem>
            </Command.Group>

            {/* Quick Actions */}
            <Command.Group heading="Quick Actions" className="px-2 py-1.5">
              <CommandItem
                icon={Plus}
                onSelect={() => runCommand(() => {
                  if (onCreateTask) {
                    onCreateTask()
                  } else {
                    router.push('/dashboard?card=tasks&action=create')
                  }
                })}
              >
                Create New Task
              </CommandItem>
              <CommandItem
                icon={GitPullRequest}
                onSelect={() => runCommand(() => {
                  if (onViewPRs) {
                    onViewPRs()
                  } else {
                    router.push('/dashboard?card=tasks&filter=prs')
                  }
                })}
              >
                View Open PRs
              </CommandItem>
              <CommandItem
                icon={Download}
                onSelect={() => runCommand(handleGenerateReport)}
              >
                Generate Report
              </CommandItem>
            </Command.Group>

            {/* Settings */}
            <Command.Group heading="Settings" className="px-2 py-1.5">
              <CommandItem
                icon={User}
                onSelect={() => runCommand(() => router.push('/dashboard/profile'))}
              >
                View Profile
              </CommandItem>
              <CommandItem
                icon={Settings}
                onSelect={() => runCommand(() => router.push('/dashboard/settings'))}
              >
                Open Settings
              </CommandItem>
              <CommandItem
                icon={LogOut}
                onSelect={() => runCommand(handleSignOut)}
              >
                Sign Out
              </CommandItem>
            </Command.Group>
          </Command.List>
        </Command>
      </ModalContent>
    </Modal>
  )
}

function CommandItem({
  children,
  icon: Icon,
  onSelect,
}: {
  children: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  onSelect: () => void
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-button px-2 py-2 text-sm outline-none',
        'hover:bg-background-secondary',
        'data-[selected=true]:bg-background-secondary'
      )}
    >
      <Icon className="mr-2 h-4 w-4 text-foreground-muted" />
      <span>{children}</span>
    </Command.Item>
  )
}
