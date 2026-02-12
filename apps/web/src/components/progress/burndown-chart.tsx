'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Area,
  ComposedChart,
} from 'recharts'
import { format, parseISO } from 'date-fns'

interface BurndownData {
  dataPoints: Array<{
    date: string
    planned: number
    actual: number
    ideal: number
  }>
  summary: {
    totalPoints: number
    completedPoints: number
    remainingPoints: number
    completionPercentage: number
    averageVelocity: number
  }
}

interface BurndownChartProps {
  data?: BurndownData
}

export function BurndownChart({ data }: BurndownChartProps) {
  if (!data || data.dataPoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-foreground-muted">
        <p className="text-sm">No progress data available yet</p>
        <p className="text-xs">Data will appear as tasks are completed</p>
      </div>
    )
  }

  const totalPoints = data.summary.totalPoints || 100

  // Format data for a proper burndown chart
  // Burndown shows REMAINING work decreasing over time
  const chartData = data.dataPoints.map((point, index) => {
    const completed = point.actual || 0
    const remaining = Math.max(0, totalPoints - completed)

    return {
      date: format(parseISO(point.date), 'MMM d'),
      remaining: remaining,
      ideal: point.ideal,
      completed: completed,
    }
  })

  const todayIndex = chartData.findIndex(
    (d) => d.date === format(new Date(), 'MMM d')
  )

  // Determine if on track
  const latestData = chartData[chartData.length - 1]
  const isAhead = latestData && latestData.remaining < latestData.ideal
  const statusColor = isAhead ? '#30A46C' : '#FF9500'

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'hsl(var(--foreground-muted))', fontSize: 11 }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: 'hsl(var(--foreground-muted))', fontSize: 11 }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            domain={[0, totalPoints]}
            label={{
              value: 'Points',
              angle: -90,
              position: 'insideLeft',
              style: { fill: 'hsl(var(--foreground-muted))', fontSize: 10 }
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background-secondary))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                ideal: 'Target Remaining',
                remaining: 'Actual Remaining',
              }
              return [`${value} pts`, labels[name] || name]
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                ideal: 'Target (Ideal)',
                remaining: 'Actual Remaining',
              }
              return <span style={{ color: 'hsl(var(--foreground-muted))', fontSize: '12px' }}>{labels[value] || value}</span>
            }}
          />

          {/* Today marker */}
          {todayIndex >= 0 && (
            <ReferenceLine
              x={chartData[todayIndex]?.date}
              stroke="#FF9500"
              strokeDasharray="5 5"
              label={{
                value: 'Today',
                position: 'top',
                fill: '#FF9500',
                fontSize: 10,
              }}
            />
          )}

          {/* Ideal burndown line (target) - dashed gray line going down */}
          <Line
            type="monotone"
            dataKey="ideal"
            stroke="hsl(var(--foreground-muted))"
            strokeDasharray="5 5"
            dot={false}
            strokeWidth={2}
            name="ideal"
          />

          {/* Actual remaining work - solid blue line (should go down) */}
          <Line
            type="monotone"
            dataKey="remaining"
            stroke={statusColor}
            strokeWidth={3}
            dot={{ fill: statusColor, strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: statusColor }}
            name="remaining"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Status indicator */}
      <div className="mt-2 text-center">
        {isAhead ? (
          <span className="text-xs text-status-healthy">✓ Ahead of schedule</span>
        ) : (
          <span className="text-xs text-status-warning">⚠ Behind schedule</span>
        )}
      </div>
    </div>
  )
}
