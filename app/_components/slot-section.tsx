"use client";

import { MonthCalendar } from "./month-calendar";
import { SlotGrid } from "./slot-grid";
import type { useDraftSlots } from "./use-draft-slots";

/** 日付を選び、表の上で候補を作る(管理画面の候補の追加と削除) */
export function SlotSection({
  dates,
  drafts,
  saved,
  fixedDates,
  removeDate,
  toggleDate,
  addSlot,
  removeSlot,
  onDeleteSaved,
  canCreate = true,
}: ReturnType<typeof useDraftSlots> &
  Pick<React.ComponentProps<typeof SlotGrid>, "saved" | "fixedDates" | "onDeleteSaved" | "canCreate">) {
  return (
    <div className="space-y-2">
      {canCreate && (
        <MonthCalendar
          added={dates}
          fixed={fixedDates ?? []}
          onToggle={toggleDate}
        />
      )}
      <p className="text-xs text-slate-500">
        {!canCreate
          ? "確定している間は候補を追加できません。候補を選ぶと削除できます。"
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
        onRemoveDate={removeDate}
        fixedDates={fixedDates}
        onDeleteSaved={onDeleteSaved}
        canCreate={canCreate}
      />
      {canCreate && <p className="text-xs text-slate-500">新しい候補 {drafts.length} 件</p>}
    </div>
  );
}
