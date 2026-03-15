import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Disable image optimization for better performance
  images: {
    unoptimized: true,
  },
  
  // TypeScript hatalarını görmezden gel
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
