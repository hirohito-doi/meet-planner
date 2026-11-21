/** 可否: ○ = yes、△ = maybe、× = no */
export type Availability = "yes" | "maybe" | "no";

export type RankingSlot = { id: string; start: number };

/** 候補 ID → 可否。キーがない候補は未回答 */
export type RankingResponse = { availabilities: Readonly<Record<string, Availability>> };

export type RankedSlot = { slotId: string; score: number };

const POINTS: Record<Availability, number> = { yes: 2, maybe: 1, no: 0 };

export function rankSlots(
  slots: readonly RankingSlot[],
  responses: readonly RankingResponse[],
): RankedSlot[] {
  return slots
    .map((slot) => {
      const answers = responses.map((r) => r.availabilities[slot.id]);
      return {
        slotId: slot.id,
        start: slot.start,
        score: answers.reduce((sum, a) => sum + (a ? POINTS[a] : 0), 0),
        noCount: answers.filter((a) => a === "no").length,
      };
    })
    .sort((x, y) => y.score - x.score || x.noCount - y.noCount || x.start - y.start)
    .map(({ slotId, score }) => ({ slotId, score }));
}
