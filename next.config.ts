import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 試作(spike/cloudflare): Cloudflare Workers では Cache Components の描画が setTimeout の扱いの違いで止まる
  // (OpenNext 1.20 時点で未対応。https://github.com/opennextjs/opennextjs-cloudflare/pull/1318)ため切る。
  // 切ると回答画面と管理画面は要求ごとに描く。partialPrefetching は Cache Components とあわせて使う設定なので外した
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

// next dev でも、wrangler.jsonc の D1(手元の .wrangler/ に置かれる)を getCloudflareContext() で使えるようにする
initOpenNextCloudflareForDev();
