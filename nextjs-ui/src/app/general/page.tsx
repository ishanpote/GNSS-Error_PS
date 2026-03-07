'use client'

import { useState } from 'react'
import FileUpload from '@/components/FileUpload'
import ErrorChart from '@/components/ErrorChart'
import MetricsCard from '@/components/MetricsCard'
import { dataUtils } from '@/lib/api'
import { Download, Upload, TrendingUp, AlertCircle } from 'lucide-react'
import type { GNSSData } from '@/types'

export default function GeneralView() {
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

      // Call Python API through Next.js API route
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
      
      // Convert the predictions to GNSSData format
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

  const handleDownload = () => {
    if (predictions) {
      dataUtils.downloadCSV(predictions, `gnss_predictions_${Date.now()}.csv`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">General GNSS Error Forecasting</h1>
          <p className="text-gray-600">
            Upload historical GNSS error data to generate future predictions using ensemble deep learning models
          </p>
        </div>

        {/* Configuration Panel */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Past Days (History)
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
              <p className="text-xs text-gray-500 mt-1">
                Number of past days to use for prediction (default: 7)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Future Days (Forecast)
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
              <p className="text-xs text-gray-500 mt-1">
                Number of future days to predict (default: 1)
              </p>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <FileUpload onFileSelect={handleFileSelect} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-800">Error</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="card mb-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <span className="ml-4 text-gray-600">Processing your data...</span>
            </div>
          </div>
        )}

        {/* Results */}
        {predictions && !loading && (
          <>
            {/* Status Bar */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm font-semibold text-green-800">
                    Predictions Generated Successfully
                  </span>
                </div>
                <button onClick={handleDownload} className="btn-primary flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Download CSV</span>
                </button>
              </div>
              {processingTime && (
                <p className="text-xs text-green-600 mt-2">
                  Processing time: {processingTime.toFixed(2)}s | {predictions.length} data points generated
                </p>
              )}
            </div>

            {/* Visualization Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2">
                <div className="card">
                  <ErrorChart data={predictions} title="Predicted GNSS Errors" height={400} />
                </div>
              </div>
              <div>
                <MetricsCard data={predictions} title="Prediction Statistics" />
              </div>
            </div>

            {/* Historical Data Comparison */}
            {uploadedData && (
              <div className="card">
                <ErrorChart
                  data={uploadedData.slice(-82)} // Last 2 days for comparison
                  title="Historical Data (Last 2 Days)"
                  height={300}
                />
              </div>
            )}

            {/* Data Table Preview */}
            <div className="card mt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Predictions Preview</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">X Error (m)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Y Error (m)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Z Error (m)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock Error (m)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {predictions.slice(0, 10).map((pred, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(pred.utc_time).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {pred['x_error(m)'].toFixed(3)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {pred['y_error(m)'].toFixed(3)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {pred['z_error(m)'].toFixed(3)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {pred['satclockerror(m)'].toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {predictions.length > 10 && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  Showing first 10 of {predictions.length} predictions
                </p>
              )}
            </div>
          </>
        )}

        {/* Info Panel */}
        {!predictions && !loading && (
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">How to Use</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>Configure the number of past and future days</li>
              <li>Upload a CSV file containing historical GNSS error data</li>
              <li>The required columns are: <code className="bg-gray-100 px-2 py-1 rounded">utc_time</code>, <code className="bg-gray-100 px-2 py-1 rounded">x_error(m)</code>, <code className="bg-gray-100 px-2 py-1 rounded">y_error(m)</code>, <code className="bg-gray-100 px-2 py-1 rounded">z_error(m)</code>, <code className="bg-gray-100 px-2 py-1 rounded">satclockerror(m)</code></li>
              <li>The system will automatically generate predictions and display visualizations</li>
              <li>Download the predictions as a CSV file for further analysis</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
