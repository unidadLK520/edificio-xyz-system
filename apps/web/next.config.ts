// apps/web/next.config.ts
// Configuración de Next.js para la aplicación web

import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@edificio-xyz/database'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

