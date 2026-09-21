import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to this repo: stray lockfiles exist
  // above it (e.g. C:\Users\HP\package-lock.json), which otherwise triggers
  // workspace-root inference warnings and mis-scoped file resolution.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
