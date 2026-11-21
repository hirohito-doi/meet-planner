// DB アクセスはこのファイルにまとめる。server/poll の外には見せない (ADR 0004)
import { and, asc, eq, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { availabilities, polls, responses, slots } from "@/server/db/schema";
import type { Availability } from "./ranking";

export type StoredSlot = { id: string; start: number; end: number };

export async function insertResponse(
  db: Db,
  response: { id: string; pollId: string; name: string; comment: string; editTokenHash: string; createdAt: number },
) {
  await db.insert(responses).values(response);
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
    // 同じミリ秒に登録した回答者の並びは ORDER BY created_at だけでは決まらないため、挿入順(rowid)でも並べる
    .orderBy(asc(responses.createdAt), asc(sql`rowid`));
  const answerRows = await db
    .select({ responseId: availabilities.responseId, slotId: availabilities.slotId, value: availabilities.value })
    .from(availabilities)
    .innerJoin(responses, eq(responses.id, availabilities.responseId))
    .where(eq(responses.pollId, pollId));

  return {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    finalizedSlotId: poll.finalizedSlotId,
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

/** 編集用トークンのハッシュから、この日程調整の回答を探す。なければ null */
export async function findResponseByToken(db: Db, pollId: string, editTokenHash: string) {
  const [row] = await db
    .select({ id: responses.id })
    .from(responses)
    .where(and(eq(responses.pollId, pollId), eq(responses.editTokenHash, editTokenHash)));
  return row ?? null;
}

export async function saveAvailability(db: Db, responseId: string, slotId: string, value: Availability) {
  await db
    .insert(availabilities)
    .values({ responseId, slotId, value })
    .onConflictDoUpdate({ target: [availabilities.responseId, availabilities.slotId], set: { value } });
}

export async function deleteAvailability(db: Db, responseId: string, slotId: string) {
  await db
    .delete(availabilities)
    .where(and(eq(availabilities.responseId, responseId), eq(availabilities.slotId, slotId)));
}

export async function hasSlot(db: Db, pollId: string, slotId: string) {
  const [row] = await db
    .select({ id: slots.id })
    .from(slots)
    .where(and(eq(slots.pollId, pollId), eq(slots.id, slotId)));
  return row !== undefined;
}

export async function updateResponseProfile(db: Db, responseId: string, profile: { name: string; comment: string }) {
  await db.update(responses).set(profile).where(eq(responses.id, responseId));
}

/** 管理トークンのハッシュから日程調整を探す。なければ null */
export async function findPollByAdminToken(db: Db, pollId: string, adminTokenHash: string) {
  const [row] = await db
    .select({ id: polls.id })
    .from(polls)
    .where(and(eq(polls.id, pollId), eq(polls.adminTokenHash, adminTokenHash)));
  return row ?? null;
}

export async function updatePollDetails(db: Db, pollId: string, details: { title: string; description: string }) {
  await db.update(polls).set(details).where(eq(polls.id, pollId));
}

export async function setFinalizedSlot(db: Db, pollId: string, slotId: string | null) {
  await db.update(polls).set({ finalizedSlotId: slotId }).where(eq(polls.id, pollId));
}
