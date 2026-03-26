/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'playwright', '@vercel/blob'],
  },
  webpack(config, { isServer }) {
    if (isServer) {
      // playwright and @vercel/blob are optional — don't fail if not installed
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        playwright: false,
      };
      // Mark optional packages as externals so webpack doesn't try to bundle them
      const existing = config.externals ?? [];
      config.externals = [
        ...(Array.isArray(existing) ? existing : [existing]),
        '@vercel/blob',
      ];
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/api/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/api/v1/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/rss.xml',
        headers: [
          { key: 'Cache-Control', value: 's-maxage=3600, stale-while-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
