/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable static export for Electron production build
  output: 'export',

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
