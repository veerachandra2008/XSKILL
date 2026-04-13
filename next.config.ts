import type { NextConfig } from "next";

const apiProxyTarget =
  process.env.XSKILL_API_PROXY_TARGET?.trim() ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  "http://127.0.0.1:5001";

const nextConfig: NextConfig = {
  output: "standalone",

  typescript: {
    ignoreBuildErrors: true,
  },

  reactStrictMode: false,

  devIndicators: false,   // ✅ ADD THIS LINE

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
