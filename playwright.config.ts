import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

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
  webServer: {
    // 本番と同じビルドで確かめる(開発サーバーは同じフォルダで2つ起動できないため、手元の pnpm dev とも干渉しない)
    command: `pnpm build && pnpm start --port ${PORT}`,
    timeout: 180_000,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    // 開発用の DB を汚さないよう、E2E テスト用の DB ファイルを使う
    env: { DATABASE_URL: "file:data/e2e.sqlite" },
  },
});
