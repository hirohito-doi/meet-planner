"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/server/db/app-db";
import { createPoll, type CreatePollInput } from "@/server/poll";
import { type ActionResult, runAction } from "../_lib/action-result";

/** 日程調整を作成し、管理画面(作成直後の表示)へ移る。入力の検証は server/poll が行う */
export async function createPollAction(input: CreatePollInput): Promise<ActionResult> {
  const db = await getDb();
  const result = await runAction(() => createPoll(db, input));
  if (!result.ok) return result;
  redirect(`/p/${result.value.pollId}/admin/${result.value.adminToken}?created=1`);
}
