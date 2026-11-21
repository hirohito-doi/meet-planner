import { describe, expect, test } from "vitest";
import { createPoll, join, openResponse, readPoll } from "./index";
import { createTestDb } from "./test-db";

const at = (iso: string) => new Date(iso).getTime();

/** 候補が2件(12/3 と 12/4 の 19:00-21:00)ある日程調整を作る */
async function setup() {
  const db = await createTestDb();
  const { pollId } = await createPoll(db, {
    title: "忘年会",
    description: "",
    slots: [
      { start: at("2026-12-03T19:00:00+09:00"), end: at("2026-12-03T21:00:00+09:00") },
      { start: at("2026-12-04T19:00:00+09:00"), end: at("2026-12-04T21:00:00+09:00") },
    ],
  });
  const poll = await readPoll(db, pollId);
  const [dec3, dec4] = poll!.slots.map((s) => s.id);
  return { db, pollId, dec3, dec4 };
}

describe("回答者としての登録", () => {
  test("登録すると、すべて未回答でコメントのない回答者として表示される", async () => {
    const { db, pollId } = await setup();

    await join(db, pollId, { name: "田中" });

    expect((await readPoll(db, pollId))?.responses).toMatchObject([
      { name: "田中", availabilities: {}, comment: "" },
    ]);
  });

  test("存在しない日程調整には登録できない", async () => {
    const db = await createTestDb();

    await expect(join(db, "no-such-poll", { name: "田中" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test.each([
    ["空", ""],
    ["空白だけ", "　 "],
    ["31文字", "あ".repeat(31)],
  ])("名前が%sなら登録できない", async (_, name) => {
    const { db, pollId } = await setup();

    await expect(join(db, pollId, { name })).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  test("名前は前後の空白を取り除いて保存し、取り除いた後の30文字までは登録できる", async () => {
    const { db, pollId } = await setup();
    const name = "あ".repeat(30);

    await join(db, pollId, { name: ` ${name}\n` });

    expect((await readPoll(db, pollId))?.responses).toMatchObject([{ name }]);
  });
});

describe("可否の保存", () => {
  test("編集用トークンで開いて可否を保存すると、回答画面に表示される", async () => {
    const { db, pollId, dec3, dec4 } = await setup();
    const { editToken } = await join(db, pollId, { name: "田中" });

    const me = await openResponse(db, pollId, editToken);
    await me!.setAvailability(dec3, "yes");
    await me!.setAvailability(dec4, "no");

    expect((await readPoll(db, pollId))?.responses).toMatchObject([
      { name: "田中", availabilities: { [dec3]: "yes", [dec4]: "no" } },
    ]);
  });

  test("同じ候補の可否を付け直すと、新しい値に変わる", async () => {
    const { db, pollId, dec3 } = await setup();
    const { editToken } = await join(db, pollId, { name: "田中" });
    const me = await openResponse(db, pollId, editToken);

    await me!.setAvailability(dec3, "yes");
    await me!.setAvailability(dec3, "maybe");

    expect((await readPoll(db, pollId))?.responses).toMatchObject([{ availabilities: { [dec3]: "maybe" } }]);
  });

  test("可否を空欄に戻すと、未回答になる", async () => {
    const { db, pollId, dec3, dec4 } = await setup();
    const { editToken } = await join(db, pollId, { name: "田中" });
    const me = await openResponse(db, pollId, editToken);
    await me!.setAvailability(dec3, "yes");
    await me!.setAvailability(dec4, "no");

    await me!.setAvailability(dec3, null);

    const [tanaka] = (await readPoll(db, pollId))!.responses;
    expect(tanaka.availabilities).toEqual({ [dec4]: "no" });
  });
});

describe("回答者として開く", () => {
  test("でたらめな編集用トークンでは開けない", async () => {
    const { db, pollId } = await setup();
    await join(db, pollId, { name: "田中" });

    expect(await openResponse(db, pollId, "not-a-token")).toBeNull();
  });

  test("別の日程調整の編集用トークンでは開けない", async () => {
    const { db, pollId } = await setup();
    const other = await createPoll(db, {
      title: "新年会",
      description: "",
      slots: [{ start: at("2027-01-08T19:00:00+09:00"), end: at("2027-01-08T21:00:00+09:00") }],
    });
    const { editToken } = await join(db, other.pollId, { name: "田中" });

    expect(await openResponse(db, pollId, editToken)).toBeNull();
  });
});
