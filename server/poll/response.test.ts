import { afterEach, describe, expect, test, vi } from "vitest";
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

  test("50人が登録した後は、51人目は登録できない", async () => {
    const { db, pollId } = await setup();
    for (let i = 1; i <= 50; i++) await join(db, pollId, { name: `回答者${i}` });

    await expect(join(db, pollId, { name: "回答者51" })).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
  });

  test("50人に達した後も、登録済みの回答者は自分の回答を変更できる", async () => {
    const { db, pollId, dec3 } = await setup();
    const { editToken } = await join(db, pollId, { name: "回答者1" });
    for (let i = 2; i <= 50; i++) await join(db, pollId, { name: `回答者${i}` });

    const me = await openResponse(db, pollId, editToken);
    await me!.setAvailability(dec3, "yes");
    await me!.updateProfile({ name: "田中", comment: "よろしくお願いします" });

    const responses = (await readPoll(db, pollId))!.responses;
    expect(responses.find((r) => r.name === "田中")).toMatchObject({
      availabilities: { [dec3]: "yes" },
      comment: "よろしくお願いします",
    });
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

describe("可否の保存の検証", () => {
  test("この日程調整にない候補には、可否を保存できない", async () => {
    const { db, pollId } = await setup();
    const { editToken } = await join(db, pollId, { name: "田中" });
    const me = await openResponse(db, pollId, editToken);

    await expect(me!.setAvailability("other-poll-slot", "yes")).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  test("可否が ○△× (yes / maybe / no) と空欄 (null) 以外なら保存できない", async () => {
    const { db, pollId, dec3 } = await setup();
    const { editToken } = await join(db, pollId, { name: "田中" });
    const me = await openResponse(db, pollId, editToken);

    await expect(me!.setAvailability(dec3, "absolutely" as never)).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});

describe("名前とコメントの保存", () => {
  test("名前とコメントを保存すると、回答画面に表示される", async () => {
    const { db, pollId } = await setup();
    const { editToken } = await join(db, pollId, { name: "田中" });
    const me = await openResponse(db, pollId, editToken);

    await me!.updateProfile({ name: "田中太郎", comment: "20時以降なら参加できます" });

    expect((await readPoll(db, pollId))?.responses).toMatchObject([
      { name: "田中太郎", comment: "20時以降なら参加できます" },
    ]);
  });

  test.each([
    ["名前が空", { name: "", comment: "" }],
    ["名前が空白だけ", { name: "　 ", comment: "" }],
    ["名前が31文字", { name: "あ".repeat(31), comment: "" }],
    ["コメントが201文字", { name: "田中", comment: "あ".repeat(201) }],
  ])("%sなら保存できない", async (_, profile) => {
    const { db, pollId } = await setup();
    const { editToken } = await join(db, pollId, { name: "田中" });
    const me = await openResponse(db, pollId, editToken);

    await expect(me!.updateProfile(profile)).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  test("名前とコメントは前後の空白を取り除いて保存し、取り除いた後の上限の文字数までは保存できる", async () => {
    const { db, pollId } = await setup();
    const { editToken } = await join(db, pollId, { name: "田中" });
    const me = await openResponse(db, pollId, editToken);
    const name = "あ".repeat(30);
    const comment = "い".repeat(200);

    await me!.updateProfile({ name: ` ${name} `, comment: `
${comment}
` });

    expect((await readPoll(db, pollId))?.responses).toMatchObject([{ name, comment }]);
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

describe("回答者の並び順", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("同じ時刻に登録しても、登録した順に並び、名前を変えても順番は変わらない", async () => {
    const { db, pollId } = await setup();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(at("2026-11-21T12:00:00+09:00"));
    const names = ["佐藤", "鈴木", "高橋", "田中", "伊藤", "渡辺", "山本", "中村"];
    const tokens = [];
    for (const name of names) tokens.push((await join(db, pollId, { name })).editToken);

    const first = await openResponse(db, pollId, tokens[0]);
    await first!.updateProfile({ name: "佐藤(更新)", comment: "" });

    expect((await readPoll(db, pollId))!.responses.map((r) => r.name)).toEqual([
      "佐藤(更新)",
      ...names.slice(1),
    ]);
  });
});
