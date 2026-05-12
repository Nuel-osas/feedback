import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  // Don't try to bundle the Walrus WASM module for server builds — it's
  // only used from client components and loads from a CDN URL at runtime.
  serverExternalPackages: ["@mysten/walrus", "@mysten/walrus-wasm"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.walrus.space" },
      { protocol: "https", hostname: "**.walrus-testnet.walrus.space" },
      { protocol: "https", hostname: "**.walrus.mirai.cloud" },
    ],
  },
};

export default nextConfig;
