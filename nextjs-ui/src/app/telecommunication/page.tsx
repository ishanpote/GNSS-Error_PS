'use client'

import { useState } from 'react'
import FileUpload from '@/components/FileUpload'
import ErrorChart from '@/components/ErrorChart'
import MetricsCard from '@/components/MetricsCard'
import { dataUtils } from '@/lib/api'
import { Download, Radio, Activity, Wifi } from 'lucide-react'
import type { GNSSData } from '@/types'

export default function TelecommunicationView() {
  const [uploadedData, setUploadedData] = useState<GNSSData[] | null>(null)
  const [predictions, setPredictions] = useState<GNSSData[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [nPastDays, setNPastDays] = useState(7)
  const [nFutureDays, setNFutureDays] = useState(1)
  const [processingTime, setProcessingTime] = useState<number | null>(null)
  const [networkType, setNetworkType] = useState<'4G' | '5G' | 'Telecom'>('5G')

  const handleFileSelect = async (file: File) => {
    setError('')
    setLoading(true)

    try {
      const text = await file.text()
      const data = dataUtils.parseCSV(text)
      setUploadedData(data)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('n_past_days', nPastDays.toString())
      formData.append('n_future_days', nFutureDays.toString())

      const response = await fetch('http://localhost:8000/api/predict', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Prediction failed')
      }

      const result = await response.json()
      
      const predictionsData: GNSSData[] = result.predictions.map((p: any) => ({
        utc_time: p.utc_time,
        'x_error(m)': p['x_error(m)'],
        'y_error(m)': p['y_error(m)'],
        'z_error(m)': p['z_error(m)'],
        'satclockerror(m)': p['satclockerror(m)'],
      }))

      setPredictions(predictionsData)
      setProcessingTime(result.processing_time)
    } catch (err: any) {
      setError(err.message || 'An error occurred while processing the file')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const calculateTelecomMetrics = (data: GNSSData[]) => {
    // Clock error is critical for telecom timing
    const clockErrors = data.map(d => Math.abs(d['satclockerror(m)']))
    const maxClockError = Math.max(...clockErrors)
    const avgClockError = clockErrors.reduce((a, b) => a + b, 0) / clockErrors.length
    
    // Convert clock error (meters) to time error (nanoseconds)
    // Speed of light: ~299,792,458 m/s, so 1m ≈ 3.34 ns
    const clockErrorNs = maxClockError * 3.34
    const avgClockErrorNs = avgClockError * 3.34
    
    // Network timing requirements
    const requirements = {
      '4G': { max: 3000, target: 1500 },      // 3 μs max, 1.5 μs target
      '5G': { max: 100, target: 30 },         // 100 ns max, 30 ns target
      'Telecom': { max: 1000, target: 500 }   // 1 μs max, 0.5 μs target
    }
    
    const limits = requirements[networkType]
    
    // Calculate compliance
    const compliance = (clockErrors.filter(e => e * 3.34 < limits.max).length / clockErrors.length) * 100
    
    // Timing accuracy status
    const timingStatus = 
      clockErrorNs < limits.target ? 'EXCELLENT' :
      clockErrorNs < limits.max ? 'ACCEPTABLE' : 'DEGRADED'
    
    // Phase stability (based on variance)
    const variance = clockErrors.reduce((sum, val) => sum + Math.pow(val - avgClockError, 2), 0) / clockErrors.length
    const stdDev = Math.sqrt(variance)
    const phaseStability = stdDev < 0.5 ? 'STABLE' : stdDev < 1.0 ? 'MODERATE' : 'UNSTABLE'
    
    // Network sync quality
    const syncQuality = compliance > 95 ? 'OPTIMAL' : compliance > 90 ? 'GOOD' : 'POOR'
    
    return {
      maxClockError: maxClockError.toFixed(6),
      avgClockError: avgClockError.toFixed(6),
      maxClockErrorNs: clockErrorNs.toFixed(2),
      avgClockErrorNs: avgClockErrorNs.toFixed(2),
      compliance: compliance.toFixed(1),
      timingStatus,
      phaseStability,
      syncQuality,
      maxLimit: limits.max,
      targetLimit: limits.target
    }
  }

  const handleDownload = () => {
    if (predictions) {
      dataUtils.downloadCSV(predictions, `telecom_gnss_predictions_${Date.now()}.csv`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-telecom-50 to-orange-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Radio className="w-8 h-8 text-telecom-600" />
            <h1 className="text-3xl font-bold text-gray-900">Telecommunication GNSS Forecasting</h1>
          </div>
          <p className="text-gray-600">
            Network timing precision and synchronization forecasting for telecom infrastructure
          </p>
        </div>

        {/* Network Banner */}
        <div className="bg-telecom-100 border border-telecom-300 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Wifi className="w-5 h-5 text-telecom-700 mr-2" />
            <span className="text-sm font-semibold text-telecom-900">
              Telecom Network Timing System - ITU-T Standards
            </span>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="card mb-6 border-2 border-telecom-200">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
            <Activity className="w-5 h-5 text-telecom-600 mr-2" />
            Network Parameters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Historical Data (Days)
              </label>
              <input
                type="number"
                value={nPastDays}
                onChange={(e) => setNPastDays(parseInt(e.target.value))}
                min={1}
                max={30}
                className="input-field"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Forecast Period (Days)
              </label>
              <input
                type="number"
                value={nFutureDays}
                onChange={(e) => setNFutureDays(parseInt(e.target.value))}
                min={1}
                max={7}
                className="input-field"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Network Type
              </label>
              <select
                value={networkType}
                onChange={(e) => setNetworkType(e.target.value as any)}
                className="input-field"
                disabled={loading}
              >
                <option value="4G">4G/LTE Network</option>
                <option value="5G">5G Network</option>
                <option value="Telecom">General Telecom</option>
              </select>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <FileUpload onFileSelect={handleFileSelect} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-4">
            <div className="flex items-start">
              <Activity className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-800">Network Alert</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="card mb-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-telecom-600"></div>
              <span className="ml-4 text-gray-600">Analyzing network data...</span>
            </div>
          </div>
        )}

        {/* Results */}
        {predictions && !loading && (
          <>
            {/* Telecom Metrics Dashboard */}
            {(() => {
              const metrics = calculateTelecomMetrics(predictions)
              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${
                      metrics.timingStatus === 'EXCELLENT' ? 'border-green-500' :
                      metrics.timingStatus === 'ACCEPTABLE' ? 'border-yellow-500' : 'border-red-500'
                    }`}>
                      <div className="text-sm text-gray-600 mb-1">Timing Status</div>
                      <div className={`text-2xl font-bold ${
                        metrics.timingStatus === 'EXCELLENT' ? 'text-green-600' :
                        metrics.timingStatus === 'ACCEPTABLE' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {metrics.timingStatus}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
                      <div className="text-sm text-gray-600 mb-1">Network Sync</div>
                      <div className="text-2xl font-bold text-blue-600">{metrics.syncQuality}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
                      <div className="text-sm text-gray-600 mb-1">Phase Stability</div>
                      <div className="text-2xl font-bold text-purple-600">{metrics.phaseStability}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-telecom-500">
                      <div className="text-sm text-gray-600 mb-1">Compliance</div>
                      <div className="text-2xl font-bold text-telecom-600">{metrics.compliance}%</div>
                    </div>
                  </div>

                  {/* Timing Requirements */}
                  <div className="card mb-6 bg-telecom-50 border-2 border-telecom-200">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                      {networkType} Network Timing Requirements
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">Maximum Timing Error</div>
                        <div className="text-2xl font-bold text-telecom-700">{metrics.maxLimit} ns</div>
                        <div className="text-xs text-gray-500 mt-2">Current: {metrics.maxClockErrorNs} ns</div>
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${parseFloat(metrics.maxClockErrorNs) < metrics.maxLimit ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min((parseFloat(metrics.maxClockErrorNs) / metrics.maxLimit) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">Target Timing Accuracy</div>
                        <div className="text-2xl font-bold text-telecom-700">{metrics.targetLimit} ns</div>
                        <div className="text-xs text-gray-500 mt-2">Average: {metrics.avgClockErrorNs} ns</div>
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${parseFloat(metrics.avgClockErrorNs) < metrics.targetLimit ? 'bg-green-500' : 'bg-yellow-500'}`}
                            style={{ width: `${Math.min((parseFloat(metrics.avgClockErrorNs) / metrics.targetLimit) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clock Error Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="card border-l-4 border-telecom-500">
                      <div className="text-sm text-gray-600 mb-1">Max Clock Error</div>
                      <div className="text-xl font-bold text-gray-900">{metrics.maxClockError} m</div>
                      <div className="text-xs text-gray-500 mt-1">{metrics.maxClockErrorNs} ns</div>
                    </div>
                    <div className="card border-l-4 border-blue-500">
                      <div className="text-sm text-gray-600 mb-1">Avg Clock Error</div>
                      <div className="text-xl font-bold text-gray-900">{metrics.avgClockError} m</div>
                      <div className="text-xs text-gray-500 mt-1">{metrics.avgClockErrorNs} ns</div>
                    </div>
                    <div className="card border-l-4 border-green-500">
                      <div className="text-sm text-gray-600 mb-1">Timing Compliance</div>
                      <div className="text-xl font-bold text-gray-900">{metrics.compliance}%</div>
                      <div className="text-xs text-gray-500 mt-1">Within limits</div>
                    </div>
                  </div>
                </>
              )
            })()}

            {/* Action Bar */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Activity className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm font-semibold text-green-800">
                    Network Forecast Generated
                  </span>
                </div>
                <button onClick={handleDownload} className="px-4 py-2 bg-telecom-600 text-white rounded-md hover:bg-telecom-700 transition-colors flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Export Network Data</span>
                </button>
              </div>
              {processingTime && (
                <p className="text-xs text-green-600 mt-2">
                  Processing time: {processingTime.toFixed(2)}s | {predictions.length} points | Network: {networkType}
                </p>
              )}
            </div>

            {/* Visualization Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2">
                <div className="card border-2 border-telecom-200">
                  <ErrorChart 
                    data={predictions} 
                    title="Network Timing - GNSS Error Forecast" 
                    height={400}
                    colors={{
                      x: '#f97316',
                      y: '#ea580c',
                      z: '#c2410c',
                      clock: '#9a3412'
                    }}
                  />
                </div>
              </div>
              <div>
                <MetricsCard data={predictions} title="Timing Metrics" color="telecom" />
              </div>
            </div>

            {/* Historical Comparison */}
            {uploadedData && (
              <div className="card border-2 border-telecom-200">
                <ErrorChart
                  data={uploadedData.slice(-82)}
                  title="Historical Network Data (Last 2 Days)"
                  height={300}
                  colors={{
                    x: '#f97316',
                    y: '#ea580c',
                    z: '#c2410c',
                    clock: '#9a3412'
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* Info Panel */}
        {!predictions && !loading && (
          <div className="card border-2 border-telecom-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
              <Radio className="w-5 h-5 text-telecom-600 mr-2" />
              Telecom Network Guidelines
            </h2>
            <div className="space-y-4 text-gray-600">
              <p><strong>Network Timing Requirements:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>5G Networks:</strong> Ultra-precise timing ≤100 ns for synchronization</li>
                <li><strong>4G/LTE:</strong> Phase timing ≤3 μs for base station coordination</li>
                <li><strong>Telecom Backbone:</strong> ≤1 μs for carrier-grade timing distribution</li>
                <li><strong>Phase Stability:</strong> Critical for TDD, massive MIMO, and beamforming</li>
              </ul>
              <div className="bg-telecom-50 p-4 rounded-lg mt-4">
                <p className="text-sm text-telecom-800 font-semibold mb-2">Key Applications:</p>
                <ul className="text-sm space-y-1">
                  <li>• Network synchronization and timing distribution</li>
                  <li>• Base station coordination and handover</li>
                  <li>• Time Division Duplex (TDD) timing</li>
                  <li>• Inter-cell interference coordination</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
