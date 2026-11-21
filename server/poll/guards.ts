import type { Db } from "@/server/db";
import { PollError } from "./errors";
import { isFinalized } from "./store";

/** 確定中なら PollError("FINALIZED") を投げる。確定中は日程調整全体が読み取り専用 */
export async function assertNotFinalized(db: Db, pollId: string) {
  if (await isFinalized(db, pollId)) throw new PollError("FINALIZED", "確定中のため変更できません");
}
