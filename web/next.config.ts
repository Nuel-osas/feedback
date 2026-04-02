import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.walrus.space" },
      { protocol: "https", hostname: "**.walrus-testnet.walrus.space" },
    ],
  },
};

export default nextConfig;
