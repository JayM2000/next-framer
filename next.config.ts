import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@hugeicons/react',
      '@hugeicons/core-free-icons',
      'radix-ui',
      '@tiptap/react',
      '@tiptap/starter-kit',
    ],
  },
};

export default nextConfig;
