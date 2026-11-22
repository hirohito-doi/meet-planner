import { expect, type Page, test } from "@playwright/test";

// 主要な流れ: 主催者が日程調整を作る → 回答者が回答する → 主催者が確定する
// 表の1マスは 22px、初期表示は 8:00 の行(28行目)が上端。10:00 は32行目、13:00 は38行目

const ROW_HEIGHT = 22;

/** 表をページの上端までスクロールする(画面の外のマスは押せないため) */
async function scrollGridIntoView(page: Page) {
  await page.getByLabel("12/3(木)の候補の表").evaluate((el) => el.closest(".overflow-auto")?.scrollIntoView({ block: "start" }));
}

async function cellPoint(page: Page, row: number) {
  const box = await page.getByLabel("12/3(木)の候補の表").boundingBox();
  if (!box) throw new Error("候補の表が見つかりません");
  return { x: box.x + 20, y: box.y + row * ROW_HEIGHT + ROW_HEIGHT / 2 };
}

test("日程調整を作成し、回答して、確定できる", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "mobile";

  // 作成
  await page.goto("/");
  await page.getByLabel("タイトル(必須)").fill("忘年会");
  // 入力欄に日付を入れるとカレンダーがその月になり、カレンダーで日付を押すと表の列になる
  await page.locator('input[type="date"]').fill("2026-12-01");
  await expect(page.getByText("2026年12月")).toBeVisible();
  await page.getByRole("button", { name: "2026-12-03" }).click();
  await expect(page.getByRole("button", { name: "2026-12-03" })).toHaveAttribute("aria-pressed", "true");

  await scrollGridIntoView(page);
  const from = await cellPoint(page, 32);
  const to = await cellPoint(page, 35);
  const single = await cellPoint(page, 38);
  if (mobile) {
    // スマホ: 開始マスと終了マスを順にタップ。同じマスを2回タップすると30分の候補
    await page.touchscreen.tap(from.x, from.y);
    await page.touchscreen.tap(to.x, to.y);
    await page.touchscreen.tap(single.x, single.y);
    await page.touchscreen.tap(single.x, single.y);
  } else {
    // PC: ドラッグ1回で候補1件。1マスだけクリックすると30分の候補
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await page.mouse.up();
    await page.mouse.click(single.x, single.y);
  }
  await expect(page.getByText("10:00-12:00")).toBeVisible();
  await expect(page.getByText("13:00-13:30")).toBeVisible();

  await page.getByRole("button", { name: "日程調整を作成する" }).click();
  await expect(page.getByText("日程調整を作成しました。")).toBeVisible();
  const responseLink = await page.getByRole("textbox").first().inputValue();
  const adminLink = page.url();

  // 回答
  await page.goto(responseLink);
  await page.getByPlaceholder("名前").fill("田中");
  await page.getByRole("button", { name: "回答を始める" }).click();
  const cell = page.getByRole("button", { name: "12/3(木) 10:00-12:00の可否" });
  await cell.click();
  await expect(cell).toHaveText("○");
  // 保存が終わるとスコアに反映される(○ = 2点)
  await expect(page.getByRole("row", { name: /10:00-12:00/ }).getByRole("cell").last()).toHaveText("2");

  // 自動で保存されているので、開き直しても残っている(名前の入力も求められない)
  await page.reload();
  await expect(page.getByRole("button", { name: "12/3(木) 10:00-12:00の可否" })).toHaveText("○");
  await expect(page.getByPlaceholder("名前")).toBeHidden();

  // 確定
  await page.goto(adminLink);
  await page.getByRole("button", { name: "この候補で確定する" }).first().click();
  await expect(page.getByRole("button", { name: "確定を取り消す" })).toBeVisible();

  await page.goto(responseLink);
  await expect(page.getByText("日程が確定しました: 12/3(木) 10:00-12:00")).toBeVisible();
});
