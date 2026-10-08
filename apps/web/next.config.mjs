/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@privett/core"],
  // The worker and web share packages/core as TypeScript source.
  typedRoutes: false,
};

export default nextConfig;
