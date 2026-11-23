import type { Availability } from "./validation";

export type RankingSlot = { id: string; start: number };

/** 候補 ID → 可否。キーがない候補は未回答 */
export type RankingResponse = { availabilities: Readonly<Record<string, Availability>> };

/** 候補ごとの集計。counts は ○△× それぞれの件数(未回答は数えない) */
export type RankedSlot = { slotId: string; score: number; counts: Record<Availability, number> };

const POINTS: Record<Availability, number> = { yes: 2, maybe: 1, no: 0 };

export function rankSlots(
  slots: readonly RankingSlot[],
  responses: readonly RankingResponse[],
): RankedSlot[] {
  return slots
    .map((slot) => {
      const counts: Record<Availability, number> = { yes: 0, maybe: 0, no: 0 };
      for (const r of responses) {
        const a = r.availabilities[slot.id];
        if (a) counts[a] += 1;
      }
      const score = counts.yes * POINTS.yes + counts.maybe * POINTS.maybe + counts.no * POINTS.no;
      return { slotId: slot.id, start: slot.start, score, counts };
    })
    // スコアの高い順。同点なら × の少ない順、それも同じなら開始の早い順
    .sort((x, y) => y.score - x.score || x.counts.no - y.counts.no || x.start - y.start)
    .map(({ slotId, score, counts }) => ({ slotId, score, counts }));
}
