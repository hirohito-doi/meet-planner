import { expect, type Page } from "@playwright/test";

// 表の1マスは 22px、初期表示は 8:00 の行(28行目)が上端。10:00 は32行目、13:00 は38行目
const ROW_HEIGHT = 22;

/** 表をページの上端までスクロールする(画面の外のマスは押せないため) */
export async function scrollGridIntoView(page: Page) {
  await page.getByLabel("12/3(木)の候補の表").evaluate((el) => el.closest(".overflow-auto")?.scrollIntoView({ block: "start" }));
}

/** 今日を 2026-11-22 に固定して作成画面を開き、カレンダーを 2026年12月 に進める */
export async function openNextMonth(page: Page) {
  await page.clock.setFixedTime(new Date("2026-11-22T12:00:00+09:00"));
  await page.goto("/new");
  await expect(page.getByText("2026年11月")).toBeVisible();
  await page.getByRole("button", { name: "次の月" }).click();
  await expect(page.getByText("2026年12月")).toBeVisible();
}

export async function cellPoint(page: Page, row: number, day = "12/3(木)") {
  const box = await page.getByLabel(`${day}の候補の表`).boundingBox();
  if (!box) throw new Error("候補の表が見つかりません");
  return { x: box.x + 20, y: box.y + row * ROW_HEIGHT + ROW_HEIGHT / 2 };
}

/** 12/3 10:00-12:00 の候補が1件ある日程調整を作る。回答用リンクと管理用リンクを返す */
export async function createPollWithOneSlot(page: Page, mobile: boolean) {
  await openNextMonth(page);
  await page.getByLabel("タイトル(必須)").fill("忘年会");
  await page.getByRole("button", { name: "2026-12-03" }).click();
  await scrollGridIntoView(page);
  const from = await cellPoint(page, 32);
  const to = await cellPoint(page, 35);
  if (mobile) {
    await page.touchscreen.tap(from.x, from.y);
    await page.touchscreen.tap(to.x, to.y);
  } else {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await page.mouse.up();
  }
  await page.getByRole("button", { name: "この内容で作成する" }).click();
  await expect(page.getByText("日程調整を作りました。")).toBeVisible();
  return { responseLink: await page.getByRole("textbox").first().inputValue(), adminLink: page.url() };
}
