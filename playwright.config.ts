import { defineConfig, devices } from "@playwright/test";

// E2E_TARGET=workers のときは、Cloudflare Workers 向けにビルドして wrangler dev(D1 はローカルのまね)で確かめる。
// OpenNext のビルドは Windows ではできないので、Linux(CI や WSL)で使う。ふだんは Node(next start + libsql)で確かめる
const WORKERS = process.env.E2E_TARGET === "workers";
const PORT = WORKERS ? 8787 : 3100;

// 主要な流れ(日程調整の作成 → 回答 → 確定)の E2E テスト用
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: WORKERS
    ? {
        // E2E は短い時間に何十件も作るので、回数制限は外す(制限そのものは単体テストで確かめる)
        command: "pnpm cf:build && pnpm cf:preview --var RATE_LIMIT:off",
        timeout: 300_000,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
      }
    : {
        // 本番と同じビルドで確かめる(開発サーバーは同じフォルダで2つ起動できないため、手元の pnpm dev とも干渉しない)
        command: `pnpm build && pnpm start --port ${PORT}`,
        timeout: 180_000,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        // 開発用の DB を汚さないよう、E2E テスト用の DB ファイルを使う
        env: { DATABASE_URL: "file:data/e2e.sqlite" },
      },
});
