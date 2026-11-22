import { describe, expect, test } from "vitest";
import { createPoll, join, openAdmin, openResponse, readPoll } from "./index";
import { createTestDb } from "./test-db";

const at = (iso: string) => new Date(iso).getTime();
const DAY = 24 * 60 * 60 * 1000;

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

  test("確定中は、名前を変更できない", async () => {
    const { db, pollId, adminToken, dec3 } = await setup();
    const { editToken } = await join(db, pollId, { name: "田中" });
    const me = await openResponse(db, pollId, editToken);
    await (await openAdmin(db, pollId, adminToken))!.finalize(dec3);

    await expect(me!.rename("田中太郎")).rejects.toMatchObject({ code: "FINALIZED" });
  });

  test("確定中は、タイトルと説明を変更できない", async () => {
    const { db, pollId, adminToken, dec3 } = await setup();
    const admin = await openAdmin(db, pollId, adminToken);
    await admin!.finalize(dec3);

    await expect(admin!.updateDetails({ title: "新年会", description: "" })).rejects.toMatchObject({
      code: "FINALIZED",
    });
  });

  test("確定中は、候補を追加できない", async () => {
    const { db, pollId, adminToken, dec3 } = await setup();
    const admin = await openAdmin(db, pollId, adminToken);
    await admin!.finalize(dec3);

    await expect(
      admin!.addSlots([{ start: at("2026-12-05T19:00:00+09:00"), end: at("2026-12-05T21:00:00+09:00") }]),
    ).rejects.toMatchObject({ code: "FINALIZED" });
  });

  test("確定中でも、確定していない候補を削除でき、確定はそのまま残る", async () => {
    const { db, pollId, adminToken, dec3, dec4 } = await setup();
    const admin = await openAdmin(db, pollId, adminToken);
    await admin!.finalize(dec3);

    await admin!.removeSlot(dec4);

    const poll = await readPoll(db, pollId);
    expect(poll!.slots.map((s) => s.id)).toEqual([dec3]);
    expect(poll!.finalizedSlotId).toBe(dec3);
  });

  test("確定した候補を削除すると、確定が取り消される", async () => {
    const { db, pollId, adminToken, dec3, dec4 } = await setup();
    const admin = await openAdmin(db, pollId, adminToken);
    await admin!.finalize(dec3);

    await admin!.removeSlot(dec3);

    const poll = await readPoll(db, pollId);
    expect(poll!.slots.map((s) => s.id)).toEqual([dec4]);
    expect(poll!.finalizedSlotId).toBeNull();
  });
});

