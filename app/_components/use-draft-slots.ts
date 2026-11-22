"use client";

import { useState } from "react";
import type { DraftSlot } from "./slot-grid";

/** 表の列(日付)と、まだ保存していない候補。日付を外すと、その列で作った候補も消える */
export function useDraftSlots(initialDates: string[] = []) {
  const [dates, setDates] = useState<string[]>(() => [...initialDates].sort());
  const [drafts, setDrafts] = useState<DraftSlot[]>([]);
  return {
    dates,
    drafts,
    addDate: (date: string) => setDates((current) => (current.includes(date) ? current : [...current, date].sort())),
    removeDate: (date: string) => {
      setDates((current) => current.filter((d) => d !== date));
      setDrafts((current) => current.filter((d) => d.date !== date));
    },
    addSlot: (slot: Omit<DraftSlot, "key">) => setDrafts((current) => [...current, { ...slot, key: crypto.randomUUID() }]),
    removeSlot: (key: string) => setDrafts((current) => current.filter((d) => d.key !== key)),
    clearSlots: () => setDrafts([]),
  };
}
