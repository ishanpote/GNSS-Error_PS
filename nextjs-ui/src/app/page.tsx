import Link from 'next/link'
import { Satellite, Home } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Satellite className="w-20 h-20" />
            </div>
            <h1 className="text-5xl font-bold mb-4">
              GNSS Error Forecasting System
            </h1>
            <p className="text-xl text-primary-100 mb-8 max-w-3xl mx-auto">
              Advanced 15-minute resolution GNSS error prediction using ensemble deep learning models.
              Specialized views for Defence, Aviation, and Telecommunication sectors.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/general" className="btn-primary bg-white text-primary-700 hover:bg-primary-50">
                Get Started
              </Link>
              <Link href="/about" className="btn-secondary bg-primary-700 text-white hover:bg-primary-600 border-white">
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Domain Views Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
          Choose Your Domain View
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* General View */}
          <Link href="/general" className="group">
            <div className="card hover:shadow-xl transition-shadow border-2 border-transparent hover:border-primary-400">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-200 transition-colors">
                  <Home className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800">General View</h3>
                <p className="text-gray-600 text-sm">
                  Standard GNSS error forecasting for general applications and research
                </p>
              </div>
            </div>
          </Link>

          {/* Defence View */}
          <Link href="/defence" className="group">
            <div className="card hover:shadow-xl transition-shadow border-2 border-transparent hover:border-defense-400">
              <div className="text-center">
                <div className="w-16 h-16 bg-defense-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-defense-200 transition-colors">
                  <svg className="w-8 h-8 text-defense-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800">Defence</h3>
                <p className="text-gray-600 text-sm">
                  Mission-critical forecasting with enhanced security metrics and reliability
                </p>
              </div>
            </div>
          </Link>

          {/* Aviation View */}
          <Link href="/aviation" className="group">
            <div className="card hover:shadow-xl transition-shadow border-2 border-transparent hover:border-aviation-400">
              <div className="text-center">
                <div className="w-16 h-16 bg-aviation-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-aviation-200 transition-colors">
                  <svg className="w-8 h-8 text-aviation-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800">Aviation</h3>
                <p className="text-gray-600 text-sm">
                  Flight safety-focused forecasting with altitude and trajectory analysis
                </p>
              </div>
            </div>
          </Link>

          {/* Telecommunication View */}
          <Link href="/telecommunication" className="group">
            <div className="card hover:shadow-xl transition-shadow border-2 border-transparent hover:border-telecom-400">
              <div className="text-center">
                <div className="w-16 h-16 bg-telecom-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-telecom-200 transition-colors">
                  <svg className="w-8 h-8 text-telecom-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800">Telecommunication</h3>
                <p className="text-gray-600 text-sm">
                  Network timing precision and signal quality optimization metrics
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Ensemble Models</h3>
              <p className="text-gray-600 text-sm">
                GRU, LSTM, Transformer, and Gaussian Process models working together
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">15-Min Resolution</h3>
              <p className="text-gray-600 text-sm">
                High-frequency predictions with 41 data points per day
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-time Analysis</h3>
              <p className="text-gray-600 text-sm">
                Upload data and get predictions with comprehensive visualizations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
