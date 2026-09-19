// frontend/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@edificio-xyz/database'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
