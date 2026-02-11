'use client'

import { Button } from '@nexflow/ui/button'
import { X, Sparkles } from 'lucide-react'
import { cn } from '@nexflow/ui/utils'

interface SmartPromptProps {
  message: string
  cta: string
  ctaHref: string
  onDismiss?: () => void
  className?: string
}

export function SmartPrompt({
  message,
  cta,
  ctaHref,
  onDismiss,
  className,
}: SmartPromptProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        <p className="text-sm text-foreground">{message}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={ctaHref}>{cta}</a>
        </Button>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-foreground-muted hover:text-foreground"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

// Compact inline variant for use within sections
export function SmartPromptInline({
  message,
  cta,
  ctaHref,
  className,
}: Omit<SmartPromptProps, 'onDismiss'>) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm text-foreground-muted',
        className
      )}
    >
      <Sparkles className="h-3.5 w-3.5 text-accent" />
      <span>{message}</span>
      <a
        href={ctaHref}
        className="font-medium text-accent hover:underline"
      >
        {cta}
      </a>
    </div>
  )
}
