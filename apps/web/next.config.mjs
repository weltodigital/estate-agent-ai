/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@app/ui", "@app/shared", "@app/db"],
  experimental: {
    typedRoutes: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.cloudflarestorage.com" },
    ],
  },
  // Konva's Node entry tries to `require('canvas')` even though react-konva is
  // browser-only. Mark canvas external so webpack stops complaining.
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: "commonjs canvas" }];
    return config;
  },
};

export default nextConfig;
