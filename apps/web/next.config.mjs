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
};

export default nextConfig;
