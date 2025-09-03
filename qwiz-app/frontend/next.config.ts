import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disables the ESLint check during the build process.
  // This will ignore all linting errors and warnings.
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disables the TypeScript check during the build process.
  // This will allow the build to proceed even if there are type errors.
  typescript: {
    ignoreBuildErrors: true,
  },

  output: 'standalone',
};

export default nextConfig;
