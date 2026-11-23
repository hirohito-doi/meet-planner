"use client";

// 管理画面。docs/spec.md「確定」「管理画面」
import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
import { SlotSection } from "@/app/_components/slot-section";
import { Button, ErrorMessage, inputClass, Section, TwoColumns } from "@/app/_components/ui";
import { useDraftSlots } from "@/app/_components/use-draft-slots";
import { formatSlot, jstDate } from "@/lib/jst";
import type { ActionResult } from "@/app/_lib/action-result";
import type { Availability, PollView } from "@/server/poll";
import {
  addSlotsAction,
  deletePollAction,
  deleteResponseAction,
  finalizeAction,
  removeSlotAction,
  unfinalizeAction,
  updateDetailsAction,
} from "./actions";

export function AdminPanel({ poll, token, created }: { poll: PollView; token: string; created: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const finalized = poll.finalizedSlotId !== null;

  /** 操作を実行し、失敗したらメッセージを出す */
  const run = (operation: () => Promise<ActionResult<unknown> | undefined>) =>
    startTransition(async () => {
      const result = await operation();
      setMessage(result && !result.ok ? result.message : null);
    });

  const slotById = new Map(poll.slots.map((s) => [s.id, s]));
  const countOf = (slotId: string, value: Availability) =>
    poll.responses.filter((r) => r.availabilities[slotId] === value).length;

  return (
    <TwoColumns
      top={
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-bold tracking-wider text-slate-500">管理画面</p>
            <h1 className="text-3xl font-bold text-slate-900">{poll.title}</h1>
            {poll.description && <p className="whitespace-pre-wrap text-slate-600">{poll.description}</p>}
          </div>
          <Link href={`/p/${poll.id}`} className="text-sm font-medium text-slate-700 underline underline-offset-4 hover:text-slate-950">
            回答画面を開く
          </Link>
        </div>
      }
      side={
        <>
          <Links pollId={poll.id} token={token} created={created} />
        </>
      }
      sideBottom={
        <>
          <Section title={`回答者 ${poll.responses.length} 人`}>
            {poll.responses.length === 0 ? (
              <p className="text-sm text-slate-500">まだ回答がありません。</p>
            ) : (
              // 人数が多くても下の項目が押し出されないよう、一覧の中でスクロールさせる
              <ul className="max-h-80 divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-200">
                {poll.responses.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="font-medium text-slate-900">{r.name}</span>
                    <Button
                      kind="danger"
                      className="ml-auto"
                      disabled={pending}
                      onClick={() => {
                        if (confirm(`${r.name} さんの回答を削除します。`)) run(() => deleteResponseAction(poll.id, token, r.id));
                      }}
                    >
                      削除
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {!finalized && <Details poll={poll} token={token} />}

          <Section title="日程調整の削除">
            <p className="text-sm text-slate-600">候補と回答もすべて削除します。元に戻せません。</p>
            <Button
              kind="danger"
              disabled={pending}
              onClick={() => {
                if (confirm(`「${poll.title}」を削除します。元に戻せません。`)) run(() => deletePollAction(poll.id, token));
              }}
            >
              日程調整を削除する
            </Button>
          </Section>
        </>
      }
    >
      {message && <ErrorMessage>{message}</ErrorMessage>}

      <Section title="候補(スコアの高い順)">
        {finalized && (
          <p className="text-sm text-slate-600">
            確定中は、回答・候補の追加・タイトルと説明を変更できません。変更するには、確定を取り消してください。候補の削除はできます。
          </p>
        )}
        {poll.ranking.length === 0 ? (
          <p className="text-sm text-slate-500">候補がありません。</p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {poll.ranking.map(({ slotId, score }) => {
              const slot = slotById.get(slotId)!;
              const isFinalized = slotId === poll.finalizedSlotId;
              return (
                <li key={slotId} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${isFinalized ? "bg-emerald-50" : ""}`}>
                  <span className="min-w-52 font-bold text-slate-900">
                    {formatSlot(slot)}
                    {isFinalized && (
                      <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 align-middle text-xs font-bold text-white">確定</span>
                    )}
                  </span>
                  <span className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="font-bold text-slate-900">スコア {score}</span>
                    <span className="text-emerald-600">○{countOf(slotId, "yes")}</span>
                    <span className="text-amber-500">△{countOf(slotId, "maybe")}</span>
                    <span className="text-rose-500">×{countOf(slotId, "no")}</span>
                  </span>
                  <span className="ml-auto flex gap-2">
                    {isFinalized ? (
                      <Button disabled={pending} onClick={() => run(() => unfinalizeAction(poll.id, token))}>
                        確定を取り消す
                      </Button>
                    ) : (
                      <Button kind="primary" disabled={pending} onClick={() => run(() => finalizeAction(poll.id, token, slotId))}>
                        この候補で確定する
                      </Button>
                    )}
                    <Button
                      kind="danger"
                      disabled={pending}
                      onClick={() => {
                        if (confirmRemoveSlot(poll, slotId)) run(() => removeSlotAction(poll.id, token, slotId));
                      }}
                    >
                      削除
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <SlotEditor poll={poll} token={token} />
    </TwoColumns>
  );
}

/** 候補を削除してよいかを確かめる。確定した候補なら、確定も取り消されることを伝える */
function confirmRemoveSlot(poll: PollView, slotId: string) {
  const slot = poll.slots.find((s) => s.id === slotId);
  if (!slot) return false;
  const warning = slotId === poll.finalizedSlotId ? "確定も取り消されます。" : "";
  return confirm(`${formatSlot(slot)} を削除します。この候補への回答も消えます。${warning}`);
}

function Links({ pollId, token, created }: { pollId: string; token: string; created: boolean }) {
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  return (
    <section className={`space-y-3 rounded-lg border p-4 ${created ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"}`}>
      {created && <p className="font-bold text-slate-900">日程調整を作成しました。</p>}
      <CopyField label="回答用リンク(回答者に共有します)" value={`${origin}/p/${pollId}`} />
      <CopyField label="管理用リンク(主催者だけが使います)" value={`${origin}/p/${pollId}/admin/${token}`} />
      <p className="text-xs font-medium text-amber-800">
        管理用リンクを紛失すると、日程の確定や候補の変更ができなくなり、復旧もできません。必ずブックマークなどで保存してください。
      </p>
    </section>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <p className="text-xs font-bold text-slate-600">{label}</p>
      <div className="flex gap-2">
        <input
          readOnly
          value={value}
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
        />
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
    <Section title={finalized ? "候補の削除" : "候補の追加と削除"}>
      <SlotSection
        {...draftSlots}
        dates={dates}
        saved={poll.slots}
        fixedDates={savedDates}
        canCreate={!finalized}
        onDeleteSaved={(id) => {
          if (!confirmRemoveSlot(poll, id)) return;
          startTransition(async () => {
            const result = await removeSlotAction(poll.id, token, id);
            setMessage(result.ok ? null : result.message);
          });
        }}
      />
      {message && <ErrorMessage>{message}</ErrorMessage>}
      {!finalized && (
        <Button
          kind="primary"
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
    </Section>
  );
}

function Details({ poll, token }: { poll: PollView; token: string }) {
  const [title, setTitle] = useState(poll.title);
  const [description, setDescription] = useState(poll.description);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <Section title="タイトルと説明">
      <input
        required
        maxLength={100}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="タイトル"
        className={inputClass}
      />
      <textarea
        maxLength={1000}
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        aria-label="説明"
        className={inputClass}
      />
      {message && <p className="text-sm text-slate-700">{message}</p>}
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
    </Section>
  );
}
