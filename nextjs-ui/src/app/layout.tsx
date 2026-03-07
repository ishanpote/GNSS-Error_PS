import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GNSS Error Forecasting System',
  description: '15-Minute GNSS Error Forecasting with Multi-Domain Views',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-1">
            {children}
          </main>
          <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className="text-center text-gray-600 text-sm">
                © 2026 GNSS Error Forecasting System. All rights reserved.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
