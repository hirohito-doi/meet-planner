import type { Db } from "@/server/db";
import { PollError } from "./errors";
import { assertNotFinalized, assertSlotCount, assertSlotInPoll } from "./guards";
import { deletePoll, deleteResponse, deleteSlot, findPoll, findPollByAdminToken, hasResponse, insertSlots, setFinalizedSlot, updatePollDetails } from "./store";
import { type SlotInput, uniqueSlots } from "./slots";
import { hashToken, newId } from "./token";
import { detailsSchema, parse, slotListSchema } from "./validation";

/** 管理トークンを照合して、管理系の操作ができる主催者を返す。トークンが使えなければ null。照合はここだけで行う */
export async function openAdmin(db: Db, pollId: string, adminToken: string) {
  const poll = await findPollByAdminToken(db, pollId, hashToken(adminToken));
  if (!poll) return null;
  return {
    /** タイトルと説明を変更する */
    async updateDetails(rawInput: { title: string; description: string }) {
      const details = parse(detailsSchema, rawInput);
      await assertNotFinalized(db, pollId);
      await updatePollDetails(db, pollId, details);
    },
    /** 候補を1件選んで確定する */
    async finalize(slotId: string) {
      await assertSlotInPoll(db, pollId, slotId);
      await setFinalizedSlot(db, pollId, slotId);
    },
    /** 候補を追加する */
    async addSlots(rawSlots: SlotInput[]) {
      const added = parse(slotListSchema, rawSlots);
      await assertNotFinalized(db, pollId);
      const existing = (await findPoll(db, pollId))!.slots;
      // 既存の候補を先に並べるので、重複したときは既存の候補(とその回答)が残る
      const merged = uniqueSlots<SlotInput & { id?: string }>([...existing, ...added]);
      assertSlotCount(merged.length);
      const fresh = merged.filter((s) => s.id === undefined);
      if (fresh.length) await insertSlots(db, pollId, fresh.map((s) => ({ id: newId(), start: s.start, end: s.end })));
    },
    /** 候補を削除する。その候補への可否も消える。確定中でも削除でき、確定した候補なら確定も取り消す */
    async removeSlot(slotId: string) {
      await assertSlotInPoll(db, pollId, slotId);
      await deleteSlot(db, pollId, slotId);
    },
    /** 回答を1人分まとめて削除する。確定中でも削除できる */
    async deleteResponse(responseId: string) {
      if (!(await hasResponse(db, pollId, responseId))) {
        throw new PollError("INVALID_INPUT", "この日程調整にない回答です");
      }
      await deleteResponse(db, responseId);
    },
    /** 日程調整を削除する。候補・回答・可否もすべて消える。確定中でも削除できる */
    async deletePoll() {
      await deletePoll(db, pollId);
    },
    /** 確定を取り消す */
    async unfinalize() {
      await setFinalizedSlot(db, pollId, null);
    },
  };
}

export type Admin = NonNullable<Awaited<ReturnType<typeof openAdmin>>>;
