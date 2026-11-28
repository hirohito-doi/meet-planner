import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// 再検証(revalidate)は使わないので、ビルド時に作ったページを静的ファイルとして読むだけのキャッシュにする
export default defineCloudflareConfig({ incrementalCache: staticAssetsIncrementalCache });
