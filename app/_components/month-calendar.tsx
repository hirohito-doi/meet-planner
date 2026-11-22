"use client";

// 常に表示しておく月のカレンダー。日付を押すと表の列になり、もう一度押すと外れる。docs/spec.md「候補の作成」
import { useState, useSyncExternalStore } from "react";
import { jstDate } from "@/lib/jst";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 今日の JST の日付。サーバーでの描画(事前描画)では空にして、ブラウザで決める */
function useToday() {
  return useSyncExternalStore(
    () => () => {},
    () => jstDate(Date.now()),
    () => "",
  );
}

export function MonthCalendar({
  added,
  fixed,
  onToggle,
}: {
  /** 表の列になっている日付 */
  added: string[];
  /** 外せない日付(保存済みの候補がある日付) */
  fixed: string[];
  onToggle: (date: string) => void;
}) {
  const today = useToday();
  // ‹ › で動かした月。動かすまでは、保存済みの候補があればその最初の月、なければ今日の月
  const [shown, setShown] = useState<{ year: number; month: number } | null>(null);
  const start = [...fixed].sort()[0] ?? today;
  if (!start) return <div className="h-64" />;
  const { year, month } = shown ?? { year: Number(start.slice(0, 4)), month: Number(start.slice(5, 7)) - 1 };

  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = [...Array<null>(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const dateOf = (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const move = (delta: number) => {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setShown({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  };

  return (
    <div className="w-72 rounded border border-slate-300 p-2">
      <div className="mb-1 flex items-center justify-between">
        <button type="button" aria-label="前の月" onClick={() => move(-1)} className="flex size-10 items-center justify-center rounded border border-slate-300 text-xl hover:bg-slate-100">
          ‹
        </button>
        <span className="text-sm font-medium">
          {year}年{month + 1}月
        </span>
        <button type="button" aria-label="次の月" onClick={() => move(1)} className="flex size-10 items-center justify-center rounded border border-slate-300 text-xl hover:bg-slate-100">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs">
        {WEEKDAYS.map((w, i) => (
          <span key={w} className={`py-1 ${i === 0 ? "text-red-600" : i === 6 ? "text-blue-600" : "text-slate-500"}`}>
            {w}
          </span>
        ))}
        {cells.map((day, i) =>
          day === null ? (
            <span key={`blank-${i}`} />
          ) : (
            <DayButton
              key={day}
              day={day}
              date={dateOf(day)}
              weekday={i % 7}
              added={added.includes(dateOf(day))}
              fixed={fixed.includes(dateOf(day))}
              today={dateOf(day) === today}
              onToggle={onToggle}
            />
          ),
        )}
      </div>
    </div>
  );
}

function DayButton({
  day,
  date,
  weekday,
  added,
  fixed,
  today,
  onToggle,
}: {
  day: number;
  date: string;
  weekday: number;
  added: boolean;
  fixed: boolean;
  today: boolean;
  onToggle: (date: string) => void;
}) {
  const color = fixed
    ? "bg-slate-300 text-slate-700"
    : added
      ? "bg-slate-800 text-white"
      : weekday === 0
        ? "text-red-600 hover:bg-slate-100"
        : weekday === 6
          ? "text-blue-600 hover:bg-slate-100"
          : "hover:bg-slate-100";
  return (
    <button
      type="button"
      aria-label={date}
      aria-pressed={added}
      disabled={fixed}
      title={fixed ? "保存済みの候補がある日付は外せません" : undefined}
      onClick={() => onToggle(date)}
      className={`m-0.5 rounded py-1.5 text-sm ${color} ${today ? "font-bold underline" : ""}`}
    >
      {day}
    </button>
  );
}
