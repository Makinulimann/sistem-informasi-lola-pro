import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false,
  // Exclude Node.js packages from Edge bundle
  serverExternalPackages: [
    'bcryptjs',
    '@prisma/client',
    '@prisma/adapter-pg',
    'pg',
    'jose',
  ],
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
  },
};

export default nextConfig;
