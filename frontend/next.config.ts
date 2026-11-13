// frontend/next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@edificio-xyz/database'],
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30 // 30 días de caché para imágenes estáticas
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn']
          }
        : false
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'jose', 'clsx', 'tailwind-merge']
  }
}

export default nextConfig
