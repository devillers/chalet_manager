/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Bypass Next.js image optimizer to avoid private-IP resolution issues
    // in some IPv6/NAT64 environments when fetching remote images.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
    dangerouslyAllowSVG: true,
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

export default nextConfig
