'use client'

import { trpc } from '@/lib/trpc'
import { cn } from '@nexflow/ui/utils'
import { Skeleton } from '@nexflow/ui/skeleton'
import { format, addDays, startOfWeek } from 'date-fns'
import { Calendar, Clock, Users, Coffee } from 'lucide-react'

const typeConfig = {
  DEEP_WORK: {
    icon: Clock,
    color: 'text-foreground',
    bgColor: 'bg-accent-light',
    borderColor: 'border-accent/30',
    label: 'Focus Time',
  },
  MEETING: {
    icon: Users,
    color: 'text-foreground',
    bgColor: 'bg-accent-light',
    borderColor: 'border-accent/30',
    label: 'Meeting',
  },
  BREAK: {
    icon: Coffee,
    color: 'text-status-healthy',
    bgColor: 'bg-status-healthy-light',
    borderColor: 'border-status-healthy/30',
    label: 'Break',
  },
}

export function WeeklySchedule() {
  const { data, isLoading } = trpc.calendar.getWeeklySchedule.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-foreground-muted">
        <Calendar className="w-8 h-8 mb-2" />
        <p className="text-sm">No schedule data</p>
      </div>
    )
  }

  const { byDay, stats, weekStart } = data
  const days = Object.keys(byDay).sort()

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 text-center">
        <StatBox
          icon={<Clock className="w-4 h-4 text-foreground" />}
          value={`${stats.totalFocusHours}h`}
          label="Focus Time"
        />
        <StatBox
          icon={<Users className="w-4 h-4 text-foreground" />}
          value={`${stats.totalMeetingHours}h`}
          label="Meetings"
        />
        <StatBox
          icon={<Clock className="w-4 h-4 text-status-healthy" />}
          value={stats.focusBlockCount.toString()}
          label="Focus Blocks"
        />
        <StatBox
          icon={<Users className="w-4 h-4 text-status-warning" />}
          value={stats.meetingCount.toString()}
          label="Meetings"
        />
      </div>

      {/* Weekly grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {days.map((day, idx) => {
          const date = new Date(day)
          const isToday = format(new Date(), 'yyyy-MM-dd') === day

          return (
            <div
              key={day}
              className={cn(
                'text-center py-2 text-xs font-medium rounded-t-lg',
                isToday ? 'bg-accent-light text-foreground' : 'text-foreground-muted'
              )}
            >
              <div>{format(date, 'EEE')}</div>
              <div className={cn('text-lg', isToday && 'font-bold')}>{format(date, 'd')}</div>
            </div>
          )
        })}

        {/* Day content */}
        {days.map((day) => {
          const blocks = byDay[day] || []
          const isToday = format(new Date(), 'yyyy-MM-dd') === day

          return (
            <div
              key={`content-${day}`}
              className={cn(
                'min-h-[120px] p-1 rounded-b-lg border',
                isToday ? 'border-accent/30 bg-accent-light' : 'border-border bg-background-secondary/30'
              )}
            >
              {blocks.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-foreground-muted">
                  No blocks
                </div>
              ) : (
                <div className="space-y-1">
                  {blocks.slice(0, 3).map((block, idx) => {
                    const config = typeConfig[block.type as keyof typeof typeConfig] || typeConfig.DEEP_WORK
                    const Icon = config.icon

                    return (
                      <div
                        key={block.id || idx}
                        className={cn(
                          'p-1.5 rounded text-xs border',
                          config.bgColor,
                          config.borderColor
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <Icon className={cn('w-3 h-3', config.color)} />
                          <span className={cn('truncate', config.color)}>{block.title}</span>
                        </div>
                        <div className="text-[10px] text-foreground-muted mt-0.5">
                          {format(new Date(block.startTime), 'HH:mm')} -{' '}
                          {format(new Date(block.endTime), 'HH:mm')}
                        </div>
                      </div>
                    )
                  })}
                  {blocks.length > 3 && (
                    <div className="text-[10px] text-center text-foreground-muted">
                      +{blocks.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-foreground-muted">
        {Object.entries(typeConfig).map(([type, config]) => {
          const Icon = config.icon
          return (
            <div key={type} className="flex items-center gap-1">
              <div className={cn('w-3 h-3 rounded', config.bgColor)} />
              <span>{config.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatBox({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <div className="p-3 rounded-lg bg-background-secondary/50 border border-border">
      <div className="flex items-center justify-center gap-1 mb-1">{icon}</div>
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="text-xs text-foreground-muted">{label}</div>
    </div>
  )
}
