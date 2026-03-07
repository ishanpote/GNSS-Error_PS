'use client'

import { useState } from 'react'
import FileUpload from '@/components/FileUpload'
import ErrorChart from '@/components/ErrorChart'
import MetricsCard from '@/components/MetricsCard'
import { dataUtils } from '@/lib/api'
import { Download, Shield, AlertTriangle, CheckCircle } from 'lucide-react'
import type { GNSSData } from '@/types'

export default function DefenceView() {
  const [uploadedData, setUploadedData] = useState<GNSSData[] | null>(null)
  const [predictions, setPredictions] = useState<GNSSData[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [nPastDays, setNPastDays] = useState(7)
  const [nFutureDays, setNFutureDays] = useState(1)
  const [processingTime, setProcessingTime] = useState<number | null>(null)

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

  const calculateDefenceMetrics = (data: GNSSData[]) => {
    const positionErrors = data.map(d => 
      Math.sqrt(d['x_error(m)']**2 + d['y_error(m)']**2 + d['z_error(m)']**2)
    )
    
    const maxPositionError = Math.max(...positionErrors)
    const avgPositionError = positionErrors.reduce((a, b) => a + b, 0) / positionErrors.length
    
    // Defence-specific metrics
    const integrityRisk = maxPositionError > 10 ? 'HIGH' : maxPositionError > 5 ? 'MEDIUM' : 'LOW'
    const availability = positionErrors.filter(e => e < 15).length / positionErrors.length * 100
    const securityLevel = availability > 95 && maxPositionError < 10 ? 'OPERATIONAL' : 'DEGRADED'
    
    return {
      maxPositionError: maxPositionError.toFixed(3),
      avgPositionError: avgPositionError.toFixed(3),
      integrityRisk,
      availability: availability.toFixed(1),
      securityLevel
    }
  }

  const handleDownload = () => {
    if (predictions) {
      dataUtils.downloadCSV(predictions, `defence_gnss_predictions_${Date.now()}.csv`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-defense-50 to-purple-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="w-8 h-8 text-defense-600" />
            <h1 className="text-3xl font-bold text-gray-900">Defence GNSS Forecasting</h1>
          </div>
          <p className="text-gray-600">
            Mission-critical GNSS error forecasting with enhanced security and integrity monitoring
          </p>
        </div>

        {/* Security Banner */}
        <div className="bg-defense-100 border border-defense-300 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-defense-700 mr-2" />
            <span className="text-sm font-semibold text-defense-900">
              CLASSIFIED - Defence Operations Use Only
            </span>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="card mb-6 border-2 border-defense-200">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
            <span className="w-2 h-2 bg-defense-600 rounded-full mr-2"></span>
            Mission Parameters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Historical Data Window (Days)
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
                Forecast Horizon (Days)
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
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-800">System Alert</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="card mb-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-defense-600"></div>
              <span className="ml-4 text-gray-600">Analyzing mission data...</span>
            </div>
          </div>
        )}

        {/* Results */}
        {predictions && !loading && (
          <>
            {/* Defence Metrics Dashboard */}
            {(() => {
              const metrics = calculateDefenceMetrics(predictions)
              return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-defense-600">
                    <div className="text-sm text-gray-600 mb-1">Security Level</div>
                    <div className={`text-2xl font-bold ${
                      metrics.securityLevel === 'OPERATIONAL' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {metrics.securityLevel}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
                    <div className="text-sm text-gray-600 mb-1">Integrity Risk</div>
                    <div className={`text-2xl font-bold ${
                      metrics.integrityRisk === 'LOW' ? 'text-green-600' : 
                      metrics.integrityRisk === 'MEDIUM' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {metrics.integrityRisk}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
                    <div className="text-sm text-gray-600 mb-1">Availability</div>
                    <div className="text-2xl font-bold text-blue-600">{metrics.availability}%</div>
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
                    <div className="text-sm text-gray-600 mb-1">Max Position Error</div>
                    <div className="text-2xl font-bold text-red-600">{metrics.maxPositionError} m</div>
                  </div>
                </div>
              )
            })()}

            {/* Action Bar */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm font-semibold text-green-800">
                    Mission Forecast Generated
                  </span>
                </div>
                <button onClick={handleDownload} className="px-4 py-2 bg-defense-600 text-white rounded-md hover:bg-defense-700 transition-colors flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Export Data</span>
                </button>
              </div>
              {processingTime && (
                <p className="text-xs text-green-600 mt-2">
                  Processing time: {processingTime.toFixed(2)}s | {predictions.length} points | Models: Ensemble
                </p>
              )}
            </div>

            {/* Visualization Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2">
                <div className="card border-2 border-defense-200">
                  <ErrorChart 
                    data={predictions} 
                    title="Mission Critical - GNSS Error Forecast" 
                    height={400}
                    colors={{
                      x: '#9333ea',
                      y: '#7e22ce',
                      z: '#6b21a8',
                      clock: '#581c87'
                    }}
                  />
                </div>
              </div>
              <div>
                <MetricsCard data={predictions} title="Tactical Metrics" color="defense" />
              </div>
            </div>

            {/* Alert Thresholds */}
            <div className="card mb-6 bg-defense-50 border-2 border-defense-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Mission Alert Thresholds</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">CRITICAL ALERT</div>
                  <div className="text-sm font-semibold text-red-600">&gt; 15m Position Error</div>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">WARNING</div>
                  <div className="text-sm font-semibold text-yellow-600">10-15m Position Error</div>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">NORMAL</div>
                  <div className="text-sm font-semibold text-green-600">&lt; 10m Position Error</div>
                </div>
              </div>
            </div>

            {/* Historical Comparison */}
            {uploadedData && (
              <div className="card border-2 border-defense-200">
                <ErrorChart
                  data={uploadedData.slice(-82)}
                  title="Historical Mission Data (Last 2 Days)"
                  height={300}
                  colors={{
                    x: '#9333ea',
                    y: '#7e22ce',
                    z: '#6b21a8',
                    clock: '#581c87'
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* Info Panel */}
        {!predictions && !loading && (
          <div className="card border-2 border-defense-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
              <Shield className="w-5 h-5 text-defense-600 mr-2" />
              Defence Operations Guidelines
            </h2>
            <div className="space-y-4 text-gray-600">
              <p><strong>Mission-Critical Requirements:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Position accuracy must remain within operational thresholds</li>
                <li>Real-time integrity monitoring for threat detection</li>
                <li>Enhanced forecasting for tactical navigation systems</li>
                <li>Secure data handling and encrypted communications</li>
              </ul>
              <p className="text-sm text-defense-700 bg-defense-50 p-3 rounded-lg mt-4">
                <strong>Classification Notice:</strong> All data and predictions are for authorized defence personnel only.
                Unauthorized access or distribution is strictly prohibited.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
