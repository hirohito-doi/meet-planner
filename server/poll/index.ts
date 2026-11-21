import type { Db } from "@/server/db";
import type { Availability } from "./ranking";
import { findPoll, findResponseByToken, insertPoll, insertResponse, saveAvailability } from "./store";
import { hashToken, newId, newToken } from "./token";
import { PollError } from "./errors";
import { createPollSchema, joinSchema, parse, respondSchema } from "./validation";

export { PollError, type PollErrorCode } from "./errors";
export type { Availability } from "./ranking";

/** 1つの日程調整の候補の上限(重複をまとめた後の件数) */
const MAX_SLOTS = 25;

export type SlotInput = { start: number; end: number };

export type CreatePollInput = {
  title: string;
  description: string;
  slots: SlotInput[];
};

/** 日程調整を作成する。管理トークンは、この戻り値でしか手に入らない */
export async function createPoll(db: Db, rawInput: CreatePollInput) {
  const input = parse(createPollSchema, rawInput);
  const slots = uniqueSlots(input.slots);
  if (slots.length > MAX_SLOTS) {
    throw new PollError("LIMIT_EXCEEDED", `候補は${MAX_SLOTS}件までです`);
  }
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

/** 開始と終了が完全に一致する候補を1件にまとめる。先に出てきた方を残す */
function uniqueSlots(input: readonly SlotInput[]) {
  const seen = new Set<string>();
  return input.filter((s) => {
    const key = `${s.start}-${s.end}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 回答者として登録する。この時点ではすべての候補が未回答。編集用トークンは、この戻り値でしか手に入らない(ブラウザに保存する) */
export async function join(db: Db, pollId: string, rawInput: { name: string }) {
  const input = parse(joinSchema, rawInput);
  if (!(await findPoll(db, pollId))) throw new PollError("NOT_FOUND", "日程調整が見つかりません");
  const responseId = newId();
  const editToken = newToken();
  await insertResponse(
    db,
    { id: responseId, pollId, name: input.name, comment: "", editTokenHash: hashToken(editToken), createdAt: Date.now() },
    {},
  );
  return { responseId, editToken };
}

/** 編集用トークンを照合して、自分の回答を変更できる回答者を返す。トークンが使えなければ null */
export async function openResponse(db: Db, pollId: string, editToken: string) {
  const response = await findResponseByToken(db, pollId, hashToken(editToken));
  if (!response) return null;
  return {
    async setAvailability(slotId: string, value: Availability) {
      await saveAvailability(db, response.id, slotId, value);
    },
  };
}

export type RespondInput = {
  name: string;
  /** 候補 ID → 可否。含まれない候補は未回答 */
  availabilities: Record<string, Availability>;
  comment: string;
};

/** 回答する。編集用トークンは、この戻り値でしか手に入らない(ブラウザに保存する) */
export async function respond(db: Db, pollId: string, rawInput: RespondInput) {
  const input = parse(respondSchema, rawInput);
  const poll = await findPoll(db, pollId);
  if (!poll) throw new PollError("NOT_FOUND", "日程調整が見つかりません");
  const slotIds = new Set(poll.slots.map((s) => s.id));
  if (Object.keys(input.availabilities).some((id) => !slotIds.has(id))) {
    throw new PollError("INVALID_INPUT", "この日程調整にない候補が含まれています");
  }
  const responseId = newId();
  const editToken = newToken();
  await insertResponse(
    db,
    {
      id: responseId,
      pollId,
      name: input.name,
      comment: input.comment,
      editTokenHash: hashToken(editToken),
      createdAt: Date.now(),
    },
    input.availabilities,
  );
  return { responseId, editToken };
}

/** 回答画面用に日程調整を読み取る。見つからなければ null */
export async function readPoll(db: Db, pollId: string) {
  return findPoll(db, pollId);
}
