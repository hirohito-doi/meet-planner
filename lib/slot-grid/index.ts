// 候補を作る表のロジック(純粋関数、ブラウザ側で使う)。docs/spec.md「候補の作成」
import { jstMidnight } from "@/lib/jst";

const MINUTE = 60 * 1000;
/** 1マス = 30分 */
const STEP = 30 * MINUTE;
/** 表の先頭は、列の日付の 0:00 から6時間前(前日 18:00) */
const OFFSET = -6 * 60 * MINUTE;
/** 1列の行数。前日 18:00〜翌日 6:00 の36時間 */
export const ROWS = 72;

/** 列の日付と行番号から、そのマスの開始時刻を求める */
const rowStart = (date: string, row: number) => jstMidnight(date) + OFFSET + row * STEP;

/** ドラッグ(またはタップ)の開始行と終了行から候補を作る。上下どちら向きに選んでもよい */
export function slotFromRows(date: string, a: number, b: number) {
  const top = Math.min(a, b);
  const bottom = Math.max(a, b);
  return { start: rowStart(date, top), end: rowStart(date, bottom + 1) };
}

type TimeRange = { start: number; end: number };

/** 列の中での候補の置き場所。lane 番目のレーンに置き、そのまとまりは lanes 本のレーンに分ける */
export type Placed<T> = { slot: T; lane: number; lanes: number };

/** 1列の中で重なる候補を横に並べるため、レーンを割り当てる。結果は開始時刻の順 */
export function layout<T extends TimeRange>(slots: readonly T[]): Placed<T>[] {
  const sorted = [...slots].sort((x, y) => x.start - y.start || x.end - y.end);
  const placed: Placed<T>[] = [];
  // 重なりでつながった候補のまとまり。まとまりの中のレーン数を、まとまり全員の lanes にする
  let cluster: Placed<T>[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    for (const p of cluster) p.lanes = laneEnds.length;
    placed.push(...cluster);
    cluster = [];
    laneEnds = [];
    clusterEnd = -Infinity;
  };
  for (const slot of sorted) {
    if (cluster.length && slot.start >= clusterEnd) flush();
    // 空いている(前の候補が終わった)レーンのうち、いちばん左に置く
    let lane = laneEnds.findIndex((end) => end <= slot.start);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = slot.end;
    cluster.push({ slot, lane, lanes: 0 });
    clusterEnd = Math.max(clusterEnd, slot.end);
  }
  flush();
  return placed;
}
