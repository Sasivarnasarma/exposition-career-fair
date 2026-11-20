import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep production builds separate from a running development server.
  distDir: process.env.NODE_ENV === "production" ? ".next-production" : ".next",
  images: { qualities: [75, 90] },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
