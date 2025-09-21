/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  webpack: (config, { isServer, webpack }) => {
    // Externalize problematic packages for client-side builds
    if (!isServer) {
      config.externals.push('pino-pretty', 'lokijs', 'encoding');
    }

    // Add fallbacks for node modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    return config;
  },
};

export default nextConfig;