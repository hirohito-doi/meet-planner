import { describe, expect, test } from "vitest";
import { createPoll, join, openAdmin, openResponse, readPoll } from "./index";
import { createTestDb } from "./test-db";

const at = (iso: string) => new Date(iso).getTime();

/** 候補が2件(12/3 と 12/4 の 19:00-21:00)ある日程調整を作る */
async function setup() {
  const db = await createTestDb();
  const { pollId, adminToken } = await createPoll(db, {
    title: "忘年会",
    description: "",
    slots: [
      { start: at("2026-12-03T19:00:00+09:00"), end: at("2026-12-03T21:00:00+09:00") },
      { start: at("2026-12-04T19:00:00+09:00"), end: at("2026-12-04T21:00:00+09:00") },
    ],
  });
  const poll = await readPoll(db, pollId);
  const [dec3, dec4] = poll!.slots.map((s) => s.id);
  return { db, pollId, adminToken, dec3, dec4 };
}

describe("管理者として開く", () => {
  test("でたらめな管理トークンでは開けない", async () => {
    const { db, pollId } = await setup();

    expect(await openAdmin(db, pollId, "not-a-token")).toBeNull();
  });

  test("別の日程調整の管理トークンでは開けない", async () => {
    const { db, pollId } = await setup();
    const other = await createPoll(db, {
      title: "新年会",
      description: "",
      slots: [{ start: at("2027-01-08T19:00:00+09:00"), end: at("2027-01-08T21:00:00+09:00") }],
    });

    expect(await openAdmin(db, pollId, other.adminToken)).toBeNull();
  });

  test("回答者の編集用トークンでは開けない", async () => {
    const { db, pollId } = await setup();
    const { editToken } = await join(db, pollId, { name: "田中" });

    expect(await openAdmin(db, pollId, editToken)).toBeNull();
  });
});

describe("タイトルと説明の編集", () => {
  test("管理トークンで開いてタイトルと説明を変更すると、回答画面に表示される", async () => {
    const { db, pollId, adminToken } = await setup();

    const admin = await openAdmin(db, pollId, adminToken);
    await admin!.updateDetails({ title: "2026年 忘年会", description: "会場は駅前です" });

    expect(await readPoll(db, pollId)).toMatchObject({ title: "2026年 忘年会", description: "会場は駅前です" });
  });

  test.each([
    ["タイトルが空白だけ", { title: " ", description: "" }],
    ["タイトルが101文字", { title: "あ".repeat(101), description: "" }],
    ["説明が1,001文字", { title: "忘年会", description: "あ".repeat(1001) }],
  ])("%sなら変更できない", async (_, details) => {
    const { db, pollId, adminToken } = await setup();
    const admin = await openAdmin(db, pollId, adminToken);

    await expect(admin!.updateDetails(details)).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});

describe("確定", () => {
  test("候補を1件選んで確定すると、回答画面に確定した候補が示される", async () => {
    const { db, pollId, adminToken, dec4 } = await setup();
    const admin = await openAdmin(db, pollId, adminToken);

    await admin!.finalize(dec4);

    expect(await readPoll(db, pollId)).toMatchObject({ finalizedSlotId: dec4 });
  });

  test("この日程調整にない候補は確定できない", async () => {
    const { db, pollId, adminToken } = await setup();
    const admin = await openAdmin(db, pollId, adminToken);

    await expect(admin!.finalize("other-poll-slot")).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  test("確定中に別の候補を選ぶと、確定し直せる", async () => {
    const { db, pollId, adminToken, dec3, dec4 } = await setup();
    const admin = await openAdmin(db, pollId, adminToken);
    await admin!.finalize(dec3);

    await admin!.finalize(dec4);

    expect(await readPoll(db, pollId)).toMatchObject({ finalizedSlotId: dec4 });
  });

  test("確定を取り消すと、確定していない状態に戻る", async () => {
    const { db, pollId, adminToken, dec3 } = await setup();
    const admin = await openAdmin(db, pollId, adminToken);
    await admin!.finalize(dec3);

    await admin!.unfinalize();

    expect(await readPoll(db, pollId)).toMatchObject({ finalizedSlotId: null });
  });
});

describe("確定中は読み取り専用", () => {
  test("確定中は、回答者として登録できない", async () => {
    const { db, pollId, adminToken, dec3 } = await setup();
    await (await openAdmin(db, pollId, adminToken))!.finalize(dec3);

    await expect(join(db, pollId, { name: "田中" })).rejects.toMatchObject({ code: "FINALIZED" });
  });

  test("確定中は、可否を保存できない", async () => {
    const { db, pollId, adminToken, dec3 } = await setup();
    const { editToken } = await join(db, pollId, { name: "田中" });
    const me = await openResponse(db, pollId, editToken);
    await (await openAdmin(db, pollId, adminToken))!.finalize(dec3);

    await expect(me!.setAvailability(dec3, "yes")).rejects.toMatchObject({ code: "FINALIZED" });
  });

  test("確定中は、名前とコメントを保存できない", async () => {
    const { db, pollId, adminToken, dec3 } = await setup();
    const { editToken } = await join(db, pollId, { name: "田中" });
    const me = await openResponse(db, pollId, editToken);
    await (await openAdmin(db, pollId, adminToken))!.finalize(dec3);

    await expect(me!.updateProfile({ name: "田中太郎", comment: "" })).rejects.toMatchObject({ code: "FINALIZED" });
  });

  test("確定中は、タイトルと説明を変更できない", async () => {
    const { db, pollId, adminToken, dec3 } = await setup();
    const admin = await openAdmin(db, pollId, adminToken);
    await admin!.finalize(dec3);

    await expect(admin!.updateDetails({ title: "新年会", description: "" })).rejects.toMatchObject({
      code: "FINALIZED",
    });
  });
});
