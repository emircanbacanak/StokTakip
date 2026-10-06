import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep an explicit turbopack config object so Next's validator is satisfied.
  // Use an empty object to allow Turbopack to run while keeping custom webpack.
  turbopack: {},
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.dsmcdn.com",
      },
      {
        protocol: "https",
        hostname: "cdn.dsmcdn.com",
      },
      {
        protocol: "https",
        hostname: "**.mncdn.com",
      },
      {
        protocol: "https",
        hostname: "i.ibb.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    
    // WebAssembly uyarılarını bastır
    if (!isServer) {
      config.infrastructureLogging = {
        level: 'error',
      };
    }
    
    return config;
  },
};

export default nextConfig;
