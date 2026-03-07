'use client'

import { useState } from 'react'
import FileUpload from '@/components/FileUpload'
import ErrorChart from '@/components/ErrorChart'
import MetricsCard from '@/components/MetricsCard'
import { dataUtils } from '@/lib/api'
import { Download, Plane, AlertCircle, Activity } from 'lucide-react'
import type { GNSSData } from '@/types'

export default function AviationView() {
  const [uploadedData, setUploadedData] = useState<GNSSData[] | null>(null)
  const [predictions, setPredictions] = useState<GNSSData[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [nPastDays, setNPastDays] = useState(7)
  const [nFutureDays, setNFutureDays] = useState(1)
  const [processingTime, setProcessingTime] = useState<number | null>(null)
  const [flightPhase, setFlightPhase] = useState<'enroute' | 'approach' | 'precision'>('enroute')

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

  const calculateAviationMetrics = (data: GNSSData[]) => {
    // Calculate horizontal and vertical position errors
    const horizontalErrors = data.map(d => 
      Math.sqrt(d['x_error(m)']**2 + d['y_error(m)']**2)
    )
    const verticalErrors = data.map(d => Math.abs(d['z_error(m)']))
    
    const maxHorizontalError = Math.max(...horizontalErrors)
    const maxVerticalError = Math.max(...verticalErrors)
    const avgHorizontalError = horizontalErrors.reduce((a, b) => a + b, 0) / horizontalErrors.length
    const avgVerticalError = verticalErrors.reduce((a, b) => a + b, 0) / verticalErrors.length
    
    // Aviation-specific thresholds based on flight phase
    const thresholds = {
      enroute: { hal: 3700, val: 50 },      // En-route
      approach: { hal: 40, val: 50 },       // Approach
      precision: { hal: 40, val: 20 }       // Precision Approach
    }
    
    const limits = thresholds[flightPhase]
    
    // Calculate integrity
    const horizontalIntegrity = (horizontalErrors.filter(e => e < limits.hal).length / horizontalErrors.length) * 100
    const verticalIntegrity = (verticalErrors.filter(e => e < limits.val).length / verticalErrors.length) * 100
    
    // Flight safety status
    const safetyStatus = 
      maxHorizontalError < limits.hal && maxVerticalError < limits.val ? 'SAFE' :
      maxHorizontalError < limits.hal * 1.5 && maxVerticalError < limits.val * 1.5 ? 'CAUTION' : 'WARNING'
    
    return {
      maxHorizontalError: maxHorizontalError.toFixed(3),
      maxVerticalError: maxVerticalError.toFixed(3),
      avgHorizontalError: avgHorizontalError.toFixed(3),
      avgVerticalError: avgVerticalError.toFixed(3),
      horizontalIntegrity: horizontalIntegrity.toFixed(1),
      verticalIntegrity: verticalIntegrity.toFixed(1),
      safetyStatus,
      hal: limits.hal,
      val: limits.val
    }
  }

  const handleDownload = () => {
    if (predictions) {
      dataUtils.downloadCSV(predictions, `aviation_gnss_predictions_${Date.now()}.csv`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-aviation-50 to-emerald-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Plane className="w-8 h-8 text-aviation-600" />
            <h1 className="text-3xl font-bold text-gray-900">Aviation GNSS Forecasting</h1>
          </div>
          <p className="text-gray-600">
            Flight safety-focused GNSS error forecasting with FAA compliance metrics
          </p>
        </div>

        {/* Safety Banner */}
        <div className="bg-aviation-100 border border-aviation-300 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Plane className="w-5 h-5 text-aviation-700 mr-2" />
            <span className="text-sm font-semibold text-aviation-900">
              Aviation Safety Critical System - FAA/EASA Standards
            </span>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="card mb-6 border-2 border-aviation-200">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
            <Activity className="w-5 h-5 text-aviation-600 mr-2" />
            Flight Parameters
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
                Flight Phase
              </label>
              <select
                value={flightPhase}
                onChange={(e) => setFlightPhase(e.target.value as any)}
                className="input-field"
                disabled={loading}
              >
                <option value="enroute">En-Route</option>
                <option value="approach">Approach</option>
                <option value="precision">Precision Approach</option>
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
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-800">Flight Safety Alert</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="card mb-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aviation-600"></div>
              <span className="ml-4 text-gray-600">Analyzing flight data...</span>
            </div>
          </div>
        )}

        {/* Results */}
        {predictions && !loading && (
          <>
            {/* Aviation Metrics Dashboard */}
            {(() => {
              const metrics = calculateAviationMetrics(predictions)
              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${
                      metrics.safetyStatus === 'SAFE' ? 'border-green-500' :
                      metrics.safetyStatus === 'CAUTION' ? 'border-yellow-500' : 'border-red-500'
                    }`}>
                      <div className="text-sm text-gray-600 mb-1">Flight Safety</div>
                      <div className={`text-2xl font-bold ${
                        metrics.safetyStatus === 'SAFE' ? 'text-green-600' :
                        metrics.safetyStatus === 'CAUTION' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {metrics.safetyStatus}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
                      <div className="text-sm text-gray-600 mb-1">Horizontal Integrity</div>
                      <div className="text-2xl font-bold text-blue-600">{metrics.horizontalIntegrity}%</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
                      <div className="text-sm text-gray-600 mb-1">Vertical Integrity</div>
                      <div className="text-2xl font-bold text-purple-600">{metrics.verticalIntegrity}%</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-aviation-500">
                      <div className="text-sm text-gray-600 mb-1">Max H Error</div>
                      <div className="text-2xl font-bold text-aviation-600">{metrics.maxHorizontalError} m</div>
                    </div>
                  </div>

                  {/* Alert Limits */}
                  <div className="card mb-6 bg-aviation-50 border-2 border-aviation-200">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                      {flightPhase.charAt(0).toUpperCase() + flightPhase.slice(1)} Phase Alert Limits
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">Horizontal Alert Limit (HAL)</div>
                        <div className="text-2xl font-bold text-aviation-700">{metrics.hal} m</div>
                        <div className="text-xs text-gray-500 mt-2">Current Max: {metrics.maxHorizontalError} m</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">Vertical Alert Limit (VAL)</div>
                        <div className="text-2xl font-bold text-aviation-700">{metrics.val} m</div>
                        <div className="text-xs text-gray-500 mt-2">Current Max: {metrics.maxVerticalError} m</div>
                      </div>
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
                    Flight Forecast Generated
                  </span>
                </div>
                <button onClick={handleDownload} className="px-4 py-2 bg-aviation-600 text-white rounded-md hover:bg-aviation-700 transition-colors flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Export Flight Data</span>
                </button>
              </div>
              {processingTime && (
                <p className="text-xs text-green-600 mt-2">
                  Processing time: {processingTime.toFixed(2)}s | {predictions.length} points | Phase: {flightPhase}
                </p>
              )}
            </div>

            {/* Visualization Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2">
                <div className="card border-2 border-aviation-200">
                  <ErrorChart 
                    data={predictions} 
                    title="Flight Path - GNSS Error Forecast" 
                    height={400}
                    colors={{
                      x: '#10b981',
                      y: '#059669',
                      z: '#047857',
                      clock: '#065f46'
                    }}
                  />
                </div>
              </div>
              <div>
                <MetricsCard data={predictions} title="Navigation Metrics" color="aviation" />
              </div>
            </div>

            {/* Historical Comparison */}
            {uploadedData && (
              <div className="card border-2 border-aviation-200">
                <ErrorChart
                  data={uploadedData.slice(-82)}
                  title="Historical Flight Data (Last 2 Days)"
                  height={300}
                  colors={{
                    x: '#10b981',
                    y: '#059669',
                    z: '#047857',
                    clock: '#065f46'
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* Info Panel */}
        {!predictions && !loading && (
          <div className="card border-2 border-aviation-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
              <Plane className="w-5 h-5 text-aviation-600 mr-2" />
              Aviation Safety Guidelines
            </h2>
            <div className="space-y-4 text-gray-600">
              <p><strong>Flight Phase Requirements:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>En-Route:</strong> HAL = 3700m, VAL = 50m (Oceanic/Continental)</li>
                <li><strong>Approach:</strong> HAL = 40m, VAL = 50m (Terminal Area)</li>
                <li><strong>Precision Approach:</strong> HAL = 40m, VAL = 20m (Cat I)</li>
              </ul>
              <p className="text-sm text-aviation-700 bg-aviation-50 p-3 rounded-lg mt-4">
                <strong>Safety Notice:</strong> This system provides forecasting support for flight operations.
                Always verify with certified navigation systems and follow standard operating procedures.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
