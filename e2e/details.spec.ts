import { expect, test } from "@playwright/test";
import { cellPoint, createPollWithOneSlot, openNextMonth, scrollGridIntoView } from "./helpers";

// 主要な流れ(flow.spec.ts)の外にある、細かい振る舞い

test("回答画面のブラウザにはスコアを送らない", async ({ page }, testInfo) => {
  const { responseLink, adminLink } = await createPollWithOneSlot(page, testInfo.project.name === "mobile");

  // 管理画面のデータには順位(ranking)が入っている。比べる相手として確かめておく
  await page.goto(adminLink);
  expect(await page.content()).toContain("ranking");

  await page.goto(responseLink);
  await expect(page.getByPlaceholder("名前")).toBeVisible();
  expect(await page.content()).not.toContain("ranking");
});

test("保存している間に同じマスをまたタップしても、表示は前の値に戻らない", async ({ page }, testInfo) => {
  const { responseLink } = await createPollWithOneSlot(page, testInfo.project.name === "mobile");
  await page.goto(responseLink);
  await page.getByPlaceholder("名前").fill("田中");
  await page.getByRole("button", { name: "回答を始める" }).click();
  const cell = page.getByRole("button", { name: "12/3(木) 10:00-12:00の可否" });
  await expect(cell).toBeVisible();

  // ○ の保存を少し遅らせ、その間に △ にする。○ の保存は、△ の保存が始まる前(タップから 400ms 以内)に終わる
  await page.route(responseLink, async (route) => {
    if (route.request().method() === "POST" && (route.request().postData() ?? "").includes('"yes"')) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    await route.continue();
  });
  // マスの表示が変わるたびに記録する
  await cell.evaluate((el) => {
    const w = window as unknown as { texts: string[] };
    w.texts = [];
    new MutationObserver(() => w.texts.push(el.textContent ?? "")).observe(el, { subtree: true, childList: true, characterData: true });
  });

  const yesSent = page.waitForRequest((r) => r.method() === "POST" && (r.postData() ?? "").includes('"yes"'));
  const maybeSaved = page.waitForResponse((r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes('"maybe"'));
  await cell.click();
  await expect(cell).toHaveText("○");
  await yesSent;
  await cell.click();
  await expect(cell).toHaveText("△");
  await maybeSaved;
  await page.waitForTimeout(300);

  const texts = await page.evaluate(() => (window as unknown as { texts: string[] }).texts);
  expect(texts.at(-1)).toBe("△");
  // △ にした後で ○ に戻っていない
  expect(texts.slice(texts.indexOf("△"))).not.toContain("○");
});

test("スマホで開始を選んだ後は、既存の候補の上をタップしても終了になる", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "スマホだけの操作");
  await openNextMonth(page);
  await page.getByRole("button", { name: "2026-12-03" }).click();
  await scrollGridIntoView(page);
  // 10:00-12:00 を作る
  const from = await cellPoint(page, 32);
  const to = await cellPoint(page, 35);
  await page.touchscreen.tap(from.x, from.y);
  await page.touchscreen.tap(to.x, to.y);
  await expect(page.getByText("10:00-12:00", { exact: true })).toBeVisible();

  // 9:00 を開始に選び、10:00-12:00 の候補の上(10:30)を終了としてタップする
  const start = await cellPoint(page, 30);
  const end = await cellPoint(page, 33);
  await page.touchscreen.tap(start.x, start.y);
  await page.touchscreen.tap(end.x, end.y);
  await expect(page.getByText("9:00-11:00", { exact: true })).toBeVisible();
  await expect(page.getByText("候補 2 件")).toBeVisible();
});

test("回答画面では、自分の列が候補の列のすぐ右に来る", async ({ page, browser }, testInfo) => {
  const { responseLink } = await createPollWithOneSlot(page, testInfo.project.name === "mobile");
  // 先に別の人が登録する
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto(responseLink);
  await otherPage.getByPlaceholder("名前").fill("佐藤");
  await otherPage.getByRole("button", { name: "回答を始める" }).click();
  await expect(otherPage.getByRole("columnheader", { name: "佐藤" })).toBeVisible();
  await other.close();

  await page.goto(responseLink);
  await page.getByPlaceholder("名前").fill("田中");
  await page.getByRole("button", { name: "回答を始める" }).click();
  await expect(page.getByRole("columnheader").nth(1)).toHaveText("田中");
  await expect(page.getByRole("columnheader").nth(2)).toHaveText("佐藤");
});

test("管理画面のカレンダーは、保存済みの候補がある月から始まる", async ({ page }, testInfo) => {
  // 今日は 2026-11-22、候補は 12/3
  const { adminLink } = await createPollWithOneSlot(page, testInfo.project.name === "mobile");
  await page.goto(adminLink);
  await expect(page.getByText("2026年12月")).toBeVisible();
});

test("スマホで回答者が多くても、ページは画面の幅に収まり、表の中で横にスクロールする", async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "スマホの画面幅で起きること");
  const { responseLink } = await createPollWithOneSlot(page, true);
  // ○ を付けた回答者を6人にして、表を画面の幅より広くする
  for (const name of ["佐藤", "鈴木", "高橋", "伊藤", "渡辺", "山本"]) {
    const context = await browser.newContext();
    const other = await context.newPage();
    await other.goto(responseLink);
    await other.getByPlaceholder("名前").fill(name);
    await other.getByRole("button", { name: "回答を始める" }).click();
    const saved = other.waitForResponse((r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes('"yes"'));
    await other.getByRole("button", { name: /の可否$/ }).click();
    await saved;
    await context.close();
  }

  await page.goto(responseLink);
  await expect(page.getByRole("columnheader", { name: "山本" })).toBeAttached();
  const widths = await page.evaluate(() => ({ viewport: window.innerWidth, page: document.documentElement.scrollWidth }));
  expect(widths.viewport).toBe(412);
  expect(widths.page).toBeLessThanOrEqual(widths.viewport);
});

test("回答画面のリンクのプレビューには日程調整のタイトルを出し、検索エンジンには載せない", async ({ page }, testInfo) => {
  const { responseLink, adminLink } = await createPollWithOneSlot(page, testInfo.project.name === "mobile");

  await page.goto(responseLink);
  await expect(page).toHaveTitle("忘年会 | meet-planner");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "忘年会");
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");

  // 管理画面のタイトルには、日程調整のタイトルを出さない
  await page.goto(adminLink);
  await expect(page).toHaveTitle("管理画面 | meet-planner");
});

test("存在しない日程調整や、正しくない管理用リンクを開くと、見つからないと案内する", async ({ page }, testInfo) => {
  const { adminLink } = await createPollWithOneSlot(page, testInfo.project.name === "mobile");

  // 画面の枠を先に送る作りのため、応答の状態コードは 200 のまま。画面の案内だけを確かめる
  await page.goto("/p/does-not-exist");
  await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();

  await page.goto(adminLink.replace(/[^/]+$/, "wrong-token"));
  await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
  await expect(page.getByText("忘年会")).toHaveCount(0);
});
