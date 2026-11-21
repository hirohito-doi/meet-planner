// JST の日時の計算と表示。サーバーとブラウザの両方で使う。
// 時刻は UTC のミリ秒で受け取る。JST は夏時間のない UTC+9 なので、9時間ずらして UTC として読めば JST の暦と時計になる。

const JST_OFFSET = 9 * 60 * 60 * 1000;
const WEEKDAYS = "日月火水木金土";
const DAY = 24 * 60 * 60 * 1000;

/** その時刻を含む JST の日の 0:00 */
const jstMidnightOf = (time: number) => time - ((((time + JST_OFFSET) % DAY) + DAY) % DAY);

/** JST として読んだ暦と時計 */
function jst(time: number) {
  const d = new Date(time + JST_OFFSET);
  return {
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    weekday: WEEKDAYS[d.getUTCDay()],
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
  };
}

const formatDay = (time: number) => {
  const t = jst(time);
  return `${t.month}/${t.day}(${t.weekday})`;
};

const formatClock = (time: number) => {
  const t = jst(time);
  return `${t.hours}:${String(t.minutes).padStart(2, "0")}`;
};

/** 候補を実際の日時で表示する。日付をまたぐときは終了にも日付を付け、0:00 ちょうどの終了は 24:00 と書く */
export function formatSlot(slot: { start: number; end: number }) {
  const head = `${formatDay(slot.start)} ${formatClock(slot.start)}`;
  if (slot.end === jstMidnightOf(slot.start) + DAY) return `${head}-24:00`;
  if (jstMidnightOf(slot.end) !== jstMidnightOf(slot.start)) {
    return `${head} - ${formatDay(slot.end)} ${formatClock(slot.end)}`;
  }
  return `${head}-${formatClock(slot.end)}`;
}

/** 日付(YYYY-MM-DD、JST の暦)の 0:00 を UTC のミリ秒で返す */
export function jstMidnight(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) - JST_OFFSET;
}

/** 表の中のブロック用の短い時刻。列の日付から見て前日なら「前」、翌日なら「翌」を付ける。翌日 0:00 ちょうどの終了は「24:00」 */
export function formatClockInColumn(date: string, time: number, { isEnd = false } = {}) {
  if (isEnd && time === jstMidnight(date) + DAY) return "24:00";
  const offset = Math.round((jstMidnightOf(time) - jstMidnight(date)) / DAY);
  const prefix = offset < 0 ? "前" : offset > 0 ? "翌" : "";
  return prefix + formatClock(time);
}

/** 時刻を含む JST の日付(YYYY-MM-DD)。保存済みの候補を置く列は、開始時刻のこの日付で決める */
export function jstDate(time: number) {
  return new Date(time + JST_OFFSET).toISOString().slice(0, 10);
}
