'use client'

import type { GNSSData } from '@/types'

interface MetricsCardProps {
  data: GNSSData[]
  title?: string
  color?: string
}

export default function MetricsCard({ data, title = 'Error Statistics', color = 'primary' }: MetricsCardProps) {
  const calculateStats = () => {
    if (data.length === 0) return null

    const avgX = data.reduce((sum, d) => sum + d['x_error(m)'], 0) / data.length
    const avgY = data.reduce((sum, d) => sum + d['y_error(m)'], 0) / data.length
    const avgZ = data.reduce((sum, d) => sum + d['z_error(m)'], 0) / data.length
    const avgClock = data.reduce((sum, d) => sum + d['satclockerror(m)'], 0) / data.length

    const maxX = Math.max(...data.map(d => Math.abs(d['x_error(m)'])))
    const maxY = Math.max(...data.map(d => Math.abs(d['y_error(m)'])))
    const maxZ = Math.max(...data.map(d => Math.abs(d['z_error(m)'])))
    const maxClock = Math.max(...data.map(d => Math.abs(d['satclockerror(m)'])))

    const total3DError = Math.sqrt(avgX ** 2 + avgY ** 2 + avgZ ** 2)

    return {
      avgX: avgX.toFixed(3),
      avgY: avgY.toFixed(3),
      avgZ: avgZ.toFixed(3),
      avgClock: avgClock.toFixed(3),
      maxX: maxX.toFixed(3),
      maxY: maxY.toFixed(3),
      maxZ: maxZ.toFixed(3),
      maxClock: maxClock.toFixed(3),
      total3DError: total3DError.toFixed(3),
    }
  }

  const stats = calculateStats()

  if (!stats) {
    return (
      <div className="card">
        <p className="text-gray-500">No data available</p>
      </div>
    )
  }

  const StatRow = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-semibold text-${color}-600`}>{value} m</span>
    </div>
  )

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
      
      <div className="space-y-1 mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Average Errors</h4>
        <StatRow label="X Error" value={stats.avgX} color={color} />
        <StatRow label="Y Error" value={stats.avgY} color={color} />
        <StatRow label="Z Error" value={stats.avgZ} color={color} />
        <StatRow label="Clock Error" value={stats.avgClock} color={color} />
      </div>

      <div className="space-y-1 mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Maximum Errors</h4>
        <StatRow label="Max X" value={stats.maxX} color={color} />
        <StatRow label="Max Y" value={stats.maxY} color={color} />
        <StatRow label="Max Z" value={stats.maxZ} color={color} />
        <StatRow label="Max Clock" value={stats.maxClock} color={color} />
      </div>

      <div className={`bg-${color}-50 rounded-lg p-4 border border-${color}-200`}>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Total 3D Position Error</span>
          <span className={`text-lg font-bold text-${color}-700`}>{stats.total3DError} m</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Based on {data.length} data points
        </p>
      </div>
    </div>
  )
}
