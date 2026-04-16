import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { hostname: "images.weserv.nl" },
      { hostname: "ad-cdn.hrgame.com.cn" },
    ],
  },
};

export default nextConfig;
