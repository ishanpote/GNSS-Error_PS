/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    PYTHON_API_URL: process.env.PYTHON_API_URL || 'http://localhost:8000',
  },
}

module.exports = nextConfig
