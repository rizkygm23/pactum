/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  reactStrictMode: true,
  // Pin Turbopack's workspace root to this app. Without it, Turbopack infers
  // the parent repo as root (nearest package-lock.json) and tries to compile
  // the parent's proxy.ts with this app's "@/" alias, which fails with
  // "Can't resolve '@/lib/session-token'".
  turbopack: {
    root: path.join(__dirname),
  },
};

module.exports = nextConfig;
