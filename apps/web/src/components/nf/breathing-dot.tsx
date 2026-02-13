'use client'

import { cn } from '@nexflow/ui/utils'
import { HTMLAttributes } from 'react'

export type DotVariant = 'nf' | 'critical' | 'warning' | 'success' | 'info' | 'purple'
export type DotSize = 'sm' | 'md' | 'lg'

export interface BreathingDotProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: DotVariant
  size?: DotSize
  breathing?: boolean
  pulse?: boolean
}

const variantClasses: Record<DotVariant, string> = {
  nf: 'bg-nf',
  critical: 'bg-status-critical',
  warning: 'bg-status-warning',
  success: 'bg-status-success',
  info: 'bg-status-info',
  purple: 'bg-purple',
}

const sizeClasses: Record<DotSize, string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-3 h-3',
}

export function BreathingDot({
  variant = 'nf',
  size = 'md',
  breathing = true,
  pulse = false,
  className,
  ...props
}: BreathingDotProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-full',
        variantClasses[variant],
        sizeClasses[size],
        breathing && 'animate-breathing',
        pulse && 'animate-pulse-glow',
        className
      )}
      {...props}
    />
  )
}

// NexFlow AI Status Indicator with text
export interface NexFlowStatusProps extends HTMLAttributes<HTMLDivElement> {
  active?: boolean
  label?: string
}

export function NexFlowStatus({
  active = true,
  label = 'NexFlow AI active',
  className,
  ...props
}: NexFlowStatusProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-button',
        'bg-nf-muted border border-nf/20',
        className
      )}
      {...props}
    >
      <BreathingDot variant="nf" size="sm" breathing={active} />
      <span className="text-xs font-mono text-nf">{label}</span>
    </div>
  )
}

// Severity dot for lists
export interface SeverityDotProps extends HTMLAttributes<HTMLSpanElement> {
  severity: 'critical' | 'warning' | 'info' | 'resolved'
  pulse?: boolean
}

export function SeverityDot({
  severity,
  pulse,
  className,
  ...props
}: SeverityDotProps) {
  const variantMap: Record<string, DotVariant> = {
    critical: 'critical',
    warning: 'warning',
    info: 'info',
    resolved: 'success',
  }

  return (
    <BreathingDot
      variant={variantMap[severity]}
      size="sm"
      breathing={false}
      pulse={severity === 'critical' && pulse}
      className={className}
      {...props}
    />
  )
}
