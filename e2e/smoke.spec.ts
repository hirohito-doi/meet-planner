import { expect, test } from "@playwright/test";

// 土台の確認用。日程調整の作成 → 回答 → 確定の E2E テストができたら置き換える
test("トップページが表示される", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "meet-planner" })).toBeVisible();
});
