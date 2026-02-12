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

  // Format data for chart
  const chartData = data.dataPoints.map((point) => ({
    ...point,
    date: format(parseISO(point.date), 'MMM d'),
    remaining: Math.max(0, data.summary.totalPoints - point.actual),
  }))

  const todayIndex = chartData.findIndex(
    (d) => d.date === format(new Date(), 'MMM d')
  )

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
            domain={[0, 'dataMax']}
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
                ideal: 'Ideal',
                remaining: 'Remaining',
                actual: 'Completed',
              }
              return [value, labels[name] || name]
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                ideal: 'Ideal Burndown',
                remaining: 'Actual Remaining',
                actual: 'Completed',
              }
              return <span style={{ color: 'hsl(var(--foreground-muted))', fontSize: '12px' }}>{labels[value] || value}</span>
            }}
          />

          {/* Today marker */}
          {todayIndex >= 0 && (
            <ReferenceLine
              x={chartData[todayIndex]?.date}
              stroke="hsl(var(--amber-400))"
              strokeDasharray="5 5"
              label={{
                value: 'Today',
                position: 'top',
                fill: 'hsl(var(--amber-400))',
                fontSize: 10,
              }}
            />
          )}

          {/* Ideal burndown line */}
          <Line
            type="monotone"
            dataKey="ideal"
            stroke="hsl(var(--foreground-muted))"
            strokeDasharray="5 5"
            dot={false}
            strokeWidth={1.5}
          />

          {/* Actual remaining line */}
          <Line
            type="monotone"
            dataKey="remaining"
            stroke="hsl(var(--blue-400))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--blue-400))', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: 'hsl(var(--blue-400))' }}
          />

          {/* Completed line */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="hsl(var(--green-400))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--green-400))', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: 'hsl(var(--green-400))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
