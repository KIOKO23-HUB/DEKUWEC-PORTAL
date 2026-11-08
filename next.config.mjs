/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tree-shake icon imports so client bundles stay small.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  async rewrites() {
    // The Android app download page is plain static files under public/download.
    // This serves them at /download without turning the folder into a route.
    return [{ source: '/download', destination: '/download/index.html' }];
  },
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    ];
    return [
      { source: '/download', headers: securityHeaders },
      { source: '/download/:path*', headers: securityHeaders },
      {
        source: '/download/assets/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Media lives in /public; let browsers and the CDN reuse it.
        source: '/:all*(png|jpg|jpeg|webp|avif|svg|ico|gif)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
};

export default nextConfig;
