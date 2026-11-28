import type { Db } from "@/server/db";
import { rankSlots } from "./ranking";
import {
  deleteAvailability,
  findPoll,
  findResponseByToken,
  insertPoll,
  insertResponse,
  saveAvailability,
  updateResponseName,
} from "./store";
import { hashToken, newId, newToken } from "./token";
import { finalizedError, PollError } from "./errors";
import { assertNotFinalized, assertSlotCount, assertSlotInPoll } from "./guards";
import { type SlotInput, uniqueSlots } from "./slots";
import {
  type Availability,
  availabilitySchema,
  createPollSchema,
  joinSchema,
  parse,
  renameSchema,
} from "./validation";

export { PollError, type PollErrorCode } from "./errors";
export { openAdmin, type Admin } from "./admin";
export { deleteExpiredPolls, RETENTION_DAYS } from "./retention";
export type { Availability } from "./validation";


/** 1つの日程調整の回答者の上限。名前だけ登録した人も1人と数える */
const MAX_RESPONDENTS = 50;

export type { SlotInput } from "./slots";

export type CreatePollInput = {
  title: string;
  description: string;
  slots: SlotInput[];
};

/** 日程調整を作成する。管理トークンは、この戻り値でしか手に入らない */
export async function createPoll(db: Db, rawInput: CreatePollInput) {
  const input = parse(createPollSchema, rawInput);
  const slots = uniqueSlots(input.slots);
  assertSlotCount(slots.length);
  const pollId = newId();
  const adminToken = newToken();
  await insertPoll(
    db,
    {
      id: pollId,
      title: input.title,
      description: input.description,
      adminTokenHash: hashToken(adminToken),
      createdAt: Date.now(),
    },
    slots.map((s) => ({ id: newId(), ...s })),
  );
  return { pollId, adminToken };
}

/** 回答者として登録する。この時点ではすべての候補が未回答。編集用トークンは、この戻り値でしか手に入らない(ブラウザに保存する) */
export async function join(db: Db, pollId: string, rawInput: { name: string }) {
  const input = parse(joinSchema, rawInput);
  const poll = await findPoll(db, pollId);
  if (!poll) throw new PollError("NOT_FOUND", "日程調整が見つかりません");
  if (poll.finalizedSlotId !== null) throw finalizedError();
  if (poll.responses.length >= MAX_RESPONDENTS) {
    throw new PollError("LIMIT_EXCEEDED", `回答者は${MAX_RESPONDENTS}人までです`);
  }
  const responseId = newId();
  const editToken = newToken();
  await insertResponse(db, {
    id: responseId,
    pollId,
    name: input.name,
    editTokenHash: hashToken(editToken),
    createdAt: Date.now(),
  });
  return { responseId, editToken };
}

/** 編集用トークンを照合して、自分の回答を変更できる回答者を返す。トークンが使えなければ null */
export async function openResponse(db: Db, pollId: string, editToken: string) {
  const response = await findResponseByToken(db, pollId, hashToken(editToken));
  if (!response) return null;
  return {
    /** 可否を保存する。null なら未回答に戻す */
    async setAvailability(slotId: string, rawValue: Availability | null) {
      const value = parse(availabilitySchema, rawValue);
      await assertNotFinalized(db, pollId);
      await assertSlotInPoll(db, pollId, slotId);
      if (value === null) await deleteAvailability(db, response.id, slotId);
      else await saveAvailability(db, response.id, slotId, value);
    },
    /** 名前を変更する */
    async rename(rawName: string) {
      const { name } = parse(renameSchema, { name: rawName });
      await assertNotFinalized(db, pollId);
      await updateResponseName(db, response.id, name);
    },
  };
}

/** 回答画面用に日程調整を読み取る。ranking はスコアの高い順(同点の扱いは ranking.ts)。見つからなければ null */
export async function readPoll(db: Db, pollId: string) {
  const poll = await findPoll(db, pollId);
  if (!poll) return null;
  return { ...poll, ranking: rankSlots(poll.slots, poll.responses) };
}

/** 回答画面・管理画面に渡す日程調整の内容(トークンは含まない) */
export type PollView = NonNullable<Awaited<ReturnType<typeof readPoll>>>;
