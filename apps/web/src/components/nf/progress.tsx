'use client'

import { cn } from '@nexflow/ui/utils'
import { HTMLAttributes } from 'react'

export type ProgressVariant = 'default' | 'critical' | 'warning' | 'success' | 'info' | 'nf'

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  variant?: ProgressVariant
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
  showValue?: boolean
}

const variantClasses: Record<ProgressVariant, string> = {
  default: 'bg-foreground-secondary',
  critical: 'bg-status-critical',
  warning: 'bg-status-warning',
  success: 'bg-status-success',
  info: 'bg-status-info',
  nf: 'bg-nf',
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2',
}

export function Progress({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  animate = true,
  showValue = false,
  className,
  ...props
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  // Auto-determine variant based on percentage if not specified
  const computedVariant =
    variant === 'default'
      ? percentage >= 80
        ? 'success'
        : percentage >= 60
        ? 'warning'
        : 'critical'
      : variant

  return (
    <div className={cn('flex items-center gap-3', className)} {...props}>
      <div className={cn('flex-1 bg-background-tertiary rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            variantClasses[computedVariant],
            animate && 'animate-progress-fill'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue && (
        <span className={cn('text-sm font-mono tabular-nums', variantClasses[computedVariant].replace('bg-', 'text-'))}>
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}

// Labeled progress bar
export interface LabeledProgressProps extends ProgressProps {
  label: string
  description?: string
}

export function LabeledProgress({
  label,
  description,
  value,
  max = 100,
  className,
  ...props
}: LabeledProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-sm font-mono text-foreground-secondary tabular-nums">
          {Math.round(percentage)}%
        </span>
      </div>
      <Progress value={value} max={max} {...props} />
      {description && (
        <p className="text-xs text-foreground-tertiary">{description}</p>
      )}
    </div>
  )
}

// Scanning progress with phases
export interface ScanningProgressProps extends HTMLAttributes<HTMLDivElement> {
  progress: number
  phase: string
}

export function ScanningProgress({
  progress,
  phase,
  className,
  ...props
}: ScanningProgressProps) {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      <Progress value={progress} variant="nf" size="md" animate />
      <p className="text-sm text-foreground-secondary text-center animate-pulse">
        {phase}
      </p>
    </div>
  )
}
