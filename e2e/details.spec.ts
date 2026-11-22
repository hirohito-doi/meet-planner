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
  await expect(page.getByText("10:00-12:00")).toBeVisible();

  // 9:00 を開始に選び、10:00-12:00 の候補の上(10:30)を終了としてタップする
  const start = await cellPoint(page, 30);
  const end = await cellPoint(page, 33);
  await page.touchscreen.tap(start.x, start.y);
  await page.touchscreen.tap(end.x, end.y);
  await expect(page.getByText("9:00-11:00")).toBeVisible();
  await expect(page.getByText("新しい候補: 2件")).toBeVisible();
});
