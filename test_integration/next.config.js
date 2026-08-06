/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fix Turbopack workspace root detection issue caused by a global package-lock.json
  experimental: {
    turbopack: {
      // @ts-ignore
      root: __dirname,
    }
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
}

module.exports = nextConfig
