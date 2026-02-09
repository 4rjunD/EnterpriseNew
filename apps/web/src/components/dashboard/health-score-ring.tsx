'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@nexflow/ui/utils'

interface HealthScoreRingProps {
  score: number
  trend: number
}

export function HealthScoreRing({ score, trend }: HealthScoreRingProps) {
  const circumference = 2 * Math.PI * 70 // radius = 70
  const strokeDashoffset = circumference - (score / 100) * circumference

  const getScoreColor = () => {
    if (score >= 80) return '#16A34A' // healthy
    if (score >= 60) return '#D97706' // warning
    return '#DC2626' // critical
  }

  const getScoreLabel = () => {
    if (score >= 80) return 'Healthy'
    if (score >= 60) return 'At Risk'
    return 'Critical'
  }

  return (
    <div className="relative flex flex-col items-center">
      <svg className="h-40 w-40 -rotate-90 transform" viewBox="0 0 160 160">
        {/* Background circle */}
        <circle
          cx="80"
          cy="80"
          r="70"
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-background-secondary"
        />
        {/* Progress circle */}
        <motion.circle
          cx="80"
          cy="80"
          r="70"
          stroke={getScoreColor()}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>

      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-4xl font-bold text-foreground"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-sm text-foreground-muted">{getScoreLabel()}</span>
      </div>

      {/* Trend indicator */}
      <div
        className={cn(
          'mt-4 flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium',
          trend >= 0
            ? 'bg-status-healthy-light text-status-healthy'
            : 'bg-status-critical-light text-status-critical'
        )}
      >
        {trend >= 0 ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
        <span>{trend >= 0 ? '+' : ''}{trend}% this week</span>
      </div>
    </div>
  )
}
