/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@privett/core"],
  // The worker and web share packages/core as TypeScript source.
  typedRoutes: false,
  // Lets parallel local builds use separate output folders (NEXT_DIST_DIR=.next-x).
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
