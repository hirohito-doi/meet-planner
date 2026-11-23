// 可否(○△×)の記号と色。回答画面の表と管理画面の集計で同じものを使う
import type { Availability } from "@/server/poll";

export const SYMBOL: Record<Availability, string> = { yes: "○", maybe: "△", no: "×" };

/** 記号の色 */
export const MARK_COLOR: Record<Availability, string> = {
  yes: "text-emerald-600",
  maybe: "text-amber-500",
  no: "text-rose-500",
};

/** 回答画面の表で、可否が入ったマスの背景色 */
export const CELL_COLOR: Record<Availability, string> = {
  yes: "bg-emerald-50",
  maybe: "bg-amber-50",
  no: "bg-rose-50",
};

export const AVAILABILITIES: readonly Availability[] = ["yes", "maybe", "no"];
