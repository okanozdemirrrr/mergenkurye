import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // TypeScript hatalarını görmezden gel
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
