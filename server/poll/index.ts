import type { Db } from "@/server/db";
import type { Availability } from "./ranking";
import {
  deleteAvailability,
  findPoll,
  findResponseByToken,
  hasSlot,
  insertPoll,
  insertResponse,
  saveAvailability,
  updateResponseProfile,
} from "./store";
import { hashToken, newId, newToken } from "./token";
import { PollError } from "./errors";
import { assertNotFinalized } from "./guards";
import {
  availabilitySchema,
  createPollSchema,
  joinSchema,
  parse,
  profileSchema,
} from "./validation";

export { PollError, type PollErrorCode } from "./errors";
export { openAdmin, type Admin } from "./admin";
export type { Availability } from "./ranking";

/** 1つの日程調整の候補の上限(重複をまとめた後の件数) */
const MAX_SLOTS = 25;

/** 1つの日程調整の回答者の上限。名前だけ登録した人も1人と数える */
const MAX_RESPONDENTS = 50;

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
  const poll = await findPoll(db, pollId);
  if (!poll) throw new PollError("NOT_FOUND", "日程調整が見つかりません");
  if (poll.finalizedSlotId !== null) throw new PollError("FINALIZED", "確定中のため変更できません");
  if (poll.responses.length >= MAX_RESPONDENTS) {
    throw new PollError("LIMIT_EXCEEDED", `回答者は${MAX_RESPONDENTS}人までです`);
  }
  const responseId = newId();
  const editToken = newToken();
  await insertResponse(db, {
    id: responseId,
    pollId,
    name: input.name,
    comment: "",
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
      if (!(await hasSlot(db, pollId, slotId))) {
        throw new PollError("INVALID_INPUT", "この日程調整にない候補です");
      }
      if (value === null) await deleteAvailability(db, response.id, slotId);
      else await saveAvailability(db, response.id, slotId, value);
    },
    /** 名前とコメントを保存する */
    async updateProfile(rawInput: { name: string; comment: string }) {
      const profile = parse(profileSchema, rawInput);
      await assertNotFinalized(db, pollId);
      await updateResponseProfile(db, response.id, profile);
    },
  };
}

/** 回答画面用に日程調整を読み取る。見つからなければ null */
export async function readPoll(db: Db, pollId: string) {
  return findPoll(db, pollId);
}
