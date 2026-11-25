import type { NextConfig } from "next";
import { securityHeaders } from "./src/config/security-headers";

const nextConfig: NextConfig = {
  // Local previews also use the numeric loopback address for development HMR.
  allowedDevOrigins: ["127.0.0.1"],
  // Vercel uses the standard output; local builds stay separate from dev caches.
  distDir:
    process.env.NODE_ENV === "production"
      ? process.env.VERCEL === "1"
        ? ".next"
        : ".next-production"
      : process.env.EXPOSITION_QA === "true"
        ? ".next-qa"
        : ".next",
  poweredByHeader: false,
  images: { qualities: [75, 90] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(process.env.NODE_ENV === "production"),
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/:section(admin|register|registration|verify-email)/:path*",
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
