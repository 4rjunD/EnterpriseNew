'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import {
  Search,
  Bell,
  Settings,
  LogOut,
  User,
  Command,
} from 'lucide-react'
import { Button } from '@nexflow/ui/button'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarWithStatus,
} from '@nexflow/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@nexflow/ui/dropdown-menu'
import { Badge } from '@nexflow/ui/badge'
import { Input } from '@nexflow/ui/input'
import { CommandPalette } from '@/components/command-palette'
import { TaskCreateModal } from '@/components/tasks/task-create-modal'
import { trpc } from '@/lib/trpc'

interface TopNavProps {
  user: {
    name: string | null
    email: string
    image: string | null
    role: string
  }
}

export function TopNav({ user }: TopNavProps) {
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showTaskCreateModal, setShowTaskCreateModal] = useState(false)
  const [notificationCount] = useState(3)
  const utils = trpc.useUtils()

  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || user.email[0].toUpperCase()

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center">
                <span className="text-lg font-semibold text-foreground">
                  NexFlow
                </span>
              </Link>
            </div>

            {/* Search */}
            <div className="flex flex-1 items-center justify-center px-8">
              <button
                onClick={() => setShowCommandPalette(true)}
                className="flex w-full max-w-md items-center gap-2 rounded-input border border-border bg-background-secondary px-4 py-2 text-sm text-foreground-muted transition-colors hover:border-border-hover"
              >
                <Search className="h-4 w-4" />
                <span className="flex-1 text-left">Search or command...</span>
                <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground-muted sm:inline-block">
                  <Command className="mr-0.5 inline h-3 w-3" />K
                </kbd>
              </button>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {notificationCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-status-critical text-[10px] font-medium text-white">
                        {notificationCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-80 overflow-y-auto">
                    <NotificationItem
                      title="Bottleneck detected"
                      description="PR #142 has been stuck for 3 days"
                      time="5m ago"
                      type="critical"
                    />
                    <NotificationItem
                      title="Agent suggestion"
                      description="Reassign task to available team member"
                      time="1h ago"
                      type="warning"
                    />
                    <NotificationItem
                      title="Sync completed"
                      description="Linear integration synced successfully"
                      time="2h ago"
                      type="healthy"
                    />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Settings */}
              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard/settings">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2">
                    <AvatarWithStatus
                      status="online"
                      src={user.image || undefined}
                      fallback={initials}
                      className="h-8 w-8"
                    />
                    <span className="hidden text-sm font-medium md:inline-block">
                      {user.name || user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-foreground-muted">{user.email}</p>
                      <Badge variant="outline" className="mt-1 w-fit">
                        {user.role}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="text-status-critical"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      <CommandPalette
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
        onCreateTask={() => setShowTaskCreateModal(true)}
      />

      <TaskCreateModal
        open={showTaskCreateModal}
        onClose={() => setShowTaskCreateModal(false)}
        onSuccess={() => {
          setShowTaskCreateModal(false)
          utils.tasks.invalidate()
        }}
      />
    </>
  )
}

function NotificationItem({
  title,
  description,
  time,
  type,
}: {
  title: string
  description: string
  time: string
  type: 'critical' | 'warning' | 'healthy'
}) {
  const dotColors = {
    critical: 'bg-status-critical',
    warning: 'bg-status-warning',
    healthy: 'bg-status-healthy',
  }

  return (
    <div className="flex gap-3 px-2 py-3 hover:bg-background-secondary cursor-pointer">
      <div className={`mt-1.5 h-2 w-2 rounded-full ${dotColors[type]}`} />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-foreground-muted">{description}</p>
        <p className="mt-1 text-xs text-foreground-muted">{time}</p>
      </div>
    </div>
  )
}
