import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this folder: a stray lockfile higher up (e.g. in the
  // user's home directory) otherwise makes Turbopack infer the wrong root.
  turbopack: {
    root: path.join(__dirname),
  },
  // The released model (run.json, heads, backbone) and the sample photos are public: any state node's page may use them.
  async headers() {
    const cors = [
      { key: "Access-Control-Allow-Origin", value: "*" },
      { key: "Access-Control-Allow-Methods", value: "GET, HEAD, OPTIONS" },
    ];
    return [
      { source: "/fl/:path*", headers: cors },
      { source: "/models/:path*", headers: cors },
      { source: "/gallery/:path*", headers: cors }, // attributed sample photos for the nodes' demos
    ];
  },
};

export default nextConfig;
