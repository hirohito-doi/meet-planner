export type PollErrorCode =
  /** 入力が不正 */
  | "INVALID_INPUT"
  /** 上限超過(候補25件、回答者50人) */
  | "LIMIT_EXCEEDED";

/** 日程調整のルールに反する操作をしたときのエラー。Server Action が画面のメッセージに変換する */
export class PollError extends Error {
  constructor(
    readonly code: PollErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PollError";
  }
}
