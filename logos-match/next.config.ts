import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    allowedRevalidateHeaderKeys: ['x-vercel-protection-bypass'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'coresg-normal.trae.ai',
      },
    ],
  },
  // Add allowedDevOrigins to fix HMR/client-side JS in the agent sandbox
  allowedDevOrigins: [
    'localhost',
    'localhost:3000',
    'run-agent-69dfadc7ddd52654c053d7af-mo8sha4x.remote-agent.svc.cluster.local'
  ],
};

export default nextConfig;
