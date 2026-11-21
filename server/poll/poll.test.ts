import { describe, expect, test } from "vitest";
import { createPoll, readPoll, type CreatePollInput } from "./index";
import { createTestDb } from "./test-db";

const at = (iso: string) => new Date(iso).getTime();

const validInput = (): CreatePollInput => ({
  title: "忘年会",
  description: "",
  slots: [{ start: at("2026-12-03T19:00:00+09:00"), end: at("2026-12-03T21:00:00+09:00") }],
});

describe("日程調整の作成と読み取り", () => {
  test("作成した日程調整を読み取ると、タイトル・説明・候補が返る", async () => {
    const db = await createTestDb();
    const { pollId } = await createPoll(db, {
      title: "忘年会",
      description: "場所は未定です",
      slots: [{ start: at("2026-12-03T19:00:00+09:00"), end: at("2026-12-03T21:00:00+09:00") }],
    });

    const poll = await readPoll(db, pollId);

    expect(poll).toMatchObject({
      title: "忘年会",
      description: "場所は未定です",
      slots: [{ start: at("2026-12-03T19:00:00+09:00"), end: at("2026-12-03T21:00:00+09:00") }],
    });
  });

  test("候補は開始日時の順に並ぶ", async () => {
    const db = await createTestDb();
    const { pollId } = await createPoll(db, {
      title: "定例",
      description: "",
      slots: [
        { start: at("2026-12-05T10:00:00+09:00"), end: at("2026-12-05T11:00:00+09:00") },
        { start: at("2026-12-03T10:00:00+09:00"), end: at("2026-12-03T11:00:00+09:00") },
        { start: at("2026-12-04T10:00:00+09:00"), end: at("2026-12-04T11:00:00+09:00") },
      ],
    });

    const poll = await readPoll(db, pollId);

    expect(poll?.slots.map((s) => s.start)).toEqual([
      at("2026-12-03T10:00:00+09:00"),
      at("2026-12-04T10:00:00+09:00"),
      at("2026-12-05T10:00:00+09:00"),
    ]);
  });

  test("存在しない日程調整を読み取ると null が返る", async () => {
    const db = await createTestDb();

    expect(await readPoll(db, "no-such-poll")).toBeNull();
  });
});

describe("候補の保存", () => {
  test("開始と終了が完全に一致する候補は1件にまとまり、少しでもずれた候補は残る", async () => {
    const db = await createTestDb();
    const { pollId } = await createPoll(db, {
      title: "深夜の打ち合わせ",
      description: "",
      slots: [
        // 前日の列の「翌 2:00-3:00」と、当日の列の「2:00-3:00」は同じ日時
        { start: at("2026-12-04T02:00:00+09:00"), end: at("2026-12-04T03:00:00+09:00") },
        { start: at("2026-12-04T02:00:00+09:00"), end: at("2026-12-04T03:00:00+09:00") },
        { start: at("2026-12-04T02:00:00+09:00"), end: at("2026-12-04T03:30:00+09:00") },
      ],
    });

    const poll = await readPoll(db, pollId);

    expect(poll?.slots.map((s) => [s.start, s.end])).toEqual([
      [at("2026-12-04T02:00:00+09:00"), at("2026-12-04T03:00:00+09:00")],
      [at("2026-12-04T02:00:00+09:00"), at("2026-12-04T03:30:00+09:00")],
    ]);
  });
});

describe("日程調整の作成時の入力値の検証", () => {
  test.each([
    ["空", ""],
    ["空白だけ", "   "],
    ["101文字", "あ".repeat(101)],
  ])("タイトルが%sなら作成できない", async (_, title) => {
    const db = await createTestDb();

    await expect(createPoll(db, { ...validInput(), title })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });

  test("タイトルは前後の空白を取り除いて保存し、取り除いた後の100文字までは作成できる", async () => {
    const db = await createTestDb();
    const title = "あ".repeat(100);

    const { pollId } = await createPoll(db, { ...validInput(), title: `  ${title}  ` });

    expect((await readPoll(db, pollId))?.title).toBe(title);
  });

  test("説明が1,001文字なら作成できない", async () => {
    const db = await createTestDb();

    await expect(
      createPoll(db, { ...validInput(), description: "あ".repeat(1001) }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  test("説明は前後の空白を取り除いて保存し、取り除いた後の1,000文字までは作成できる", async () => {
    const db = await createTestDb();
    const description = "あ".repeat(1000);

    const { pollId } = await createPoll(db, { ...validInput(), description: `\n${description}\n` });

    expect((await readPoll(db, pollId))?.description).toBe(description);
  });

  test("候補が0件なら作成できない", async () => {
    const db = await createTestDb();

    await expect(createPoll(db, { ...validInput(), slots: [] })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });

  test("重複をまとめた後の候補が26件なら、上限超過で作成できない", async () => {
    const db = await createTestDb();

    await expect(
      createPoll(db, { ...validInput(), slots: hourlySlots(26) }),
    ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
  });

  test("26件送っても、重複をまとめて25件になれば作成できる", async () => {
    const db = await createTestDb();
    const slots = hourlySlots(25);

    const { pollId } = await createPoll(db, { ...validInput(), slots: [...slots, slots[0]] });

    expect((await readPoll(db, pollId))?.slots).toHaveLength(25);
  });

  test("候補を101件送ると、重複をまとめる前に不正な入力として拒否する", async () => {
    const db = await createTestDb();

    await expect(
      createPoll(db, { ...validInput(), slots: hourlySlots(101) }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  test("候補を100件送っても、重複をまとめて25件以下になれば作成できる", async () => {
    const db = await createTestDb();
    const slots = hourlySlots(25);

    const { pollId } = await createPoll(db, {
      ...validInput(),
      slots: [...slots, ...slots, ...slots, ...slots],
    });

    expect((await readPoll(db, pollId))?.slots).toHaveLength(25);
  });

  test.each([
    ["終了が開始と同じ", "2026-12-03T19:00:00+09:00", "2026-12-03T19:00:00+09:00"],
    ["終了が開始より前", "2026-12-03T19:00:00+09:00", "2026-12-03T18:00:00+09:00"],
    ["開始が30分単位でない", "2026-12-03T19:10:00+09:00", "2026-12-03T20:00:00+09:00"],
    ["終了が30分単位でない", "2026-12-03T19:00:00+09:00", "2026-12-03T20:15:00+09:00"],
    ["長さが36時間を超える", "2026-12-02T18:00:00+09:00", "2026-12-04T06:30:00+09:00"],
  ])("候補の%sなら作成できない", async (_, start, end) => {
    const db = await createTestDb();

    await expect(
      createPoll(db, { ...validInput(), slots: [{ start: at(start), end: at(end) }] }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  test("ちょうど36時間(前日 18:00〜翌日 6:00)の候補は作成できる", async () => {
    const db = await createTestDb();
    const slot = { start: at("2026-12-02T18:00:00+09:00"), end: at("2026-12-04T06:00:00+09:00") };

    const { pollId } = await createPoll(db, { ...validInput(), slots: [slot] });

    expect((await readPoll(db, pollId))?.slots).toMatchObject([slot]);
  });
});

/** 12/3 0:00 JST から1時間ずつずらした、長さ1時間の候補を n 件 */
function hourlySlots(n: number) {
  const base = at("2026-12-03T00:00:00+09:00");
  const hour = 60 * 60 * 1000;
  return Array.from({ length: n }, (_, i) => ({ start: base + i * hour, end: base + (i + 1) * hour }));
}
