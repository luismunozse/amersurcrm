import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimizaciones de rendimiento
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'react-hot-toast'],
  },
  
  // Configuración de Server Actions
  serverActions: {
    bodySizeLimit: '10mb', // Aumentar límite para subida de imágenes
  },
  
  // Configuración de Turbopack (nueva sintaxis)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
    resolveAlias: {
      // Alias para mejor resolución de módulos
      '@': './src',
    },
  },
  
  // Compresión
  compress: true,
  
  // Configuración de imágenes
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Headers de caché
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=60'
          }
        ]
      }
    ];
  },
  
  // Solo usar webpack si no estás usando Turbopack
  ...(process.env.TURBOPACK ? {} : {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
        };
      }
      return config;
    },
  }),
};

export default nextConfig;
