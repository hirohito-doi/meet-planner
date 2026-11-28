// DB アクセスはこのファイルにまとめる。server/poll の外には見せない (ADR 0004)
import { and, asc, eq, inArray, max, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { availabilities, polls, responses, slots } from "@/server/db/schema";
import type { Availability } from "./validation";

export type StoredSlot = { id: string; start: number; end: number };

/** 回答者を、その日程調整で最後の登録順にして加える */
export async function insertResponse(
  db: Db,
  response: { id: string; pollId: string; name: string; editTokenHash: string; createdAt: number },
) {
  const [last] = await db
    .select({ joinOrder: max(responses.joinOrder) })
    .from(responses)
    .where(eq(responses.pollId, response.pollId));
  await db.insert(responses).values({ ...response, joinOrder: (last?.joinOrder ?? -1) + 1 });
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
    .orderBy(asc(responses.joinOrder), asc(responses.createdAt), asc(responses.id));
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

export async function updateResponseName(db: Db, responseId: string, name: string) {
  await db.update(responses).set({ name }).where(eq(responses.id, responseId));
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

export async function isFinalized(db: Db, pollId: string) {
  const [row] = await db.select({ finalizedSlotId: polls.finalizedSlotId }).from(polls).where(eq(polls.id, pollId));
  return row?.finalizedSlotId != null;
}

export async function insertSlots(db: Db, pollId: string, newSlots: StoredSlot[]) {
  await db.insert(slots).values(newSlots.map((s) => ({ id: s.id, pollId, startAt: s.start, endAt: s.end })));
}

/** 候補と、その候補への可否を削除する(外部キーがないので可否も明示的に消す)。確定した候補なら確定も取り消す */
export async function deleteSlot(db: Db, pollId: string, slotId: string) {
  await db.batch([
    db.delete(availabilities).where(eq(availabilities.slotId, slotId)),
    db.delete(slots).where(and(eq(slots.pollId, pollId), eq(slots.id, slotId))),
    db
      .update(polls)
      .set({ finalizedSlotId: null })
      .where(and(eq(polls.id, pollId), eq(polls.finalizedSlotId, slotId))),
  ]);
}

/** 回答と、その回答の可否を削除する(外部キーがないので可否も明示的に消す) */
export async function deleteResponse(db: Db, responseId: string) {
  await db.batch([
    db.delete(availabilities).where(eq(availabilities.responseId, responseId)),
    db.delete(responses).where(eq(responses.id, responseId)),
  ]);
}

export async function hasResponse(db: Db, pollId: string, responseId: string) {
  const [row] = await db
    .select({ id: responses.id })
    .from(responses)
    .where(and(eq(responses.pollId, pollId), eq(responses.id, responseId)));
  return row !== undefined;
}

/** 日程調整と、その候補・回答・可否をすべて削除する */
export async function deletePoll(db: Db, pollId: string) {
  await deletePolls(db, [pollId]);
}

/**
 * 最後の候補の終了(候補が0件なら作成した時刻)が cutoff より前の日程調整の ID を返す。
 * 確定しているかどうかは問わない
 */
export async function findPollIdsLastUsedBefore(db: Db, cutoff: number) {
  const rows = await db
    .select({ id: polls.id })
    .from(polls)
    .leftJoin(slots, eq(slots.pollId, polls.id))
    .groupBy(polls.id)
    .having(sql`coalesce(max(${slots.endAt}), ${polls.createdAt}) < ${cutoff}`);
  return rows.map((r) => r.id);
}

/** D1 の1つの SQL に渡せる値は100個まで。余裕を持って、この件数ずつ消す */
const DELETE_CHUNK = 50;

/** 複数の日程調整と、その候補・回答・可否をすべて削除する(外部キーがないので明示的に消す) */
export async function deletePolls(db: Db, pollIds: string[]) {
  for (let i = 0; i < pollIds.length; i += DELETE_CHUNK) {
    const ids = pollIds.slice(i, i + DELETE_CHUNK);
    const responseIds = db.select({ id: responses.id }).from(responses).where(inArray(responses.pollId, ids));
    await db.batch([
      db.delete(availabilities).where(inArray(availabilities.responseId, responseIds)),
      db.delete(responses).where(inArray(responses.pollId, ids)),
      db.delete(slots).where(inArray(slots.pollId, ids)),
      db.delete(polls).where(inArray(polls.id, ids)),
    ]);
  }
}
