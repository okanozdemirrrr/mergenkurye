import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Static export for Capacitor
  output: 'export',
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  
  // TypeScript hatalarını görmezden gel
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
