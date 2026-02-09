'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'

interface VelocityChartProps {
  data: Array<{ date: string; prsCompleted: number }>
}

export function VelocityChart({ data }: VelocityChartProps) {
  // Defensive check: ensure data is a valid array
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-foreground-muted">
        No velocity data available yet
      </div>
    )
  }

  const formattedData = data.map((item) => {
    try {
      const date = new Date(item.date)
      return {
        ...item,
        dateLabel: isNaN(date.getTime()) ? 'N/A' : format(date, 'MMM d'),
      }
    } catch {
      return { ...item, dateLabel: 'N/A' }
    }
  })

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={formattedData}>
        <defs>
          <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
        <XAxis
          dataKey="dateLabel"
          tick={{ fill: '#A3A3A3', fontSize: 12 }}
          axisLine={{ stroke: '#E5E5E5' }}
          tickLine={{ stroke: '#E5E5E5' }}
        />
        <YAxis
          tick={{ fill: '#A3A3A3', fontSize: 12 }}
          axisLine={{ stroke: '#E5E5E5' }}
          tickLine={{ stroke: '#E5E5E5' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          }}
          formatter={(value: number) => [`${value} PRs`, 'Completed']}
          labelFormatter={(label) => `Week of ${label}`}
        />
        <Area
          type="monotone"
          dataKey="prsCompleted"
          stroke="#2563EB"
          strokeWidth={2}
          fill="url(#velocityGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
