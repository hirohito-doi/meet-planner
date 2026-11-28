import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Cloudflare Workers では Cache Components の描画が setTimeout の扱いの違いで止まるため切る(ADR 0005)。
  // OpenNext 1.20 時点で未対応: https://github.com/opennextjs/opennextjs-cloudflare/pull/1318
  cacheComponents: false,
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
