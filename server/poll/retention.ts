import type { Db } from "@/server/db";
import { deletePolls, findPollIdsLastUsedBefore } from "./store";

/** 最後の候補の日から、この日数を過ぎた日程調整を自動で削除する(docs/spec.md「自動削除」) */
export const RETENTION_DAYS = 90;

const DAY = 24 * 60 * 60 * 1000;

/**
 * 古い日程調整を、候補・回答・可否とともに削除し、削除した件数を返す。
 * 基準は最後の候補の終了日時。候補が0件(主催者が全部削除した)なら作成した時刻。
 * 基準からちょうど RETENTION_DAYS 日までは残し、それを過ぎたら削除する。確定しているかどうかは問わない。
 * 1日1回、Cloudflare の Cron Triggers から呼ぶ(worker.ts)
 */
export async function deleteExpiredPolls(db: Db, now: number) {
  // 読んでから消すまでの間に候補が追加されることは、ほぼないので考えない(D1 は対話的なトランザクションがない)
  const ids = await findPollIdsLastUsedBefore(db, now - RETENTION_DAYS * DAY);
  await deletePolls(db, ids);
  return ids.length;
}
