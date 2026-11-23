import { describe, expect, test } from "vitest";
import { rankSlots } from "./ranking";

const at = (iso: string) => new Date(iso).getTime();

describe("rankSlots", () => {
  test("スコアは可否を ○=2、△=1、×=0 として合計した値になる。○△× の件数も返す", () => {
    const slots = [{ id: "a", start: at("2026-12-03T19:00:00+09:00") }];
    const responses = [
      { availabilities: { a: "yes" } },
      { availabilities: { a: "maybe" } },
      { availabilities: { a: "no" } },
    ] as const;

    expect(rankSlots(slots, responses)).toEqual([{ slotId: "a", score: 3, counts: { yes: 1, maybe: 1, no: 1 } }]);
  });

  test("候補はスコアの高い順に並ぶ", () => {
    const slots = [
      { id: "low", start: at("2026-12-03T19:00:00+09:00") },
      { id: "high", start: at("2026-12-04T19:00:00+09:00") },
    ];
    const responses = [
      { availabilities: { low: "maybe", high: "yes" } },
      { availabilities: { low: "no", high: "yes" } },
    ] as const;

    expect(rankSlots(slots, responses).map((r) => r.slotId)).toEqual(["high", "low"]);
  });

  test("スコアが同じなら、× の少ない候補が上位になる", () => {
    const slots = [
      { id: "withNo", start: at("2026-12-03T19:00:00+09:00") }, // ○ と × で 2点、× が1つ
      { id: "noNo", start: at("2026-12-04T19:00:00+09:00") }, // △ と △ で 2点、× なし
    ];
    const responses = [
      { availabilities: { withNo: "yes", noNo: "maybe" } },
      { availabilities: { withNo: "no", noNo: "maybe" } },
    ] as const;

    expect(rankSlots(slots, responses).map((r) => r.slotId)).toEqual(["noNo", "withNo"]);
  });

  test("スコアも × の数も同じなら、開始日時の早い候補が上位になる", () => {
    const slots = [
      { id: "later", start: at("2026-12-04T19:00:00+09:00") },
      { id: "earlier", start: at("2026-12-03T19:00:00+09:00") },
    ];
    const responses = [{ availabilities: { later: "yes", earlier: "yes" } }] as const;

    expect(rankSlots(slots, responses).map((r) => r.slotId)).toEqual(["earlier", "later"]);
  });

  test("未回答は 0点として数え、× の数には含めない", () => {
    const slots = [
      { id: "answeredNo", start: at("2026-12-03T19:00:00+09:00") }, // ○ と × で 2点
      { id: "unanswered", start: at("2026-12-04T19:00:00+09:00") }, // ○ と未回答で 2点
    ];
    const responses = [
      { availabilities: { answeredNo: "yes", unanswered: "yes" } },
      { availabilities: { answeredNo: "no" } },
    ] as const;

    expect(rankSlots(slots, responses)).toEqual([
      { slotId: "unanswered", score: 2, counts: { yes: 1, maybe: 0, no: 0 } },
      { slotId: "answeredNo", score: 2, counts: { yes: 1, maybe: 0, no: 1 } },
    ]);
  });
});
