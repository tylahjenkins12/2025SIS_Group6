import type { NextConfig } from "next";
import path from "path";

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

  // Fix the workspace root warning by moving outputFileTracingRoot out of experimental
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
