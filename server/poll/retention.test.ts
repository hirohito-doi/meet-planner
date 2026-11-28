import { afterEach, describe, expect, test, vi } from "vitest";
import { availabilities, responses, slots } from "@/server/db/schema";
import { createPoll, deleteExpiredPolls, join, openAdmin, openResponse, readPoll } from "./index";
import { createTestDb } from "./test-db";

const at = (iso: string) => new Date(iso).getTime();
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/** 削除を実行する時刻 */
const NOW = at("2027-06-01T03:00:00+09:00");

type Db = Awaited<ReturnType<typeof createTestDb>>;

/** 指定した候補を持つ日程調整を作り、回答者を1人登録して最初の候補に ○ を付ける */
async function pollWith(db: Db, slotTimes: { start: number; end: number }[]) {
  const { pollId, adminToken } = await createPoll(db, { title: "忘年会", description: "", slots: slotTimes });
  const { editToken } = await join(db, pollId, { name: "田中" });
  const poll = await readPoll(db, pollId);
  await (await openResponse(db, pollId, editToken))!.setAvailability(poll!.slots[0].id, "yes");
  return { pollId, adminToken };
}

/** 終了が end の2時間の候補 */
const endingAt = (end: number) => ({ start: end - 2 * HOUR, end });

afterEach(() => {
  vi.useRealTimers();
});

describe("古い日程調整の自動削除", () => {
  test("最後の候補の終了から90日を過ぎた日程調整は、候補・回答・可否とともに削除される", async () => {
    const db = await createTestDb();
    const { pollId } = await pollWith(db, [endingAt(NOW - 91 * DAY)]);

    expect(await deleteExpiredPolls(db, NOW)).toBe(1);

    expect(await readPoll(db, pollId)).toBeNull();
    expect(await db.select().from(slots)).toEqual([]);
    expect(await db.select().from(responses)).toEqual([]);
    expect(await db.select().from(availabilities)).toEqual([]);
  });

  test("最後の候補の終了から90日たっていない日程調整は残る", async () => {
    const db = await createTestDb();
    const { pollId } = await pollWith(db, [endingAt(NOW - 89 * DAY)]);

    expect(await deleteExpiredPolls(db, NOW)).toBe(0);

    expect(await readPoll(db, pollId)).not.toBeNull();
  });

  test("最後の候補の終了からちょうど90日なら残り、それを過ぎると削除される", async () => {
    const db = await createTestDb();
    const end = NOW - 90 * DAY;
    const { pollId } = await pollWith(db, [endingAt(end)]);

    expect(await deleteExpiredPolls(db, NOW)).toBe(0);
    expect(await readPoll(db, pollId)).not.toBeNull();

    expect(await deleteExpiredPolls(db, NOW + 1)).toBe(1);
    expect(await readPoll(db, pollId)).toBeNull();
  });

  test("古い候補と新しい候補が混ざっていれば、最後の候補で判断するので残る", async () => {
    const db = await createTestDb();
    const { pollId } = await pollWith(db, [endingAt(NOW - 200 * DAY), endingAt(NOW - 10 * DAY)]);

    expect(await deleteExpiredPolls(db, NOW)).toBe(0);

    expect((await readPoll(db, pollId))!.slots).toHaveLength(2);
  });

  test("開始は90日より前でも、終了が90日以内なら残る", async () => {
    const db = await createTestDb();
    // 36時間の候補: 開始は 90日と12時間前、終了は 88日と24時間前
    const end = NOW - 89 * DAY;
    const { pollId } = await pollWith(db, [{ start: end - 36 * HOUR, end }]);

    expect(await deleteExpiredPolls(db, NOW)).toBe(0);

    expect(await readPoll(db, pollId)).not.toBeNull();
  });

  test("確定中の日程調整も同じように削除される", async () => {
    const db = await createTestDb();
    const { pollId, adminToken } = await pollWith(db, [endingAt(NOW - 100 * DAY)]);
    const admin = await openAdmin(db, pollId, adminToken);
    await admin!.finalize((await readPoll(db, pollId))!.slots[0].id);

    expect(await deleteExpiredPolls(db, NOW)).toBe(1);

    expect(await readPoll(db, pollId)).toBeNull();
  });

  test("ほかの日程調整の候補・回答・可否には触らない", async () => {
    const db = await createTestDb();
    await pollWith(db, [endingAt(NOW - 120 * DAY)]);
    await pollWith(db, [endingAt(NOW - 95 * DAY)]);
    const kept = await pollWith(db, [endingAt(NOW - 30 * DAY), endingAt(NOW + 30 * DAY)]);
    const before = await readPoll(db, kept.pollId);

    expect(await deleteExpiredPolls(db, NOW)).toBe(2);

    expect(await readPoll(db, kept.pollId)).toEqual(before);
    expect(await db.select().from(slots)).toHaveLength(2);
    expect(await db.select().from(responses)).toHaveLength(1);
    expect(await db.select().from(availabilities)).toHaveLength(1);
  });

  describe("候補が0件の日程調整は、作成した時刻から数える", () => {
    /** created に作成し、ずっと先の候補を1件だけ付けてから、主催者がその候補を削除して0件にする */
    async function pollWithoutSlots(db: Db, created: number) {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(created);
      const { pollId, adminToken } = await createPoll(db, {
        title: "新年会",
        description: "",
        slots: [endingAt(NOW + 365 * DAY)],
      });
      vi.useRealTimers();
      const admin = await openAdmin(db, pollId, adminToken);
      await admin!.removeSlot((await readPoll(db, pollId))!.slots[0].id);
      return pollId;
    }

    test("作成から90日を過ぎていれば削除される", async () => {
      const db = await createTestDb();
      const pollId = await pollWithoutSlots(db, NOW - 91 * DAY);

      expect(await deleteExpiredPolls(db, NOW)).toBe(1);

      expect(await readPoll(db, pollId)).toBeNull();
    });

    test("作成から90日たっていなければ残る", async () => {
      const db = await createTestDb();
      const pollId = await pollWithoutSlots(db, NOW - 89 * DAY);

      expect(await deleteExpiredPolls(db, NOW)).toBe(0);

      expect(await readPoll(db, pollId)).not.toBeNull();
    });
  });

  test("削除するものが多くても、すべて削除される", async () => {
    const db = await createTestDb();
    for (let i = 0; i < 120; i++) {
      await createPoll(db, { title: `古い日程調整${i}`, description: "", slots: [endingAt(NOW - (91 + i) * DAY)] });
    }

    expect(await deleteExpiredPolls(db, NOW)).toBe(120);

    expect(await db.select().from(slots)).toEqual([]);
  });
});
