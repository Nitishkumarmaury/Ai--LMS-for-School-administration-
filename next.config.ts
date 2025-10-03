import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // Disable ESLint during builds for deployment
  },
  typescript: {
    ignoreBuildErrors: true, // Ignore TypeScript errors during build for deployment
  },
};

export default nextConfig;
