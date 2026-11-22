"use client";

import { useState, useTransition } from "react";
import type { DraftSlot } from "./_components/slot-grid";
import { SlotSection } from "./_components/slot-section";
import { useDraftSlots } from "./_components/use-draft-slots";
import { createPollAction } from "./actions";

export function CreatePollForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const draftSlots = useDraftSlots();
  const { drafts } = draftSlots;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createPollAction({
        title,
        description,
        slots: drafts.map((d: DraftSlot) => ({ start: d.start, end: d.end })),
      });
      // 成功したときは管理画面へ移るので、ここに戻ってくるのは失敗したときだけ
      if (result && !result.ok) setError(result.message);
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <label className="block space-y-1">
        <span className="text-sm font-medium">タイトル(必須)</span>
        <input
          required
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">説明</span>
        <textarea
          maxLength={1000}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded border border-zinc-300 px-3 py-2"
        />
      </label>
      <SlotSection {...draftSlots} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending || drafts.length === 0}
        className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-40"
      >
        {pending ? "作成しています…" : "日程調整を作成する"}
      </button>
    </form>
  );
}
