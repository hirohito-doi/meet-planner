import type { Db } from "@/server/db";
import { findPollByAdminToken, updatePollDetails } from "./store";
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
  };
}

export type Admin = NonNullable<Awaited<ReturnType<typeof openAdmin>>>;
