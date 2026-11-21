import type { Db } from "@/server/db";
import { findPoll, insertPoll } from "./store";
import { hashToken, newId, newToken } from "./token";

export type SlotInput = { start: number; end: number };

export type CreatePollInput = {
  title: string;
  description: string;
  slots: SlotInput[];
};

/** 日程調整を作成する。管理トークンは、この戻り値でしか手に入らない */
export async function createPoll(db: Db, input: CreatePollInput) {
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
    uniqueSlots(input.slots).map((s) => ({ id: newId(), ...s })),
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

/** 回答画面用に日程調整を読み取る。見つからなければ null */
export async function readPoll(db: Db, pollId: string) {
  return findPoll(db, pollId);
}
