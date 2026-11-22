"use client";

import { MonthCalendar } from "./month-calendar";
import { SlotGrid } from "./slot-grid";
import type { useDraftSlots } from "./use-draft-slots";

/** 日付を選び、表の上で候補を作る */
export function SlotSection({
  dates,
  drafts,
  saved,
  fixedDates,
  addDate,
  removeDate,
  addSlot,
  removeSlot,
  onDeleteSaved,
  canCreate = true,
}: ReturnType<typeof useDraftSlots> &
  Pick<React.ComponentProps<typeof SlotGrid>, "saved" | "fixedDates" | "onDeleteSaved" | "canCreate">) {
  /** 列を外す。その列で作った候補があるときは、確かめてから外す */
  const removeDateWithConfirm = (target: string) => {
    const count = drafts.filter((d) => d.date === target).length;
    if (count === 0 || confirm(`この日付の新しい候補(${count}件)も消えます。外しますか?`)) removeDate(target);
  };
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">候補</h2>
      {canCreate && (
        <MonthCalendar
          added={dates}
          fixed={fixedDates ?? []}
          onToggle={(d) => (dates.includes(d) ? removeDateWithConfirm(d) : addDate(d))}
        />
      )}
      <p className="text-xs text-zinc-500">
        {!canCreate
          ? "確定中は候補を追加できません。候補を選ぶと削除できます。"
          : dates.length === 0
            ? "カレンダーで日付を選ぶと、表に列ができます。"
            : "PC はドラッグ、スマホは開始と終了のマスを順にタップして候補を作ります。候補を選ぶと削除できます。"}
      </p>
      <SlotGrid
        dates={dates}
        drafts={drafts}
        saved={saved}
        onCreate={addSlot}
        onDelete={removeSlot}
        onRemoveDate={removeDateWithConfirm}
        fixedDates={fixedDates}
        onDeleteSaved={onDeleteSaved}
        canCreate={canCreate}
      />
      {canCreate && <p className="text-xs text-zinc-500">新しい候補: {drafts.length}件</p>}
    </section>
  );
}
