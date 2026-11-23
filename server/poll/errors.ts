export type PollErrorCode =
  /** 日程調整や回答が見つからない */
  | "NOT_FOUND"
  /** 入力が不正 */
  | "INVALID_INPUT"
  /** 上限超過(候補25件、回答者50人) */
  | "LIMIT_EXCEEDED"
  /** 確定中なので変更できない */
  | "FINALIZED";

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

/** 確定中に変更しようとしたときのエラー。確定中は日程調整全体が読み取り専用。文言はそのまま画面に出る */
export const finalizedError = () => new PollError("FINALIZED", "日程が確定しているため変更できません。");
