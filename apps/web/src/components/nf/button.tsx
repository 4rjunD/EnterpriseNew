'use client'

import { cn } from '@nexflow/ui/utils'
import { forwardRef, ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-black hover:bg-accent-hover hover:-translate-y-px active:translate-y-0',
  secondary: 'bg-transparent text-foreground border border-border hover:border-border-hover hover:bg-background-secondary',
  ghost: 'bg-transparent text-foreground-secondary hover:text-foreground hover:bg-background-secondary',
  danger: 'bg-status-critical-muted text-status-critical border border-status-critical/30 hover:bg-status-critical hover:text-white',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-button font-medium',
          'transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-border-hover focus:ring-offset-2 focus:ring-offset-background',
          'disabled:opacity-50 disabled:pointer-events-none',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

// Icon Button for compact use cases
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
}

const iconSizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'ghost', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-button',
          'transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-border-hover',
          'disabled:opacity-50 disabled:pointer-events-none',
          variant === 'ghost' && 'text-foreground-secondary hover:text-foreground hover:bg-background-secondary',
          variant === 'secondary' && 'text-foreground border border-border hover:border-border-hover',
          iconSizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'
