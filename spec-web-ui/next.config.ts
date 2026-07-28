import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  outputFileTracingIncludes: {
    "/*": [
      "./workspace/**/*",
      "../rules/**/*",
      "../.prd/**/*",
      "../.features/**/*",
      "../.issues/**/*",
      "../ai/**/*",
      "../assets/**/*",
      "../packages/catalog/config/**/*",
      "../skills/developer/**/*"
    ]
  }
};

export default nextConfig;
