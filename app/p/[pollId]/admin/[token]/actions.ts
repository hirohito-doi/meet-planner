"use server";

// 主催者の操作。どれも公開された POST の入り口なので、毎回 openAdmin で管理トークンを照合する
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/server/db/app-db";
import { type Admin, openAdmin, PollError, type SlotInput } from "@/server/poll";
import { type ActionResult, runAction } from "@/app/_lib/action-result";

async function asAdmin(pollId: string, token: string, operation: (admin: Admin) => Promise<void>): Promise<ActionResult> {
  const result = await runAction(async () => {
    const admin = await openAdmin(await getDb(), pollId, token);
    if (!admin) throw new PollError("NOT_FOUND", "日程調整が見つかりません");
    await operation(admin);
    return null;
  });
  refresh();
  return result;
}

export async function updateDetailsAction(pollId: string, token: string, details: { title: string; description: string }) {
  return asAdmin(pollId, token, (admin) => admin.updateDetails(details));
}

export async function finalizeAction(pollId: string, token: string, slotId: string) {
  return asAdmin(pollId, token, (admin) => admin.finalize(slotId));
}

export async function unfinalizeAction(pollId: string, token: string) {
  return asAdmin(pollId, token, (admin) => admin.unfinalize());
}

export async function addSlotsAction(pollId: string, token: string, slots: SlotInput[]) {
  return asAdmin(pollId, token, (admin) => admin.addSlots(slots));
}

export async function removeSlotAction(pollId: string, token: string, slotId: string) {
  return asAdmin(pollId, token, (admin) => admin.removeSlot(slotId));
}

export async function deleteResponseAction(pollId: string, token: string, responseId: string) {
  return asAdmin(pollId, token, (admin) => admin.deleteResponse(responseId));
}

export async function deletePollAction(pollId: string, token: string) {
  const result = await asAdmin(pollId, token, (admin) => admin.deletePoll());
  if (!result.ok) return result;
  redirect("/");
}
