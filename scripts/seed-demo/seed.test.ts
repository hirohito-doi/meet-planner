import { describe, expect, test } from "vitest";
import { createDb, migrateDb } from "@/server/db";
import { readPoll } from "@/server/poll";
import { seedDemo } from "./seed";

describe("動作確認用の日程調整を作る", () => {
  test("回答者が5人いて、○△× がばらけた日程調整ができる", async () => {
    const db = createDb(":memory:");
    await migrateDb(db);

    const { pollId } = await seedDemo(db, { now: new Date("2026-11-28T12:00:00+09:00").getTime() });

    const poll = (await readPoll(db, pollId))!;
    expect(poll.responses.map((r) => r.name)).toEqual(["佐藤", "鈴木", "高橋", "田中", "伊藤"]);
    expect(poll.slots).toHaveLength(5);
    // 候補は今日より後の日付だけ
    expect(poll.slots.every((s) => s.start > new Date("2026-11-29T00:00:00+09:00").getTime())).toBe(true);
    // ○ も △ も × も、未回答も入っている
    const values = poll.responses.flatMap((r) => poll.slots.map((s) => r.availabilities[s.id] ?? null));
    expect(new Set(values)).toEqual(new Set(["yes", "maybe", "no", null]));
    // 1位は1件だけ(同点で決まらない形にしない)
    const [first, second] = poll.ranking;
    expect(first.score).toBeGreaterThan(second.score);
  });
});
