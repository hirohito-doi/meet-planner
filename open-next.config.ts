import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// 再検証(revalidate)は使わないので、ビルド時に作ったページを静的ファイルとして読むだけのキャッシュにする。
// enableCacheInterception: キャッシュにあるページ(トップ、作成画面)は、Next.js 本体を動かす前に返す(OpenNext の推奨)
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
