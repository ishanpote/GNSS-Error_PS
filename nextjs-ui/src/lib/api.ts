import axios from 'axios'
import type { PredictionRequest, PredictionResponse, GNSSData } from '@/types'

const API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000'

export const api = {
  // Upload CSV and get predictions
  async predictFromCSV(
    file: File,
    nPastDays: number = 7,
    nFutureDays: number = 1
  ): Promise<PredictionResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('n_past_days', nPastDays.toString())
    formData.append('n_future_days', nFutureDays.toString())

    const response = await axios.post(`${API_URL}/api/predict`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Direct prediction from data
  async predict(request: PredictionRequest): Promise<PredictionResponse> {
    const response = await axios.post(`${API_URL}/api/predict-json`, request)
    return response.data
  },

  // Get model information
  async getModelInfo(): Promise<any> {
    const response = await axios.get(`${API_URL}/api/models`)
    return response.data
  },

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_URL}/api/health`)
      return response.data.status === 'healthy'
    } catch {
      return false
    }
  },
}

// Utility functions for data processing
export const dataUtils = {
  parseCSV(csvText: string): GNSSData[] {
    const lines = csvText.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim())
    
    return lines.slice(1).map(line => {
      const values = line.split(',')
      const row: any = {}
      headers.forEach((header, i) => {
        const value = values[i]?.trim()
        if (header === 'utc_time') {
          row[header] = value
        } else {
          row[header] = parseFloat(value) || 0
        }
      })
      return row as GNSSData
    })
  },

  downloadCSV(data: GNSSData[], filename: string = 'predictions.csv') {
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => row[h as keyof GNSSData]).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  },

  calculateMetrics(predictions: GNSSData[], actual?: GNSSData[]) {
    if (!actual || actual.length === 0) {
      return {
        mean_x_error: predictions.reduce((sum, p) => sum + p['x_error(m)'], 0) / predictions.length,
        mean_y_error: predictions.reduce((sum, p) => sum + p['y_error(m)'], 0) / predictions.length,
        mean_z_error: predictions.reduce((sum, p) => sum + p['z_error(m)'], 0) / predictions.length,
        mean_clock_error: predictions.reduce((sum, p) => sum + p['satclockerror(m)'], 0) / predictions.length,
      }
    }
    
    // Calculate RMSE if actual data is available
    let sumSquaredErrors = { x: 0, y: 0, z: 0, clock: 0 }
    const n = Math.min(predictions.length, actual.length)
    
    for (let i = 0; i < n; i++) {
      sumSquaredErrors.x += Math.pow(predictions[i]['x_error(m)'] - actual[i]['x_error(m)'], 2)
      sumSquaredErrors.y += Math.pow(predictions[i]['y_error(m)'] - actual[i]['y_error(m)'], 2)
      sumSquaredErrors.z += Math.pow(predictions[i]['z_error(m)'] - actual[i]['z_error(m)'], 2)
      sumSquaredErrors.clock += Math.pow(predictions[i]['satclockerror(m)'] - actual[i]['satclockerror(m)'], 2)
    }
    
    return {
      rmse_x: Math.sqrt(sumSquaredErrors.x / n),
      rmse_y: Math.sqrt(sumSquaredErrors.y / n),
      rmse_z: Math.sqrt(sumSquaredErrors.z / n),
      rmse_clock: Math.sqrt(sumSquaredErrors.clock / n),
    }
  }
}
