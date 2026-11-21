import type { Db } from "@/server/db";
import { PollError } from "./errors";
import { findPollByAdminToken, hasSlot, setFinalizedSlot, updatePollDetails } from "./store";
import { hashToken } from "./token";
import { detailsSchema, parse } from "./validation";

/** 管理トークンを照合して、管理系の操作ができる主催者を返す。トークンが使えなければ null。照合はここだけで行う */
export async function openAdmin(db: Db, pollId: string, adminToken: string) {
  const poll = await findPollByAdminToken(db, pollId, hashToken(adminToken));
  if (!poll) return null;
  return {
    /** タイトルと説明を変更する */
    async updateDetails(rawInput: { title: string; description: string }) {
      await updatePollDetails(db, pollId, parse(detailsSchema, rawInput));
    },
    /** 候補を1件選んで確定する */
    async finalize(slotId: string) {
      if (!(await hasSlot(db, pollId, slotId))) {
        throw new PollError("INVALID_INPUT", "この日程調整にない候補です");
      }
      await setFinalizedSlot(db, pollId, slotId);
    },
    /** 確定を取り消す */
    async unfinalize() {
      await setFinalizedSlot(db, pollId, null);
    },
  };
}

export type Admin = NonNullable<Awaited<ReturnType<typeof openAdmin>>>;
