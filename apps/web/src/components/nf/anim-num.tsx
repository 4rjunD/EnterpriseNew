'use client'

import { cn } from '@nexflow/ui/utils'
import { useEffect, useState, useRef, HTMLAttributes } from 'react'

export interface AnimNumProps extends HTMLAttributes<HTMLSpanElement> {
  value: number
  duration?: number
  suffix?: string
  prefix?: string
  decimals?: number
  delay?: number
}

// Easing function - cubic out for smooth deceleration
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function AnimNum({
  value,
  duration = 600,
  suffix = '',
  prefix = '',
  decimals = 0,
  delay = 0,
  className,
  ...props
}: AnimNumProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const previousValue = useRef(0)
  const animationRef = useRef<number>()

  useEffect(() => {
    const startValue = previousValue.current
    const difference = value - startValue
    const startTime = performance.now() + delay

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime

      if (elapsed < 0) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      if (elapsed >= duration) {
        setDisplayValue(value)
        previousValue.current = value
        return
      }

      const progress = easeOutCubic(elapsed / duration)
      const current = startValue + difference * progress
      setDisplayValue(current)

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value, duration, delay])

  const formattedValue = displayValue.toFixed(decimals)

  return (
    <span
      className={cn('tabular-nums animate-count', className)}
      {...props}
    >
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  )
}

// Specialized version for percentages with color coding
export interface AnimPercentProps extends HTMLAttributes<HTMLSpanElement> {
  value: number
  thresholds?: { success: number; warning: number }
  duration?: number
  showSymbol?: boolean
}

export function AnimPercent({
  value,
  thresholds = { success: 80, warning: 60 },
  duration = 600,
  showSymbol = true,
  className,
  ...props
}: AnimPercentProps) {
  const colorClass =
    value >= thresholds.success
      ? 'text-status-success'
      : value >= thresholds.warning
      ? 'text-status-warning'
      : 'text-status-critical'

  return (
    <AnimNum
      value={value}
      duration={duration}
      suffix={showSymbol ? '%' : ''}
      decimals={0}
      className={cn(colorClass, className)}
      {...props}
    />
  )
}

// Simple counter for stats
export interface StatCounterProps extends HTMLAttributes<HTMLDivElement> {
  value: number
  label: string
  suffix?: string
  delay?: number
}

export function StatCounter({
  value,
  label,
  suffix = '',
  delay = 0,
  className,
  ...props
}: StatCounterProps) {
  return (
    <div className={cn('text-center', className)} {...props}>
      <AnimNum
        value={value}
        suffix={suffix}
        delay={delay}
        className="text-2xl font-semibold text-foreground tabular-nums"
      />
      <p className="text-xs text-foreground-secondary mt-1">{label}</p>
    </div>
  )
}
