"use client";

// 常に表示しておく月のカレンダー。日付を押すと日付の入力欄に入る。docs/spec.md「候補の作成」
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
  value,
  onSelect,
  added,
}: {
  /** 日付の入力欄の値(YYYY-MM-DD) */
  value: string;
  onSelect: (date: string) => void;
  /** 表の列になっている日付 */
  added: string[];
}) {
  const today = useToday();
  // 表示する月。動かすまでは、入力欄の日付か今日の月
  const [shown, setShown] = useState<{ year: number; month: number } | null>(null);
  const base = value || today;
  if (!base) return <div className="h-64" />;
  const { year, month } = shown ?? { year: Number(base.slice(0, 4)), month: Number(base.slice(5, 7)) - 1 };

  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = [...Array<null>(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const dateOf = (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const move = (delta: number) => {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setShown({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  };

  return (
    <div className="w-72 rounded border border-zinc-300 p-2">
      <div className="mb-1 flex items-center justify-between">
        <button type="button" aria-label="前の月" onClick={() => move(-1)} className="flex size-10 items-center justify-center rounded border border-zinc-300 text-xl hover:bg-zinc-100">
          ‹
        </button>
        <span className="text-sm font-medium">
          {year}年{month + 1}月
        </span>
        <button type="button" aria-label="次の月" onClick={() => move(1)} className="flex size-10 items-center justify-center rounded border border-zinc-300 text-xl hover:bg-zinc-100">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs">
        {WEEKDAYS.map((w, i) => (
          <span key={w} className={`py-1 ${i === 0 ? "text-red-600" : i === 6 ? "text-blue-600" : "text-zinc-500"}`}>
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
              selected={dateOf(day) === value}
              added={added.includes(dateOf(day))}
              today={dateOf(day) === today}
              onSelect={onSelect}
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
  selected,
  added,
  today,
  onSelect,
}: {
  day: number;
  date: string;
  weekday: number;
  selected: boolean;
  added: boolean;
  today: boolean;
  onSelect: (date: string) => void;
}) {
  const color = selected
    ? "bg-blue-700 text-white"
    : added
      ? "bg-blue-100 text-blue-900"
      : weekday === 0
        ? "text-red-600 hover:bg-zinc-100"
        : weekday === 6
          ? "text-blue-600 hover:bg-zinc-100"
          : "hover:bg-zinc-100";
  return (
    <button
      type="button"
      aria-label={date}
      aria-pressed={selected}
      onClick={() => onSelect(date)}
      className={`m-0.5 rounded py-1.5 text-sm ${color} ${today ? "font-bold underline" : ""}`}
    >
      {day}
    </button>
  );
}
