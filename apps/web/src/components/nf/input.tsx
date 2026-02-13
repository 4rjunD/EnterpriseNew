'use client'

import { cn } from '@nexflow/ui/utils'
import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react'

// Base Input
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'w-full h-10 px-3 bg-background-secondary border rounded-input',
          'text-sm text-foreground placeholder:text-foreground-tertiary',
          'focus:outline-none focus:border-border-hover',
          'transition-colors duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-status-critical' : 'border-border',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

// Textarea
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full px-3 py-2 bg-background-secondary border rounded-input',
          'text-sm text-foreground placeholder:text-foreground-tertiary',
          'focus:outline-none focus:border-border-hover',
          'transition-colors duration-150 resize-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-status-critical' : 'border-border',
          className
        )}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'

// Select
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full h-10 px-3 bg-background-secondary border rounded-input',
          'text-sm text-foreground',
          'focus:outline-none focus:border-border-hover',
          'transition-colors duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'appearance-none cursor-pointer',
          'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\' fill=\'none\'%3E%3Cpath d=\'M3 4.5L6 7.5L9 4.5\' stroke=\'%23888888\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")] bg-no-repeat bg-[center_right_12px]',
          error ? 'border-status-critical' : 'border-border',
          className
        )}
        {...props}
      >
        {children}
      </select>
    )
  }
)

Select.displayName = 'Select'

// Label
export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn('block text-sm text-foreground-secondary mb-1.5', className)}
        {...props}
      >
        {children}
        {required && <span className="text-status-critical ml-0.5">*</span>}
      </label>
    )
  }
)

Label.displayName = 'Label'

// Form Field wrapper
export interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
}

export function FormField({
  label,
  required,
  error,
  hint,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label required={required}>{label}</Label>
      {children}
      {error && <p className="text-xs text-status-critical">{error}</p>}
      {hint && !error && <p className="text-xs text-foreground-tertiary">{hint}</p>}
    </div>
  )
}

// Segmented Control for role selection
export interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  className?: string
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex p-1 bg-background-secondary rounded-button border border-border',
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'px-3 py-1.5 text-sm rounded-button transition-colors duration-150',
            value === option.value
              ? 'bg-accent text-black'
              : 'text-foreground-secondary hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
