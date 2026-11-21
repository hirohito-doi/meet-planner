import { describe, expect, test } from "vitest";
import { createPoll, readPoll } from "./index";
import { createTestDb } from "./test-db";

const at = (iso: string) => new Date(iso).getTime();

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
