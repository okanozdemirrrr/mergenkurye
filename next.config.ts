import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sadece lokalde (Capacitor için) export kullan. Vercel üzerinde API rotalarının silinmemesi için standart build al.
  ...(process.env.VERCEL ? {} : { output: 'export' }),

  images: {
    unoptimized: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  // Turbopack için boş config (hataları susturmak için)
  turbopack: {},
};

export default nextConfig;
