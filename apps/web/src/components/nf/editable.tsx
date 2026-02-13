'use client'

import { cn } from '@nexflow/ui/utils'
import { useState, useRef, useEffect, KeyboardEvent, HTMLAttributes } from 'react'

export interface EditableProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
  maxLength?: number
  disabled?: boolean
  variant?: 'default' | 'warning'
}

export function Editable({
  value,
  onChange,
  placeholder = 'Click to edit...',
  multiline = false,
  maxLength,
  disabled = false,
  variant = 'default',
  className,
  ...props
}: EditableProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    setIsEditing(false)
    if (editValue !== value) {
      onChange(editValue)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(value)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const handleClick = () => {
    if (!disabled) {
      setIsEditing(true)
    }
  }

  const variantClasses = {
    default: 'text-foreground-secondary hover:text-foreground',
    warning: 'text-status-warning hover:text-status-warning',
  }

  if (isEditing) {
    const commonProps = {
      ref: inputRef as any,
      value: editValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditValue(e.target.value),
      onBlur: handleSave,
      onKeyDown: handleKeyDown,
      maxLength,
      placeholder,
      className: cn(
        'w-full bg-background-secondary border border-border rounded-input px-2 py-1',
        'text-sm text-foreground',
        'focus:outline-none focus:border-border-hover',
        'placeholder:text-foreground-tertiary'
      ),
    }

    if (multiline) {
      return (
        <div className={className} {...props}>
          <textarea
            {...commonProps}
            rows={3}
            className={cn(commonProps.className, 'resize-none')}
          />
        </div>
      )
    }

    return (
      <div className={className} {...props}>
        <input type="text" {...commonProps} />
      </div>
    )
  }

  const displayValue = value || placeholder
  const isEmpty = !value

  return (
    <div
      onClick={handleClick}
      className={cn(
        'cursor-pointer transition-colors duration-150',
        disabled && 'cursor-default opacity-50',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'text-sm border-b border-dashed',
          isEmpty ? 'text-foreground-tertiary border-foreground-tertiary/30' : variantClasses[variant],
          isEmpty ? '' : 'border-current/30',
          !disabled && 'hover:border-current'
        )}
      >
        {displayValue}
      </span>
    </div>
  )
}

// Inline label with editable value
export interface LabeledEditableProps extends EditableProps {
  label: string
}

export function LabeledEditable({
  label,
  value,
  onChange,
  className,
  ...props
}: LabeledEditableProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="label">{label}</span>
      <Editable value={value} onChange={onChange} {...props} />
    </div>
  )
}
