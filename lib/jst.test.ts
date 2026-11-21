import { describe, expect, test } from "vitest";
import { formatClockInColumn, formatSlot, jstMidnight } from "./jst";

const at = (iso: string) => new Date(iso).getTime();

describe("候補の表示", () => {
  test("同じ日の中の候補は、日付と開始・終了の時刻で表示する", () => {
    expect(formatSlot({ start: at("2026-12-03T19:00:00+09:00"), end: at("2026-12-03T21:00:00+09:00") })).toBe(
      "12/3(木) 19:00-21:00",
    );
  });

  test("UTC ではまだ前日にあたる深夜の候補も、JST の日付と時刻で表示する", () => {
    expect(formatSlot({ start: at("2026-12-04T02:00:00+09:00"), end: at("2026-12-04T03:00:00+09:00") })).toBe(
      "12/4(金) 2:00-3:00",
    );
  });

  test("0:00 ちょうどに終わる候補は、終了を 24:00 と表示する", () => {
    expect(formatSlot({ start: at("2026-11-20T23:00:00+09:00"), end: at("2026-11-21T00:00:00+09:00") })).toBe(
      "11/20(金) 23:00-24:00",
    );
  });

  test("日付をまたぐ候補は、終了にも日付を付けて表示する", () => {
    expect(formatSlot({ start: at("2026-11-20T23:00:00+09:00"), end: at("2026-11-21T01:00:00+09:00") })).toBe(
      "11/20(金) 23:00 - 11/21(土) 1:00",
    );
  });
});

describe("日付の 0:00", () => {
  test("日付から、その日の JST 0:00 を求める", () => {
    expect(jstMidnight("2026-12-03")).toBe(at("2026-12-03T00:00:00+09:00"));
  });
});

describe("表の中の短い時刻", () => {
  test.each([
    ["列と同じ日", "2026-12-03T19:00:00+09:00", "19:00"],
    ["列の前日", "2026-12-02T22:30:00+09:00", "前22:30"],
    ["列の翌日", "2026-12-04T02:00:00+09:00", "翌2:00"],
  ])("%sの時刻は「%s」→「%s」", (_, iso, expected) => {
    expect(formatClockInColumn("2026-12-03", at(iso))).toBe(expected);
  });

  test("翌日 0:00 ちょうどの終了は「24:00」、開始なら「翌0:00」と書く", () => {
    const midnight = at("2026-12-04T00:00:00+09:00");

    expect(formatClockInColumn("2026-12-03", midnight, { isEnd: true })).toBe("24:00");
    expect(formatClockInColumn("2026-12-03", midnight)).toBe("翌0:00");
  });
});
