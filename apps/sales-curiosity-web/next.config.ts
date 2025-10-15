import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: [
      "react",
      "react-dom",
    ],
  },
  // Increase body size limit for file uploads
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
};

export default nextConfig;

