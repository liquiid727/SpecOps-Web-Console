import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  outputFileTracingIncludes: {
    "/*": [
      "./catalog/**/*",
      "./workspace/**/*",
      "../rules/**/*",
      "../spec-draft/**/*",
      "../specs/**/*",
      "../ai/**/*",
      "../agent-teams/**/*",
      "../.skills/**/*"
    ]
  }
};

export default nextConfig;
