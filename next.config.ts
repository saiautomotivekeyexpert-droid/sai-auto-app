import type { NextConfig } from "next";

const nextConfig: any = {
  // output: 'export', // Removed to allow API routes (Required for Vercel + Google Sync)
  images: {
    unoptimized: true,
  },
  // @ts-ignore
  eslint: {
    ignoreDuringBuilds: true,
  },
  // @ts-ignore
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
