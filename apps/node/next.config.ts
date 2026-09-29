import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this folder: a stray lockfile higher up (e.g. in the
  // user's home directory) otherwise makes Turbopack infer the wrong root.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
