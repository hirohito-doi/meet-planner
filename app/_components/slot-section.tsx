"use client";

import { useState } from "react";
import { SlotGrid } from "./slot-grid";
import type { useDraftSlots } from "./use-draft-slots";

/** 日付を選び、表の上で候補を作る */
export function SlotSection({
  dates,
  drafts,
  locked,
  fixedDates,
  addDate,
  removeDate,
  addSlot,
  removeSlot,
}: ReturnType<typeof useDraftSlots> &
  Pick<React.ComponentProps<typeof SlotGrid>, "locked" | "fixedDates">) {
  const [date, setDate] = useState("");
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">候補</h2>
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-2"
        />
        <button
          type="button"
          disabled={!date}
          onClick={() => {
            addDate(date);
            setDate("");
          }}
          className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-40"
        >
          日付を追加
        </button>
      </div>
      {dates.length === 0 ? (
        <p className="text-sm text-zinc-500">日付を追加すると、表の上で候補を作れます。</p>
      ) : (
        <>
          <p className="text-xs text-zinc-500">
            PC はドラッグ、スマホは開始と終了のマスを順にタップして候補を作ります。候補を選ぶと削除できます。
          </p>
          <SlotGrid
            dates={dates}
            drafts={drafts}
            locked={locked}
            onCreate={addSlot}
            onDelete={removeSlot}
            onRemoveDate={removeDate}
            fixedDates={fixedDates}
          />
          <p className="text-xs text-zinc-500">新しい候補: {drafts.length}件</p>
        </>
      )}
    </section>
  );
}
