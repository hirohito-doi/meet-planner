// DB アクセスはこのファイルにまとめる。server/poll の外には見せない (ADR 0004)
import { asc, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { polls, slots } from "@/server/db/schema";

export type StoredSlot = { id: string; start: number; end: number };

export async function insertPoll(
  db: Db,
  poll: { id: string; title: string; description: string; adminTokenHash: string; createdAt: number },
  pollSlots: StoredSlot[],
) {
  await db.batch([
    db.insert(polls).values(poll),
    db.insert(slots).values(pollSlots.map((s) => ({ id: s.id, pollId: poll.id, startAt: s.start, endAt: s.end }))),
  ]);
}

export async function findPoll(db: Db, pollId: string) {
  const [poll] = await db.select().from(polls).where(eq(polls.id, pollId));
  if (!poll) return null;
  const rows = await db
    .select()
    .from(slots)
    .where(eq(slots.pollId, pollId))
    .orderBy(asc(slots.startAt), asc(slots.endAt));
  return {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    slots: rows.map((r) => ({ id: r.id, start: r.startAt, end: r.endAt })),
  };
}
