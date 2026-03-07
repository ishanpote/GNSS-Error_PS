export interface GNSSData {
  utc_time: string
  'x_error(m)': number
  'y_error(m)': number
  'z_error(m)': number
  'satclockerror(m)': number
}

export interface PredictionRequest {
  data: GNSSData[]
  n_past_days: number
  n_future_days: number
}

export interface PredictionResponse {
  predictions: GNSSData[]
  models_used: string[]
  metrics?: {
    rmse?: number
    mae?: number
    accuracy?: number
  }
  processing_time?: number
}

export interface ModelMetrics {
  model_name: string
  rmse: number
  mae: number
  r2_score: number
}

export interface DomainConfig {
  name: string
  color: string
  icon: string
  description: string
  specialMetrics?: string[]
}

export const DOMAIN_CONFIGS: Record<string, DomainConfig> = {
  general: {
    name: 'General',
    color: 'primary',
    icon: 'home',
    description: 'Standard GNSS error forecasting',
  },
  defence: {
    name: 'Defence',
    color: 'defense',
    icon: 'shield',
    description: 'Mission-critical GNSS forecasting',
    specialMetrics: ['Security Level', 'Integrity Risk', 'Availability'],
  },
  aviation: {
    name: 'Aviation',
    color: 'aviation',
    icon: 'plane',
    description: 'Flight safety-focused forecasting',
    specialMetrics: ['Vertical Alert Limit', 'Horizontal Alert Limit', 'Flight Phase'],
  },
  telecommunication: {
    name: 'Telecommunication',
    color: 'telecom',
    icon: 'signal',
    description: 'Network timing and precision',
    specialMetrics: ['Timing Accuracy', 'Phase Stability', 'Network Sync'],
  },
}
