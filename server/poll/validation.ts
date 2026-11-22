import { z } from "zod";
import { PollError } from "./errors";

const MINUTE = 60 * 1000;
const STEP = 30 * MINUTE;
const MAX_SLOT_LENGTH = 36 * 60 * MINUTE;

/** 30分単位の時刻。JST は UTC+9時間(30分の倍数)なので、UTC のミリ秒で判定してよい */
const slotTime = z.int().refine((t) => t % STEP === 0, "30分単位の時刻を指定してください");

const slotSchema = z
  .object({ start: slotTime, end: slotTime })
  .refine((s) => s.end > s.start, "終了は開始より後にしてください")
  .refine((s) => s.end - s.start <= MAX_SLOT_LENGTH, "候補の長さは36時間までです");

// 重複をまとめる前の件数の上限。大量に送られても重い処理をしないため(まとめた後の上限25件は別に確かめる)
export const slotListSchema = z.array(slotSchema).min(1).max(100);

const title = z.string().trim().min(1).max(100);
const description = z.string().trim().max(1000);

export const detailsSchema = z.object({ title, description });

export const createPollSchema = z.object({
  title,
  description,
  slots: slotListSchema,
});

const name = z.string().trim().min(1).max(30);

export const joinSchema = z.object({ name });

export const renameSchema = z.object({ name });

/** 可否。null は未回答に戻す */
export const availabilitySchema = z.enum(["yes", "maybe", "no"]).nullable();

/** zod で検証し、失敗したら PollError("INVALID_INPUT") を投げる */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw new PollError("INVALID_INPUT", z.prettifyError(result.error));
  return result.data;
}
