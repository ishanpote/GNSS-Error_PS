'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { GNSSData } from '@/types'

interface ErrorChartProps {
  data: GNSSData[]
  title?: string
  showLegend?: boolean
  height?: number
  colors?: {
    x: string
    y: string
    z: string
    clock: string
  }
}

export default function ErrorChart({
  data,
  title = 'GNSS Error Forecast',
  showLegend = true,
  height = 400,
  colors = {
    x: '#3b82f6',
    y: '#10b981',
    z: '#f59e0b',
    clock: '#ef4444',
  },
}: ErrorChartProps) {
  const chartData = data.map((d, idx) => ({
    time: new Date(d.utc_time).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    x_error: parseFloat(d['x_error(m)'].toFixed(2)),
    y_error: parseFloat(d['y_error(m)'].toFixed(2)),
    z_error: parseFloat(d['z_error(m)'].toFixed(2)),
    clock_error: parseFloat(d['satclockerror(m)'].toFixed(2)),
  }))

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          />
          <YAxis
            label={{ value: 'Error (meters)', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
          />
          {showLegend && <Legend />}
          <Line
            type="monotone"
            dataKey="x_error"
            stroke={colors.x}
            strokeWidth={2}
            dot={false}
            name="X Error"
          />
          <Line
            type="monotone"
            dataKey="y_error"
            stroke={colors.y}
            strokeWidth={2}
            dot={false}
            name="Y Error"
          />
          <Line
            type="monotone"
            dataKey="z_error"
            stroke={colors.z}
            strokeWidth={2}
            dot={false}
            name="Z Error"
          />
          <Line
            type="monotone"
            dataKey="clock_error"
            stroke={colors.clock}
            strokeWidth={2}
            dot={false}
            name="Clock Error"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
