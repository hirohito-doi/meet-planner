import { expect, test } from "@playwright/test";
import { cellPoint, openNextMonth, scrollGridIntoView } from "./helpers";

// 主要な流れ: 主催者が日程調整を作る → 回答者が回答する → 主催者が確定する
// 表の1マスは 22px、初期表示は 8:00 の行(28行目)が上端。10:00 は32行目、13:00 は38行目

test("日程調整を作成し、回答して、確定できる", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "mobile";

  // 作成。カレンダーは今日の月から始まり、日付を押すと表の列になる
  await openNextMonth(page);
  await page.getByLabel("タイトル(必須)").fill("忘年会");
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
  // 最後のタップから少し待って保存される。保存の通信が終わるまで待つ
  const answerSaved = page.waitForResponse(
    (r) => r.request().method() === "POST" && (r.request().postData() ?? "").includes('"yes"') && r.ok(),
  );
  await cell.click();
  await expect(cell).toHaveText("○");
  await answerSaved;

  // 自動で保存されているので、開き直しても残っている(名前の入力も求められない)
  await page.reload();
  await expect(page.getByRole("button", { name: "12/3(木) 10:00-12:00の可否" })).toHaveText("○");
  await expect(page.getByPlaceholder("名前")).toBeHidden();

  // 確定
  await page.goto(adminLink);
  await page.getByRole("button", { name: "この候補で確定する" }).first().click();
  await expect(page.getByRole("button", { name: "確定を取り消す" })).toBeVisible();

  // 確定中でも、表の上で保存済みの候補を選んで削除できる
  await scrollGridIntoView(page);
  const saved = await cellPoint(page, 38);
  if (mobile) await page.touchscreen.tap(saved.x, saved.y);
  else await page.mouse.click(saved.x, saved.y);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "この候補を削除" }).click();
  await expect(page.getByText("12/3(木) 13:00-13:30")).toBeHidden();
  await expect(page.getByRole("button", { name: "確定を取り消す" })).toBeVisible();

  await page.goto(responseLink);
  await expect(page.getByText("日程が確定しました")).toBeVisible();
  await expect(page.getByText("12/3(木) 10:00-12:00", { exact: true })).toBeVisible();
});

test("横にドラッグすると、間の列も含めてどの列にも同じ時刻の候補ができる", async ({ page }, testInfo) => {
  await openNextMonth(page);
  for (const date of ["2026-12-03", "2026-12-04", "2026-12-05"]) await page.getByRole("button", { name: date }).click();

  await scrollGridIntoView(page);
  const from = await cellPoint(page, 32, "12/3(木)");
  const to = await cellPoint(page, 35, "12/5(土)");
  if (testInfo.project.name === "mobile") {
    // スマホ: 開始と終了を別の列でタップする
    await page.touchscreen.tap(from.x, from.y);
    await page.touchscreen.tap(to.x, to.y);
  } else {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.mouse.up();
  }
  await expect(page.getByText("10:00-12:00")).toHaveCount(3);
  await expect(page.getByText("新しい候補: 3件")).toBeVisible();
});
