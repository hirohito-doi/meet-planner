"use client";

import { useState } from "react";
import type { DraftSlot } from "./slot-grid";

/** 表の列(日付)と、まだ保存していない候補。日付を外すと、その列で作った候補も消える */
export function useDraftSlots(initialDates: string[] = []) {
  const [dates, setDates] = useState<string[]>(() => [...initialDates].sort());
  const [drafts, setDrafts] = useState<DraftSlot[]>([]);
  const addDate = (date: string) => setDates((current) => (current.includes(date) ? current : [...current, date].sort()));
  /** 列を外す。その列で作った候補があるときは、確かめてから外す */
  const removeDate = (date: string) => {
    const count = drafts.filter((d) => d.date === date).length;
    if (count > 0 && !confirm(`この日付の新しい候補(${count}件)も消えます。外しますか?`)) return;
    setDates((current) => current.filter((d) => d !== date));
    setDrafts((current) => current.filter((d) => d.date !== date));
  };
  return {
    dates,
    drafts,
    addDate,
    removeDate,
    /** カレンダーで日付を押したとき: 列になっていなければ足し、なっていれば外す */
    toggleDate: (date: string) => (dates.includes(date) ? removeDate(date) : addDate(date)),
    addSlot: (slot: Omit<DraftSlot, "key">) => setDrafts((current) => [...current, { ...slot, key: crypto.randomUUID() }]),
    removeSlot: (key: string) => setDrafts((current) => current.filter((d) => d.key !== key)),
    /** 上下のつまみで伸び縮みさせた候補の時刻を変える(作った列はそのまま) */
    resizeSlot: (key: string, range: { start: number; end: number }) =>
      setDrafts((current) => current.map((d) => (d.key === key ? { ...d, ...range } : d))),
    clearSlots: () => setDrafts([]),
  };
}
