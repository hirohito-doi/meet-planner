"use client";

// 回答画面。docs/spec.md「回答」: 名前を登録してから、セルをタップするたびに自動で保存する
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { formatSlot } from "@/lib/jst";
import type { Availability, PollView } from "@/server/poll";
import { joinAction, renameAction, setAvailabilityAction } from "./actions";

type Me = { responseId: string; editToken: string };
type Cell = Availability | null;

const SYMBOL: Record<Availability, string> = { yes: "○", maybe: "△", no: "×" };
/** 可否ごとの色。記号の色とマスの背景色 */
const TONE: Record<Availability, string> = {
  yes: "bg-emerald-50 text-emerald-600",
  maybe: "bg-amber-50 text-amber-500",
  no: "bg-rose-50 text-rose-500",
};

/** 可否の印。太さをそろえるため SVG で描き、読み上げとテストのために記号の文字も持つ */
function Mark({ value }: { value: Availability }) {
  return (
    <>
      <svg viewBox="0 0 24 24" aria-hidden className="size-7" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        {value === "yes" && <circle cx="12" cy="12" r="8.5" />}
        {value === "maybe" && <path d="M12 3.5 21 19.5H3Z" />}
        {value === "no" && <path d="M5 5 19 19M19 5 5 19" />}
      </svg>
      <span className="sr-only">{SYMBOL[value]}</span>
    </>
  );
}

/** 候補を日付と時刻に分ける(例: 「12/3(木)」と「10:00-12:00」) */
function splitSlot(slot: { start: number; end: number }) {
  const text = formatSlot(slot);
  const space = text.indexOf(" ");
  return { day: text.slice(0, space), time: text.slice(space + 1) };
}
/** タップするたびに 空欄 → ○ → △ → × → 空欄 と切り替わる */
const NEXT: Record<"none" | Availability, Cell> = { none: "yes", yes: "maybe", maybe: "no", no: null };
/** 同じセルを素早く何度もタップしたときは、最後の値だけを保存する */
const SAVE_DELAY = 400;

