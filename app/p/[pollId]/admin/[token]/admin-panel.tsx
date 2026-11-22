"use client";

// 管理画面。docs/spec.md「確定」「管理画面」
import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
import { SlotSection } from "@/app/_components/slot-section";
import { useDraftSlots } from "@/app/_components/use-draft-slots";
import { formatSlot, jstDate } from "@/lib/jst";
import type { PollView } from "@/server/poll";
import {
  addSlotsAction,
  deletePollAction,
  deleteResponseAction,
  finalizeAction,
  removeSlotAction,
  unfinalizeAction,
  updateDetailsAction,
} from "./actions";

type Result = { ok: true } | { ok: false; message: string };

export function AdminPanel({ poll, token, created }: { poll: PollView; token: string; created: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const finalized = poll.finalizedSlotId !== null;

  /** 操作を実行し、失敗したらメッセージを出す */
  const run = (operation: () => Promise<Result | undefined>) =>
    startTransition(async () => {
      const result = await operation();
      setMessage(result && !result.ok ? result.message : null);
    });

  const slotById = new Map(poll.slots.map((s) => [s.id, s]));
  const countOf = (slotId: string, value: "yes" | "maybe" | "no") =>
    poll.responses.filter((r) => r.availabilities[slotId] === value).length;

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <p className="text-sm text-zinc-500">管理画面</p>
        <h1 className="text-2xl font-semibold">{poll.title}</h1>
        <Link href={`/p/${poll.id}`} className="text-sm text-blue-700 underline">
          回答画面を開く
        </Link>
      </header>

      <Links pollId={poll.id} token={token} created={created} />

      {message && <p className="rounded bg-red-50 px-4 py-2 text-sm text-red-700">{message}</p>}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">候補(スコアの高い順)</h2>
        {finalized && (
          <p className="text-sm text-zinc-600">
            確定中は、回答・候補の追加・タイトルと説明を変更できません。変更するには、確定を取り消してください。候補の削除はできます。
          </p>
        )}
        {poll.ranking.length === 0 && <p className="text-sm text-zinc-500">候補がありません。</p>}
        <ul className="divide-y divide-zinc-200 rounded border border-zinc-200">
          {poll.ranking.map(({ slotId, score }) => {
            const slot = slotById.get(slotId)!;
            const isFinalized = slotId === poll.finalizedSlotId;
            return (
              <li key={slotId} className={`flex flex-wrap items-center gap-3 px-3 py-2 ${isFinalized ? "bg-green-50" : ""}`}>
                <span className="min-w-56 font-medium">
                  {isFinalized && "✅ "}
                  {formatSlot(slot)}
                </span>
                <span className="text-sm text-zinc-600">
                  スコア {score}(○{countOf(slotId, "yes")} △{countOf(slotId, "maybe")} ×{countOf(slotId, "no")})
                </span>
                <span className="ml-auto flex gap-2">
                  {isFinalized ? (
                    <Button disabled={pending} onClick={() => run(() => unfinalizeAction(poll.id, token))}>
                      確定を取り消す
                    </Button>
                  ) : (
                    <Button disabled={pending} onClick={() => run(() => finalizeAction(poll.id, token, slotId))}>
                      この候補で確定する
                    </Button>
                  )}
                  <Button
                    danger
                    disabled={pending}
                    onClick={() => {
                      const warning = isFinalized ? "確定も取り消されます。" : "";
                      if (confirm(`${formatSlot(slot)} を削除します。この候補への回答も消えます。${warning}`)) {
                        run(() => removeSlotAction(poll.id, token, slotId));
                      }
                    }}
                  >
                    削除
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <SlotEditor poll={poll} token={token} />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">回答者({poll.responses.length}人)</h2>
        {poll.responses.length === 0 && <p className="text-sm text-zinc-500">まだ回答がありません。</p>}
        <ul className="divide-y divide-zinc-200 rounded border border-zinc-200">
          {poll.responses.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2">
              <span className="font-medium">{r.name}</span>
              <span className="ml-auto">
                <Button
                  danger
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`${r.name} さんの回答を削除します。`)) run(() => deleteResponseAction(poll.id, token, r.id));
                  }}
                >
                  削除
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {!finalized && <Details poll={poll} token={token} />}

      <section className="space-y-2">
        <h2 className="text-lg font-medium">日程調整の削除</h2>
        <p className="text-sm text-zinc-600">候補と回答もすべて削除します。元に戻せません。</p>
        <Button
          danger
          disabled={pending}
          onClick={() => {
            if (confirm(`「${poll.title}」を削除します。元に戻せません。`)) run(() => deletePollAction(poll.id, token));
          }}
        >
          日程調整を削除する
        </Button>
      </section>
    </div>
  );
}

function Links({ pollId, token, created }: { pollId: string; token: string; created: boolean }) {
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  return (
    <section className={`space-y-3 rounded border p-4 ${created ? "border-amber-500 bg-amber-50" : "border-zinc-200"}`}>
      {created && <p className="font-medium">日程調整を作成しました。</p>}
      <CopyField label="回答用リンク(回答者に共有します)" value={`${origin}/p/${pollId}`} />
      <CopyField label="管理用リンク(主催者だけが使います)" value={`${origin}/p/${pollId}/admin/${token}`} />
      <p className="text-sm font-medium text-amber-800">
        管理用リンクを紛失すると、日程の確定や候補の変更ができなくなり、復旧もできません。必ずブックマークなどで保存してください。
      </p>
    </section>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <p className="text-sm">{label}</p>
      <div className="flex gap-2">
        <input readOnly value={value} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm" />
        <Button
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
          }}
        >
          {copied ? "コピーしました" : "コピー"}
        </Button>
      </div>
    </div>
  );
}

