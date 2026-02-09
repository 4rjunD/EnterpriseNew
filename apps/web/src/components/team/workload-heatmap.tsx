'use client'

import { cn } from '@nexflow/ui/utils'

interface HeatmapData {
  userId: string
  name: string | null
  heatmap: Record<string, Record<number, number>>
}

interface WorkloadHeatmapProps {
  data: HeatmapData[]
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function WorkloadHeatmap({ data }: WorkloadHeatmapProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-foreground-muted">
        No workload data available
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {data.slice(0, 5).map((member) => (
        <div key={member.userId} className="space-y-2">
          <div className="text-sm font-medium text-foreground">
            {member.name || 'Unknown'}
          </div>
          <div className="overflow-x-auto">
            <div className="inline-grid gap-1">
              {/* Header row with hours */}
              <div className="grid grid-cols-[60px_repeat(24,_16px)] gap-1">
                <div />
                {HOURS.filter((_, i) => i % 3 === 0).map((hour) => (
                  <div
                    key={hour}
                    className="text-[10px] text-foreground-muted"
                    style={{ gridColumn: `span 3` }}
                  >
                    {hour.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>

              {/* Heatmap rows */}
              {DAYS.map((day) => (
                <div key={day} className="grid grid-cols-[60px_repeat(24,_16px)] gap-1">
                  <div className="text-xs text-foreground-muted">{day}</div>
                  {HOURS.map((hour) => {
                    const value = member.heatmap[day]?.[hour] || 0
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className={cn(
                          'h-4 w-4 rounded-sm',
                          getHeatmapColor(value)
                        )}
                        title={`${day} ${hour}:00 - Activity: ${value}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-foreground-muted">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="h-3 w-3 rounded-sm bg-background-secondary" />
          <div className="h-3 w-3 rounded-sm bg-accent/20" />
          <div className="h-3 w-3 rounded-sm bg-accent/40" />
          <div className="h-3 w-3 rounded-sm bg-accent/60" />
          <div className="h-3 w-3 rounded-sm bg-accent" />
        </div>
        <span>More</span>
      </div>
    </div>
  )
}

function getHeatmapColor(value: number): string {
  if (value === 0) return 'bg-background-secondary'
  if (value <= 1) return 'bg-accent/20'
  if (value <= 2) return 'bg-accent/40'
  if (value <= 3) return 'bg-accent/60'
  return 'bg-accent'
}