export function ResponseTable({ poll }: { poll: PollView }) {
  const { me, loaded, saveMe } = useStoredMe(poll.id);
  const inTransition = useInTransition();
  // 主催者が回答を削除した後などは、保存したトークンが使えない。消して名前の入力からやり直してもらう
  const myResponse = me ? poll.responses.find((r) => r.id === me.responseId) : undefined;
  // 登録した直後は、画面のデータに自分の回答がまだ現れていないことがある。現れるまでは消さない
  const joinedId = useRef<string | null>(null);
  useEffect(() => {
    if (myResponse && joinedId.current === myResponse.id) joinedId.current = null;
    if (me && !myResponse && joinedId.current !== me.responseId) saveMe(null);
  }, [me, myResponse, saveMe]);

  const finalized = poll.finalizedSlotId !== null;
  const [overrides, setOverrides] = useState<Record<string, Cell>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // 保存待ち(タップしてから送るまでの間)のままページを閉じると最後のタップが失われるので、確認を出す
  const hasUnsaved = Object.keys(overrides).length > 0;
  useEffect(() => {
    if (!hasUnsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved]);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);

  const handleFailure = (result: { ok: false; code: string; message: string }) => {
    if (result.code === "NOT_FOUND") {
      saveMe(null);
      setError("あなたの回答が見つかりませんでした。もう一度名前を入力してください。");
    } else {
      setError(result.message);
    }
  };

  const tap = (slotId: string) => {
    if (!me || !myResponse || finalized) return;
    const current = slotId in overrides ? overrides[slotId] : (myResponse.availabilities[slotId] ?? null);
    const next = NEXT[current ?? "none"];
    setOverrides((o) => ({ ...o, [slotId]: next }));
    clearTimeout(timers.current[slotId]);
    timers.current[slotId] = setTimeout(async () => {
      const result = await inTransition(() => setAvailabilityAction(poll.id, me.editToken, slotId, next));
      setOverrides((o) => {
        const rest = { ...o };
        delete rest[slotId];
        return rest;
      });
      if (!result.ok) handleFailure({ ...result, message: `保存できませんでした。${result.message}` });
      else setError(null);
    }, SAVE_DELAY);
  };

  const rename = async (name: string) => {
    if (!me) return false;
    const result = await inTransition(() => renameAction(poll.id, me.editToken, name));
    if (!result.ok) handleFailure(result);
    return result.ok;
  };

  const finalizedSlot = poll.slots.find((s) => s.id === poll.finalizedSlotId);
  const needsName = loaded && !finalized && !myResponse;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{poll.title}</h1>
        {poll.description && <p className="whitespace-pre-wrap text-zinc-700">{poll.description}</p>}
      </header>

      {finalizedSlot && (
        <div className="rounded-lg border-2 border-emerald-600 bg-emerald-50 px-5 py-4 text-emerald-900">
          <p className="text-sm font-medium">日程が確定しました</p>
          <p className="text-xl font-bold">{formatSlot(finalizedSlot)}</p>
        </div>
      )}
      {error && <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700">{error}</p>}

      {poll.slots.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-zinc-500">
          候補がまだありません。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-300 shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-zinc-100">
                <th className="sticky left-0 z-10 border-b-2 border-r border-zinc-300 bg-zinc-100 px-3 py-2 text-left text-sm font-bold text-zinc-700">
                  候補
                </th>
                {poll.responses.map((r) => {
                  const mine = r.id === myResponse?.id;
                  return (
                    <th
                      key={r.id}
                      className={`min-w-16 border-b-2 border-l border-zinc-300 px-2 py-2 text-sm font-bold ${
                        mine ? "bg-slate-200 text-slate-900" : "text-zinc-800"
                      }`}
                    >
                      {mine && !finalized ? (
                        <button
                          type="button"
                          onClick={() => setEditingName(true)}
                          className="rounded px-1 underline decoration-slate-400 underline-offset-4 hover:bg-slate-300"
                        >
                          {r.name}
                        </button>
                      ) : (
                        r.name
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {poll.slots.map((slot) => {
                const isFinalized = slot.id === poll.finalizedSlotId;
                const { day, time } = splitSlot(slot);
                return (
                  <tr key={slot.id} className={isFinalized ? "bg-emerald-100" : ""}>
                    <td
                      className={`sticky left-0 z-10 whitespace-nowrap border-r border-t border-zinc-300 px-3 py-2 ${
                        isFinalized ? "bg-emerald-100" : "bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-sm font-bold text-zinc-900">{day}</div>
                          <div className="text-sm text-zinc-700">{time}</div>
                        </div>
                        {isFinalized && (
                          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">確定</span>
                        )}
                      </div>
                    </td>
                    {poll.responses.map((r) => {
                      const mine = r.id === myResponse?.id;
                      const value = mine && slot.id in overrides ? overrides[slot.id] : (r.availabilities[slot.id] ?? null);
                      return (
                        <td
                          key={r.id}
                          className={`border-t border-zinc-300 p-0 text-center text-2xl font-bold ${
                            mine ? "border-x-2 border-x-slate-400" : "border-l"
                          } ${value ? TONE[value] : ""}`}
                        >
                          {mine && !finalized ? (
                            <button
                              type="button"
                              aria-label={`${formatSlot(slot)}の可否`}
                              onClick={() => tap(slot.id)}
                              className="flex h-14 w-full min-w-16 items-center justify-center p-1.5 hover:brightness-95 active:brightness-90"
                            >
                              {value ? (
                                <Mark value={value} />
                              ) : (
                                <span className="h-full w-full rounded border-2 border-dashed border-zinc-300" />
                              )}
                            </button>
                          ) : (
                            <span className="flex h-14 items-center justify-center px-2">{value && <Mark value={value} />}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {needsName && (
        <NameDialog
          title="名前を入力して回答を始めます"
          submitLabel="回答を始める"
          initialName=""
          onSubmit={async (name) => {
            const result = await inTransition(() => joinAction(poll.id, name));
            if (!result.ok) return result.message;
            joinedId.current = result.value.responseId;
            saveMe(result.value);
            setError(null);
            return null;
          }}
        />
      )}
      {editingName && myResponse && (
        <NameDialog
          title="名前を変更します"
          submitLabel="保存"
          initialName={myResponse.name}
          onCancel={() => setEditingName(false)}
          onSubmit={async (name) => {
            const ok = await rename(name);
            if (ok) setEditingName(false);
            return null;
          }}
        />
      )}
    </div>
  );
}

function NameDialog({
  title,
  submitLabel,
  initialName,
  onSubmit,
  onCancel,
}: {
  title: string;
  submitLabel: string;
  initialName: string;
  /** 失敗したときはメッセージを返す */
  onSubmit: (name: string) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <form
        className="w-full max-w-sm space-y-4 rounded bg-white p-6 shadow-lg"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setMessage(await onSubmit(name));
          setPending(false);
        }}
      >
        <h2 className="text-lg font-bold">{title}</h2>
        <input
          autoFocus
          required
          maxLength={30}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="名前"
          className="w-full rounded-lg border-2 border-zinc-300 px-3 py-3 text-lg focus:border-zinc-600 focus:outline-none"
        />
        {message && <p className="text-sm text-red-600">{message}</p>}
        <div className="flex justify-end gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="rounded-lg border border-zinc-300 px-4 py-2.5">
              キャンセル
            </button>
          )}
          <button type="submit" disabled={pending || !name.trim()} className="rounded-lg bg-zinc-800 px-5 py-2.5 font-bold text-white hover:bg-zinc-700 disabled:opacity-40">
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Server Action を transition の中で呼ぶ(action の結果を待てるように Promise で包む) */
function useInTransition() {
  const [, startTransition] = useTransition();
  return <T,>(action: () => Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      startTransition(async () => {
        try {
          resolve(await action());
        } catch (error) {
          reject(error);
        }
      });
    });
}

/** ブラウザに保存した自分の回答(編集用トークン)。同じブラウザからのみ自分の回答を変更できる */
function useStoredMe(pollId: string) {
  const key = `meet-planner:poll:${pollId}`;
  const raw = useSyncExternalStore(
    subscribeStorage,
    () => readStorage(key),
    () => undefined,
  );
  const saveMe = useCallback(
    (value: Me | null) => {
      try {
        if (value) localStorage.setItem(key, JSON.stringify(value));
        else localStorage.removeItem(key);
      } catch {
        // 保存できない環境(プライベートモードなど)では、自分の回答を後から変更できない
      }
      window.dispatchEvent(new Event(STORAGE_EVENT));
    },
    [key],
  );
  // サーバーで描画するときは undefined(まだ読めていない)
  const me = useMemo(() => (raw ? (JSON.parse(raw) as Me) : null), [raw]);
  return { me, loaded: raw !== undefined, saveMe };
}

const STORAGE_EVENT = "meet-planner:storage";

function subscribeStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
