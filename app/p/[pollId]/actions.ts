"use server";

// 回答者の操作。どれも公開された POST の入り口なので、トークンの照合と入力の検証は server/poll に任せる
import { refresh } from "next/cache";
import { getDb } from "@/server/db/app-db";
import { type Availability, join, openResponse, PollError } from "@/server/poll";
import { type ActionResult, runAction } from "@/app/_lib/action-result";

export async function joinAction(pollId: string, name: string): Promise<ActionResult<{ responseId: string; editToken: string }>> {
  const db = await getDb();
  const result = await runAction(() => join(db, pollId, { name }));
  if (result.ok) refresh();
  return result;
}

export async function setAvailabilityAction(
  pollId: string,
  editToken: string,
  slotId: string,
  value: Availability | null,
): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await openMe(pollId, editToken);
    await me.setAvailability(slotId, value);
    return null;
  });
  refresh();
  return result;
}

export async function renameAction(pollId: string, editToken: string, name: string): Promise<ActionResult> {
  const result = await runAction(async () => {
    const me = await openMe(pollId, editToken);
    await me.rename(name);
    return null;
  });
  refresh();
  return result;
}

async function openMe(pollId: string, editToken: string) {
  const me = await openResponse(await getDb(), pollId, editToken);
  // 主催者が回答を削除した後など。画面はトークンを消して、名前の入力からやり直してもらう
  if (!me) throw new PollError("NOT_FOUND", "回答が見つかりません");
  return me;
}
