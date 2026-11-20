import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep production builds separate from a running development server.
  distDir:
    process.env.NODE_ENV === "production"
      ? ".next-production"
      : process.env.EXPOSITION_QA === "true"
        ? ".next-qa"
        : ".next",
  images: { qualities: [75, 90] },
  async headers() {
    return [
      {
        source: "/:section(admin|register|registration)/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
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
