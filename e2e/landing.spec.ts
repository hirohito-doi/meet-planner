import { expect, test } from "@playwright/test";

test("トップは紹介ページで、作成ボタンから作成画面へ進める", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("meet-planner");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("都合を集めて");
  await expect(page.getByRole("heading", { name: "使い方" })).toBeVisible();
  // トップでは日程調整を作らない(フォームは /new にある)
  await expect(page.getByLabel("タイトル(必須)")).toHaveCount(0);

  await page.getByRole("main").getByRole("link", { name: "日程調整を作る" }).first().click();
  await expect(page).toHaveURL(/\/new$/);
  await expect(page).toHaveTitle("新しい日程調整 | meet-planner");
  await expect(page.getByLabel("タイトル(必須)")).toBeVisible();
});

test("上の帯から作成画面へ進め、ロゴで紹介ページに戻れる", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "日程調整を作る" }).click();
  await expect(page).toHaveURL(/\/new$/);
  await page.getByRole("banner").getByRole("link", { name: "meet-planner" }).click();
  await expect(page).toHaveURL(/\/$/);
});
