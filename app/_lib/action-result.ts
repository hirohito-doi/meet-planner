import "server-only";
import { PollError, type PollErrorCode } from "@/server/poll";

/** Server Action の戻り値。画面はこれを見てメッセージを出す */
export type ActionResult<T = null> = { ok: true; value: T } | { ok: false; code: PollErrorCode; message: string };

const MESSAGES: Record<PollErrorCode, string | null> = {
  NOT_FOUND: "日程調整が見つかりません。削除された可能性があります。",
  INVALID_INPUT: "入力内容を確認してください。",
  // 上限と確定中のメッセージは server/poll が具体的に書いているので、それを使う
  LIMIT_EXCEEDED: null,
  FINALIZED: "日程が確定しているため変更できません。",
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
