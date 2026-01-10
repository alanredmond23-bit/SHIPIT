/** @type {import('next').NextConfig} */

// Only use static export for production Electron builds
// Development mode needs dynamic features (middleware, API routes)
const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';

const nextConfig = {
  reactStrictMode: true,

  // Enable static export ONLY for Electron production build
  // Development uses dynamic server for middleware support
  ...(isStaticExport && { output: 'export' }),

  // Disable image optimization for static export (not compatible)
  images: {
    unoptimized: true,
  },

  // Base path for production (file:// protocol in Electron)
  // Note: Leave empty for Electron - paths are handled by electron-builder
  basePath: '',

  // Trailing slashes for static file compatibility
  trailingSlash: true,

  // PWA and security headers (only for web deployment, not Electron)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },

  // Webpack configuration for Electron compatibility
  webpack: (config, { isServer }) => {
    // Handle Electron-specific modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
