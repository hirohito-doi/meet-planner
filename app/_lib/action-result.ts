import "server-only";
import { PollError, type PollErrorCode } from "@/server/poll";

/** Server Action の戻り値。画面はこれを見てメッセージを出す */
export type ActionResult<T = null> = { ok: true; value: T } | { ok: false; code: PollErrorCode; message: string };

// 画面に出す文言の持ち主をコードごとに決める。
// 見つからない・入力が不正のときは、server/poll の文言(開発者向けの詳しい内容)を見せず、ここの文言を出す。
// 上限と確定中は、server/poll が画面向けに書いた文言(上限の件数など)をそのまま出す
const MESSAGES: Record<PollErrorCode, string | null> = {
  NOT_FOUND: "日程調整が見つかりません。削除された可能性があります。",
  INVALID_INPUT: "入力内容を確認してください。",
  LIMIT_EXCEEDED: null,
  FINALIZED: null,
};

/** server/poll の操作を実行し、PollError を画面用のメッセージに変える。それ以外のエラーはそのまま投げる */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    if (error instanceof PollError) {
      return { ok: false, code: error.code, message: MESSAGES[error.code] ?? error.message };
    }
    throw error;
  }
}
