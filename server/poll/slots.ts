export type SlotInput = { start: number; end: number };

/** 1つの日程調整の候補の上限(重複をまとめた後の件数) */
export const MAX_SLOTS = 25;

/** 開始と終了が完全に一致する候補を1件にまとめる。先に出てきた方を残す */
export function uniqueSlots<T extends SlotInput>(input: readonly T[]): T[] {
  const seen = new Set<string>();
  return input.filter((s) => {
    const key = `${s.start}-${s.end}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
