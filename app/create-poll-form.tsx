"use client";

// 作成画面。左にタイトル・カレンダー・新しい候補の一覧と作成ボタン、右に候補を作る表(docs/spec.md「画面のデザイン」)
import { useState, useTransition } from "react";
import { formatSlot } from "@/lib/jst";
import { MonthCalendar } from "./_components/month-calendar";
import { SlotGrid } from "./_components/slot-grid";
import { Button, ErrorMessage, Section, TwoColumns } from "./_components/ui";
import { useDraftSlots } from "./_components/use-draft-slots";
import { createPollAction } from "./actions";

export function CreatePollForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const slots = useDraftSlots();
  const { drafts } = slots;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createPollAction({
        title,
        description,
        slots: drafts.map((d) => ({ start: d.start, end: d.end })),
      });
      // 成功したときは管理画面へ移るので、ここに戻ってくるのは失敗したときだけ
      if (result && !result.ok) setError(result.message);
    });
  };

  const sortedDrafts = [...drafts].sort((a, b) => a.start - b.start || a.end - b.end);

  return (
    <form onSubmit={submit}>
      <TwoColumns
        top={
          <div className="space-y-2">
            <input
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タイトル(必須)"
              aria-label="タイトル(必須)"
              className="w-full border-0 border-b-2 border-slate-200 bg-transparent px-0 py-2 text-3xl font-bold text-slate-900 placeholder:text-slate-300 focus:border-accent focus:outline-none"
            />
            <textarea
              maxLength={1000}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="説明(任意)"
              aria-label="説明"
              className="w-full resize-none border-0 bg-transparent px-0 text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        }
        side={
          <>
            <Section title="日付">
              <MonthCalendar added={slots.dates} fixed={[]} onToggle={slots.toggleDate} />
            </Section>
          </>
        }
        sideBottom={
          <>
            <Section title={`候補 ${drafts.length} 件`}>
              {sortedDrafts.length === 0 ? (
                <p className="text-sm text-slate-500">表で時間を選ぶと、ここに並びます。</p>
              ) : (
                <ul className="max-h-56 space-y-1 overflow-auto">
                  {sortedDrafts.map((d) => (
                    <li key={d.key} className="flex items-center justify-between rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-800">
                      {formatSlot(d)}
                      <button
                        type="button"
                        aria-label={`${formatSlot(d)}を外す`}
                        onClick={() => slots.removeSlot(d.key)}
                        className="rounded px-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-800"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {error && <ErrorMessage>{error}</ErrorMessage>}
            <div className="space-y-2">
              <Button type="submit" kind="primary" size="lg" disabled={pending || drafts.length === 0} className="w-full">
                {pending ? "作成しています…" : "日程調整を作成する"}
              </Button>
              <p className="text-xs text-slate-500">作ると、回答用のリンクと管理用のリンクができます。</p>
            </div>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-sm text-slate-500">
            {slots.dates.length === 0
              ? "カレンダーで日付を選ぶと、表に列ができます。"
              : "PC はドラッグ、スマホは開始と終了のマスを順にタップして候補を作ります。横にドラッグすると、複数の日にまとめて作れます。"}
          </p>
          <SlotGrid
            dates={slots.dates}
            drafts={drafts}
            onCreate={slots.addSlot}
            onDelete={slots.removeSlot}
            onRemoveDate={slots.removeDate}
          />
        </div>
      </TwoColumns>
    </form>
  );
}
