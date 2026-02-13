'use client'

import { cn } from '@nexflow/ui/utils'
import { forwardRef, HTMLAttributes } from 'react'

export type BadgeVariant = 'default' | 'critical' | 'warning' | 'success' | 'info' | 'purple' | 'nf'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  pulse?: boolean
  size?: 'sm' | 'md'
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-background-tertiary text-foreground-secondary border-border',
  critical: 'bg-status-critical-muted text-status-critical border-status-critical/30',
  warning: 'bg-status-warning-muted text-status-warning border-status-warning/30',
  success: 'bg-status-success-muted text-status-success border-status-success/30',
  info: 'bg-status-info-muted text-status-info border-status-info/30',
  purple: 'bg-purple-muted text-purple border-purple/30',
  nf: 'bg-nf-muted text-nf border-nf/30',
}

const sizeClasses = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', pulse = false, size = 'md', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-pill border font-mono',
          variantClasses[variant],
          sizeClasses[size],
          pulse && 'animate-pulse-glow',
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

// Urgency Badge with specific styling
export type UrgencyLevel = 'now' | 'today' | 'this-week'

export interface UrgencyBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  urgency: UrgencyLevel
}

const urgencyConfig: Record<UrgencyLevel, { label: string; variant: BadgeVariant; pulse: boolean }> = {
  now: { label: 'DO NOW', variant: 'critical', pulse: true },
  today: { label: 'TODAY', variant: 'warning', pulse: false },
  'this-week': { label: 'THIS WEEK', variant: 'default', pulse: false },
}

export const UrgencyBadge = forwardRef<HTMLSpanElement, UrgencyBadgeProps>(
  ({ className, urgency, ...props }, ref) => {
    const config = urgencyConfig[urgency] || urgencyConfig['today']
    return (
      <Badge
        ref={ref}
        variant={config.variant}
        pulse={config.pulse}
        size="sm"
        className={cn('uppercase tracking-wider', className)}
        {...props}
      >
        {config.label}
      </Badge>
    )
  }
)

UrgencyBadge.displayName = 'UrgencyBadge'

// Role Badge
export type RoleType = 'cofounder' | 'admin' | 'member'

export interface RoleBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  role: RoleType
}

const roleConfig: Record<RoleType, { label: string; variant: BadgeVariant }> = {
  cofounder: { label: 'Co-founder', variant: 'purple' },
  admin: { label: 'Admin', variant: 'success' },
  member: { label: 'Member', variant: 'info' },
}

export const RoleBadge = forwardRef<HTMLSpanElement, RoleBadgeProps>(
  ({ className, role, ...props }, ref) => {
    const config = roleConfig[role] || roleConfig['member']
    return (
      <Badge
        ref={ref}
        variant={config.variant}
        size="sm"
        className={className}
        {...props}
      >
        {config.label}
      </Badge>
    )
  }
)

RoleBadge.displayName = 'RoleBadge'

// Severity Badge
export type SeverityLevel = 'critical' | 'warning' | 'info' | 'resolved'

export interface SeverityBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  severity: SeverityLevel
}

const severityConfig: Record<SeverityLevel, { label: string; variant: BadgeVariant }> = {
  critical: { label: 'Critical', variant: 'critical' },
  warning: { label: 'Warning', variant: 'warning' },
  info: { label: 'Info', variant: 'info' },
  resolved: { label: 'Resolved', variant: 'success' },
}

export const SeverityBadge = forwardRef<HTMLSpanElement, SeverityBadgeProps>(
  ({ className, severity, ...props }, ref) => {
    const config = severityConfig[severity] || severityConfig['info']
    return (
      <Badge
        ref={ref}
        variant={config.variant}
        size="sm"
        className={className}
        {...props}
      >
        {config.label}
      </Badge>
    )
  }
)

SeverityBadge.displayName = 'SeverityBadge'
