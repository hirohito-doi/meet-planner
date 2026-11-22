import { describe, expect, test } from "vitest";
import { columnsBetween, layout, ROWS, slotFromRows } from "./index";

const at = (iso: string) => new Date(iso).getTime();

describe("選んだマスから候補を作る", () => {
  test("先頭のマスを1つだけ選ぶと、前日 18:00 からの30分の候補になる", () => {
    expect(slotFromRows("2026-12-03", 0, 0)).toEqual({
      start: at("2026-12-02T18:00:00+09:00"),
      end: at("2026-12-02T18:30:00+09:00"),
    });
  });

  test("下から上へドラッグしても、上から下へドラッグしたのと同じ候補になる", () => {
    // 50行目は 19:00、53行目は 20:30 のマス
    const expected = { start: at("2026-12-03T19:00:00+09:00"), end: at("2026-12-03T21:00:00+09:00") };

    expect(slotFromRows("2026-12-03", 50, 53)).toEqual(expected);
    expect(slotFromRows("2026-12-03", 53, 50)).toEqual(expected);
  });

  test("先頭から最後のマスまで選ぶと、前日 18:00 から翌日 6:00 までの候補になる", () => {
    expect(slotFromRows("2026-12-03", 0, ROWS - 1)).toEqual({
      start: at("2026-12-02T18:00:00+09:00"),
      end: at("2026-12-04T06:00:00+09:00"),
    });
  });
});

/** 時刻を「時」で書いた候補(テストを読みやすくするため、12/3 の JST で解釈する) */
const slot = (id: string, from: number, to: number) => ({
  id,
  start: at("2026-12-03T00:00:00+09:00") + from * 60 * 60 * 1000,
  end: at("2026-12-03T00:00:00+09:00") + to * 60 * 60 * 1000,
});

/** レイアウトの結果を「ID: レーン/レーン数」の形にする */
const lanesOf = (placed: ReturnType<typeof layout<ReturnType<typeof slot>>>) =>
  placed.map((p) => `${p.slot.id}: ${p.lane}/${p.lanes}`);

describe("重なった候補を横に並べる", () => {
  test("重ならない候補は、それぞれレーン1本の幅いっぱいに置く", () => {
    expect(lanesOf(layout([slot("b", 21, 22), slot("a", 19, 20)]))).toEqual(["a: 0/1", "b: 0/1"]);
  });

  test("重なる2件は、レーン2本に分けて横に並べる", () => {
    expect(lanesOf(layout([slot("a", 19, 21), slot("b", 20, 22)]))).toEqual(["a: 0/2", "b: 1/2"]);
  });

  test("隣り合う候補(終了と開始が同じ)は重ならないとみなし、前の重なりのレーン数に影響されない", () => {
    expect(lanesOf(layout([slot("a", 19, 21), slot("b", 20, 21), slot("c", 21, 22)]))).toEqual([
      "a: 0/2",
      "b: 1/2",
      "c: 0/1",
    ]);
  });

  test("前の候補が終わって空いたレーンは使い回し、レーンを無駄に増やさない", () => {
    // c は b と重なるが、a が終わった後のレーン0に入れる
    expect(lanesOf(layout([slot("a", 19, 20), slot("b", 19, 22), slot("c", 20, 21)]))).toEqual([
      "a: 0/2",
      "b: 1/2",
      "c: 0/2",
    ]);
  });
});

describe("横にドラッグした範囲の列", () => {
  test("始めた列から離した列まで、間の列も含めて表の並び順で返す", () => {
    const dates = ["2026-12-03", "2026-12-05", "2026-12-08", "2026-12-10"];

    expect(columnsBetween(dates, "2026-12-08", "2026-12-03")).toEqual(["2026-12-03", "2026-12-05", "2026-12-08"]);
  });
});