describe("候補の追加", () => {
  test("候補を追加すると時刻順に並び、既存の回答者には未回答として表示される", async () => {
    const { db, pollId, adminToken, dec3 } = await setup();
    const { editToken } = await join(db, pollId, { name: "田中" });
    await (await openResponse(db, pollId, editToken))!.setAvailability(dec3, "yes");
    const admin = await openAdmin(db, pollId, adminToken);

    await admin!.addSlots([{ start: at("2026-12-02T19:00:00+09:00"), end: at("2026-12-02T21:00:00+09:00") }]);

    const poll = (await readPoll(db, pollId))!;
    expect(poll.slots.map((s) => s.start)).toEqual([
      at("2026-12-02T19:00:00+09:00"),
      at("2026-12-03T19:00:00+09:00"),
      at("2026-12-04T19:00:00+09:00"),
    ]);
    expect(poll.responses[0].availabilities).toEqual({ [dec3]: "yes" });
  });

  test("既存の候補と完全に一致する追加分は捨て、既存の候補とその回答を残す", async () => {
    const { db, pollId, adminToken, dec3, dec4 } = await setup();
    const { editToken } = await join(db, pollId, { name: "田中" });
    await (await openResponse(db, pollId, editToken))!.setAvailability(dec3, "yes");
    const admin = await openAdmin(db, pollId, adminToken);

    await admin!.addSlots([
      { start: at("2026-12-03T19:00:00+09:00"), end: at("2026-12-03T21:00:00+09:00") },
      { start: at("2026-12-05T19:00:00+09:00"), end: at("2026-12-05T21:00:00+09:00") },
      { start: at("2026-12-05T19:00:00+09:00"), end: at("2026-12-05T21:00:00+09:00") },
    ]);

    const poll = (await readPoll(db, pollId))!;
    expect(poll.slots.map((s) => s.start)).toEqual([
      at("2026-12-03T19:00:00+09:00"),
      at("2026-12-04T19:00:00+09:00"),
      at("2026-12-05T19:00:00+09:00"),
    ]);
    expect(poll.slots.slice(0, 2).map((s) => s.id)).toEqual([dec3, dec4]);
    expect(poll.responses[0].availabilities).toEqual({ [dec3]: "yes" });
  });

  test("重複をまとめた後の候補が25件を超えるなら、追加できない", async () => {
    const { db, pollId, adminToken } = await setup();
    const admin = await openAdmin(db, pollId, adminToken);
    // 12/10 から毎日 19:00-21:00 の候補を24件(既存の2件と合わせて26件)
    const slots = Array.from({ length: 24 }, (_, i) => ({
      start: at("2026-12-10T19:00:00+09:00") + i * DAY,
      end: at("2026-12-10T21:00:00+09:00") + i * DAY,
    }));

    await expect(admin!.addSlots(slots)).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
  });

  test("既存の候補との重複を含めて送っても、まとめた後に25件なら追加できる", async () => {
    const { db, pollId, adminToken } = await setup();
    const admin = await openAdmin(db, pollId, adminToken);
    // 既存の12/3と同じ候補1件と、12/10 から毎日の候補23件(まとめると既存の2件と合わせて25件)
    const slots = [
      { start: at("2026-12-03T19:00:00+09:00"), end: at("2026-12-03T21:00:00+09:00") },
      ...Array.from({ length: 23 }, (_, i) => ({
        start: at("2026-12-10T19:00:00+09:00") + i * DAY,
        end: at("2026-12-10T21:00:00+09:00") + i * DAY,
      })),
    ];

    await admin!.addSlots(slots);

    expect((await readPoll(db, pollId))!.slots).toHaveLength(25);
  });

  test.each([
    ["終了が開始より前の候補", [{ start: at("2026-12-05T21:00:00+09:00"), end: at("2026-12-05T19:00:00+09:00") }]],
    [
      "101件の候補",
      Array.from({ length: 101 }, () => ({
        start: at("2026-12-05T19:00:00+09:00"),
        end: at("2026-12-05T21:00:00+09:00"),
      })),
    ],
  ])("%sは追加できない", async (_, slots) => {
    const { db, pollId, adminToken } = await setup();
    const admin = await openAdmin(db, pollId, adminToken);

    await expect(admin!.addSlots(slots)).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});

describe("候補の削除", () => {
  test("候補を削除すると、その候補への可否も消える", async () => {
    const { db, pollId, adminToken, dec3, dec4 } = await setup();
    const { editToken } = await join(db, pollId, { name: "田中" });
    const me = await openResponse(db, pollId, editToken);
    await me!.setAvailability(dec3, "yes");
    await me!.setAvailability(dec4, "no");
    const admin = await openAdmin(db, pollId, adminToken);

    await admin!.removeSlot(dec3);

    const poll = (await readPoll(db, pollId))!;
    expect(poll.slots.map((s) => s.id)).toEqual([dec4]);
    expect(poll.responses[0].availabilities).toEqual({ [dec4]: "no" });
  });

  test("別の日程調整の候補は削除できず、その日程調整の回答も消えない", async () => {
    const { db, pollId, adminToken } = await setup();
    const other = await createPoll(db, {
      title: "新年会",
      description: "",
      slots: [{ start: at("2027-01-08T19:00:00+09:00"), end: at("2027-01-08T21:00:00+09:00") }],
    });
    const [jan8] = (await readPoll(db, other.pollId))!.slots.map((s) => s.id);
    const { editToken } = await join(db, other.pollId, { name: "鈴木" });
    await (await openResponse(db, other.pollId, editToken))!.setAvailability(jan8, "yes");
    const admin = await openAdmin(db, pollId, adminToken);

    await expect(admin!.removeSlot(jan8)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect((await readPoll(db, other.pollId))!.responses[0].availabilities).toEqual({ [jan8]: "yes" });
  });

  test("最後の1件の候補も削除できる", async () => {
    const { db, pollId, adminToken, dec3, dec4 } = await setup();
    const admin = await openAdmin(db, pollId, adminToken);

    await admin!.removeSlot(dec3);
    await admin!.removeSlot(dec4);

    expect((await readPoll(db, pollId))!.slots).toEqual([]);
  });
});

describe("回答の削除", () => {
  test("回答を削除すると、その回答者は表から消え、編集用トークンでも開けなくなる", async () => {
    const { db, pollId, adminToken, dec3 } = await setup();
    const tanaka = await join(db, pollId, { name: "田中" });
    await (await openResponse(db, pollId, tanaka.editToken))!.setAvailability(dec3, "yes");
    await join(db, pollId, { name: "鈴木" });
    const admin = await openAdmin(db, pollId, adminToken);

    await admin!.deleteResponse(tanaka.responseId);

    expect((await readPoll(db, pollId))!.responses.map((r) => r.name)).toEqual(["鈴木"]);
    expect(await openResponse(db, pollId, tanaka.editToken)).toBeNull();
  });

  test("別の日程調整の回答は削除できない", async () => {
    const { db, pollId, adminToken } = await setup();
    const other = await createPoll(db, {
      title: "新年会",
      description: "",
      slots: [{ start: at("2027-01-08T19:00:00+09:00"), end: at("2027-01-08T21:00:00+09:00") }],
    });
    const suzuki = await join(db, other.pollId, { name: "鈴木" });
    const admin = await openAdmin(db, pollId, adminToken);

    await expect(admin!.deleteResponse(suzuki.responseId)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect((await readPoll(db, other.pollId))!.responses.map((r) => r.name)).toEqual(["鈴木"]);
  });

  test("確定中でも、回答を削除できる", async () => {
    const { db, pollId, adminToken, dec3 } = await setup();
    const tanaka = await join(db, pollId, { name: "田中" });
    const admin = await openAdmin(db, pollId, adminToken);
    await admin!.finalize(dec3);

    await admin!.deleteResponse(tanaka.responseId);

    expect((await readPoll(db, pollId))!.responses).toEqual([]);
  });
});

describe("日程調整の削除", () => {
  test("削除すると読み取れなくなり、管理トークンでも編集用トークンでも開けなくなる", async () => {
    const { db, pollId, adminToken } = await setup();
    const { editToken } = await join(db, pollId, { name: "田中" });
    const admin = await openAdmin(db, pollId, adminToken);

    await admin!.deletePoll();

    expect(await readPoll(db, pollId)).toBeNull();
    expect(await openAdmin(db, pollId, adminToken)).toBeNull();
    expect(await openResponse(db, pollId, editToken)).toBeNull();
  });

  test("削除しても、ほかの日程調整の回答は消えない", async () => {
    const { db, pollId, adminToken, dec3 } = await setup();
    const tanaka = await join(db, pollId, { name: "田中" });
    await (await openResponse(db, pollId, tanaka.editToken))!.setAvailability(dec3, "yes");
    const other = await createPoll(db, {
      title: "新年会",
      description: "",
      slots: [{ start: at("2027-01-08T19:00:00+09:00"), end: at("2027-01-08T21:00:00+09:00") }],
    });
    const [jan8] = (await readPoll(db, other.pollId))!.slots.map((s) => s.id);
    const suzuki = await join(db, other.pollId, { name: "鈴木" });
    await (await openResponse(db, other.pollId, suzuki.editToken))!.setAvailability(jan8, "maybe");

    await (await openAdmin(db, pollId, adminToken))!.deletePoll();

    expect((await readPoll(db, other.pollId))!.responses).toMatchObject([
      { name: "鈴木", availabilities: { [jan8]: "maybe" } },
    ]);
  });

  test("確定中でも削除できる", async () => {
    const { db, pollId, adminToken, dec3 } = await setup();
    const admin = await openAdmin(db, pollId, adminToken);
    await admin!.finalize(dec3);

    await admin!.deletePoll();

    expect(await readPoll(db, pollId)).toBeNull();
  });
});