/** 候補の表。新しい候補を追加し、保存済みの候補を削除する。確定中は削除だけできる */
function SlotEditor({ poll, token }: { poll: PollView; token: string }) {
  const finalized = poll.finalizedSlotId !== null;
  // 保存済みの候補は、開始時刻の日付の列に灰色で描く(docs/spec.md「候補の作成」)
  const savedDates = [...new Set(poll.slots.map((s) => jstDate(s.start)))];
  const draftSlots = useDraftSlots();
  const dates = [...new Set([...savedDates, ...draftSlots.dates])].sort();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">{finalized ? "候補の削除" : "候補の追加と削除"}</h2>
      <SlotSection
        {...draftSlots}
        dates={dates}
        locked={poll.slots}
        fixedDates={savedDates}
        canCreate={!finalized}
        onDeleteLocked={(id) => {
          const slot = poll.slots.find((s) => s.id === id);
          if (!slot) return;
          const warning = id === poll.finalizedSlotId ? "確定も取り消されます。" : "";
          if (!confirm(`${formatSlot(slot)} を削除します。この候補への回答も消えます。${warning}`)) return;
          startTransition(async () => {
            const result = await removeSlotAction(poll.id, token, id);
            setMessage(result.ok ? null : result.message);
          });
        }}
      />
      {message && <p className="text-sm text-red-600">{message}</p>}
      {!finalized && (
        <Button
          disabled={pending || draftSlots.drafts.length === 0}
          onClick={() =>
            startTransition(async () => {
              const result = await addSlotsAction(
                poll.id,
                token,
                draftSlots.drafts.map((d) => ({ start: d.start, end: d.end })),
              );
              if (result.ok) draftSlots.clearSlots();
              setMessage(result.ok ? null : result.message);
            })
          }
        >
          候補を追加する
        </Button>
      )}
    </section>
  );
}

function Details({ poll, token }: { poll: PollView; token: string }) {
  const [title, setTitle] = useState(poll.title);
  const [description, setDescription] = useState(poll.description);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">タイトルと説明</h2>
      <input
        required
        maxLength={100}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded border border-zinc-300 px-3 py-2"
      />
      <textarea
        maxLength={1000}
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded border border-zinc-300 px-3 py-2"
      />
      {message && <p className="text-sm text-zinc-700">{message}</p>}
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await updateDetailsAction(poll.id, token, { title, description });
            setMessage(result.ok ? "保存しました。" : result.message);
          })
        }
      >
        保存する
      </Button>
    </section>
  );
}

function Button({
  danger = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded border px-3 py-1 text-sm disabled:opacity-40 ${
        danger ? "border-red-300 text-red-700 hover:bg-red-50" : "border-zinc-300 hover:bg-zinc-100"
      }`}
    />
  );
}
