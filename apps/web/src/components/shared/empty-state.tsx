'use client'

import { Button } from '@nexflow/ui/button'
import { cn } from '@nexflow/ui/utils'
import {
  CheckCircle2,
  Users,
  ListTodo,
  TrendingUp,
  Activity,
  Link as LinkIcon,
  Bot,
  FolderKanban,
  type LucideIcon,
} from 'lucide-react'

export interface EmptyStateConfig {
  icon: LucideIcon
  title: string
  description: string
  cta?: {
    label: string
    href?: string
    onClick?: () => void
  }
  variant?: 'default' | 'success'
}

// Pre-configured empty states for common sections
export const emptyStateConfigs = {
  bottlenecks: {
    icon: CheckCircle2,
    title: 'All Clear!',
    description: 'No bottlenecks detected. NexFlow is actively monitoring your workflow.',
    cta: {
      label: 'View Integrations',
      href: '/integrations',
    },
    variant: 'success' as const,
  },
  team: {
    icon: Users,
    title: 'Build Your Team',
    description: 'Invite colleagues to unlock AI-powered workload analysis and recommendations.',
    cta: {
      label: 'Invite Members',
      href: '/team',
    },
  },
  tasks: {
    icon: ListTodo,
    title: 'No Tasks Yet',
    description: 'Connect your project management tools to sync and track tasks.',
    cta: {
      label: 'Connect Linear',
      href: '/integrations',
    },
  },
  predictions: {
    icon: TrendingUp,
    title: 'Predictions Loading',
    description: 'Run an analysis to generate delivery predictions and risk assessments.',
    cta: {
      label: 'Run Analysis',
      href: '/insights',
    },
  },
  activity: {
    icon: Activity,
    title: 'Quiet Day',
    description: 'No recent activity to show. Connect integrations to start monitoring.',
    cta: {
      label: 'Connect Integrations',
      href: '/integrations',
    },
  },
  integrations: {
    icon: LinkIcon,
    title: 'No Integrations',
    description: 'Connect your tools to unlock the full power of NexFlow AI.',
    cta: {
      label: 'Browse Integrations',
      href: '/integrations',
    },
  },
  agents: {
    icon: Bot,
    title: 'AI Agents Disabled',
    description: 'Enable AI agents to automate task management and send smart reminders.',
    cta: {
      label: 'Enable Agents',
      href: '/insights',
    },
  },
  projects: {
    icon: FolderKanban,
    title: 'No Projects',
    description: 'Create a project to track deadlines and detect delivery risks.',
    cta: {
      label: 'Create Project',
      href: '/projects',
    },
  },
}

interface EmptyStateProps {
  config: EmptyStateConfig
  className?: string
}

export function EmptyState({ config, className }: EmptyStateProps) {
  const { icon: Icon, title, description, cta, variant = 'default' } = config

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center',
        className
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full',
          variant === 'success'
            ? 'bg-status-healthy-light text-status-healthy'
            : 'bg-background-secondary text-foreground-muted'
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-foreground-muted">{description}</p>
      {cta && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={cta.onClick}
          asChild={!!cta.href}
        >
          {cta.href ? <a href={cta.href}>{cta.label}</a> : cta.label}
        </Button>
      )}
    </div>
  )
}
