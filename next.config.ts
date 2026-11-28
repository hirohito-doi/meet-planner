import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // true にすると、ページを直接開いた(全体を読み込んだ)後に Server Action の中で refresh() しても、
  // 描き直した画面が反映されない(Next.js 16.4.6 で確認)。<Link> の先読みにはほとんど頼らないので無効にする
  partialPrefetching: false,
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
