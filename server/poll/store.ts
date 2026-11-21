// DB アクセスはこのファイルにまとめる。server/poll の外には見せない (ADR 0004)
import { asc, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { availabilities, polls, responses, slots } from "@/server/db/schema";
import type { Availability } from "./ranking";

export type StoredSlot = { id: string; start: number; end: number };

export async function insertResponse(
  db: Db,
  response: { id: string; pollId: string; name: string; comment: string; editTokenHash: string; createdAt: number },
  answers: Readonly<Record<string, Availability>>,
) {
  const rows = Object.entries(answers).map(([slotId, value]) => ({ responseId: response.id, slotId, value }));
  await db.batch([
    db.insert(responses).values(response),
    ...(rows.length ? [db.insert(availabilities).values(rows)] : []),
  ]);
}

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
  const responseRows = await db
    .select()
    .from(responses)
    .where(eq(responses.pollId, pollId))
    .orderBy(asc(responses.createdAt));
  const answerRows = await db
    .select({ responseId: availabilities.responseId, slotId: availabilities.slotId, value: availabilities.value })
    .from(availabilities)
    .innerJoin(responses, eq(responses.id, availabilities.responseId))
    .where(eq(responses.pollId, pollId));

  return {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    slots: rows.map((r) => ({ id: r.id, start: r.startAt, end: r.endAt })),
    responses: responseRows.map((r) => ({
      id: r.id,
      name: r.name,
      comment: r.comment,
      availabilities: Object.fromEntries(
        answerRows.filter((a) => a.responseId === r.id).map((a) => [a.slotId, a.value]),
      ) as Record<string, Availability>,
    })),
  };
}
