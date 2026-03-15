import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false,
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
  },
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@vercel/og/dist/**',
      'node_modules/next/dist/compiled/@vercel/og/**',
      'node_modules/@prisma/engines/**',
    ],
  },
};

export default nextConfig;
