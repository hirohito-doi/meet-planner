import type { Db } from "@/server/db";
import { PollError } from "./errors";
import { MAX_SLOTS } from "./slots";
import { hasSlot, isFinalized } from "./store";

/** 確定中なら PollError("FINALIZED") を投げる。確定中は日程調整全体が読み取り専用 */
export async function assertNotFinalized(db: Db, pollId: string) {
  if (await isFinalized(db, pollId)) throw new PollError("FINALIZED", "日程が確定しているため変更できません");
}

/** この日程調整の候補でなければ PollError("INVALID_INPUT") を投げる */
export async function assertSlotInPoll(db: Db, pollId: string, slotId: string) {
  if (!(await hasSlot(db, pollId, slotId))) throw new PollError("INVALID_INPUT", "この日程調整にない候補です");
}

/** 重複をまとめた後の候補が上限を超えていたら PollError("LIMIT_EXCEEDED") を投げる */
export function assertSlotCount(count: number) {
  if (count > MAX_SLOTS) throw new PollError("LIMIT_EXCEEDED", `候補は${MAX_SLOTS}件までです`);
}
