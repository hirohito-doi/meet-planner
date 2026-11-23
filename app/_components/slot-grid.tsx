"use client";

// 候補を作る表。docs/spec.md「候補の作成」「表のレイアウト」
import { useEffect, useRef, useState } from "react";
import { formatClockInColumn, formatDay, jstDate, jstMidnight } from "@/lib/jst";
import { columnsBetween, layout, resizeSlot, ROWS, slotFromRows } from "@/lib/slot-grid";

/** 画面の中だけにある、まだ保存していない候補。作った列(date)を覚えておく */
export type DraftSlot = { key: string; date: string; start: number; end: number };
/** 保存済みの候補。開始時刻の日付の列に灰色で描く。onDeleteSaved があれば、選んで削除できる */
export type SavedSlot = { id: string; start: number; end: number };

const ROW_HEIGHT = 22;
/** 初期表示で表の上端に来る時刻(8:00)の行 */
const INITIAL_ROW = (8 * 60 + 6 * 60) / 30;
/** タップとみなす指の移動量の上限 */
const TAP_SLOP = 10;

type Block = { key: string; start: number; end: number; kind: "draft" | "saved" | "preview" };
/** date は始めた列、to は今いる列。横に動かすと、その間の列すべてに同じ時刻の候補を作る */
type Drag = { date: string; to: string; a: number; b: number; moved: boolean; blockKey: string | null };
type TapStart = { date: string; row: number; blockKey: string | null; x: number; y: number };
/** 選んだ候補の上端か下端のつまみをドラッグしている間の状態 */
type Resize = { key: string; date: string; edge: "start" | "end" };

export function SlotGrid({
  dates,
  drafts,
  saved = [],
  onCreate,
  onDelete,
  onResize,
  onRemoveDate,
  fixedDates = [],
  onDeleteSaved,
  canCreate = true,
}: {
  dates: string[];
  drafts: DraftSlot[];
  saved?: SavedSlot[];
  onCreate: (slot: Omit<DraftSlot, "key">) => void;
  onDelete: (key: string) => void;
  /** 選んだ新しい候補の時刻を、上下のつまみで変える。ないときはつまみを出さない */
  onResize?: (key: string, range: { start: number; end: number }) => void;
  onRemoveDate?: (date: string) => void;
  /** 保存済みの候補がある日付。この列は外せない */
  fixedDates?: string[];
  /** 保存済みの候補を削除する */
  onDeleteSaved?: (id: string) => void;
  /** false なら候補を作れない(確定中)。選択と削除だけできる */
  canCreate?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const touchRef = useRef<TapStart | null>(null);
  const resizeRef = useRef<Resize | null>(null);
  const columnRefs = useRef(new Map<string, HTMLDivElement>());
  const [preview, setPreview] = useState<Drag | null>(null);
  const [pendingStart, setPendingStart] = useState<{ date: string; row: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = INITIAL_ROW * ROW_HEIGHT;
  }, []);

  // 表の外のクリック/タップと Esc キーで、選択と開始の印を解除する
  useEffect(() => {
    const clear = () => {
      setSelected(null);
      setPendingStart(null);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element;
      if (!rootRef.current?.contains(target) && !target.closest("[data-slot-grid-ui]")) clear();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") clear();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const rowAt = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.min(ROWS - 1, Math.max(0, Math.floor((e.clientY - rect.top) / ROW_HEIGHT)));
  };
  const blockKeyAt = (e: React.PointerEvent) => {
    const el = (e.target as Element).closest<HTMLElement>("[data-block-key]");
    return el?.dataset.blockKey ?? null;
  };

  /** 横位置にある列。表の左右の外にあるときは、端の列 */
  const dateAt = (clientX: number) => {
    let found = dates[0];
    for (const date of dates) {
      const rect = columnRefs.current.get(date)?.getBoundingClientRect();
      if (rect && clientX >= rect.left) found = date;
    }
    return found;
  };

  /** from の列から to の列まで、どの列にも同じ時刻の候補を作る */
  const create = (from: string, to: string, a: number, b: number) => {
    for (const date of columnsBetween(dates, from, to)) onCreate({ date, ...slotFromRows(date, a, b) });
  };

  // PC(マウス・ペン): ドラッグ1回で、1列につき候補1件。横に動かすと、その間の列すべてに作る。動かさずに離したら、候補の選択・選択の解除・30分の候補のどれか
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, date: string) => {
    const row = rowAt(e);
    const blockKey = blockKeyAt(e);
    if (e.pointerType === "touch") {
      touchRef.current = { date, row, blockKey, x: e.clientX, y: e.clientY };
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { date, to: date, a: row, b: row, moved: false, blockKey };
    // 選択中や候補の上で押したときは、動かすまでプレビューを出さない(クリックなら選択の操作になるため)
    setPreview(selected || blockKey || !canCreate ? null : { ...dragRef.current });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const row = rowAt(e);
    const to = dateAt(e.clientX);
    if (row === drag.b && to === drag.to) return;
    drag.b = row;
    drag.to = to;
    drag.moved ||= row !== drag.a || to !== drag.date;
    if (drag.moved && canCreate) setPreview({ ...drag });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return onTap(e);
    const drag = dragRef.current;
    dragRef.current = null;
    setPreview(null);
    if (!drag) return;
    if (drag.moved) {
      if (canCreate) create(drag.date, drag.to, drag.a, drag.b);
      setSelected(null);
    } else if (drag.blockKey && isSelectable(drag.blockKey)) {
      setSelected((current) => (current === drag.blockKey ? null : drag.blockKey));
    } else if (selected) {
      setSelected(null);
    } else if (canCreate) {
      create(drag.date, drag.date, drag.a, drag.a);
    }
  };

  // スマホ: 開始マスと終了マスを順にタップする。別の列で終了をタップすると、その間の列すべてに作る。
  // 指が動いたらスクロールとみなして何もしない
  const onTap = (e: React.PointerEvent<HTMLDivElement>) => {
    const touch = touchRef.current;
    touchRef.current = null;
    if (!touch || Math.hypot(e.clientX - touch.x, e.clientY - touch.y) > TAP_SLOP) return;
    const { date, row, blockKey } = touch;
    // 開始を選んだ後のタップは、候補の上でも終了として扱う
    if (pendingStart && canCreate) {
      create(pendingStart.date, date, pendingStart.row, row);
      setPendingStart(null);
    } else if (blockKey && isSelectable(blockKey)) {
      setPendingStart(null);
      setSelected((current) => (current === blockKey ? null : blockKey));
    } else if (selected) {
      setSelected(null);
    } else if (canCreate) {
      setPendingStart({ date, row });
    }
  };

  // 上下のつまみ: 選んだ新しい候補の開始・終了を、つまみを動かした先のマスに合わせる(PC もスマホも同じ)。
  // 表のほかの操作(候補の作成、選択の解除)に伝えないよう、イベントはここで止める
  // どの候補のどちらの端かは、つまみの data-* 属性から読む
  const startResize = (e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    const { resizeHandle, resizeKey, resizeDate } = e.currentTarget.dataset;
    if (!resizeKey || !resizeDate || (resizeHandle !== "start" && resizeHandle !== "end")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = { key: resizeKey, date: resizeDate, edge: resizeHandle };
  };
  const moveResize = (e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    const resize = resizeRef.current;
    const draft = resize && drafts.find((d) => d.key === resize.key);
    const column = resize && columnRefs.current.get(resize.date);
    if (!resize || !draft || !column) return;
    const row = Math.floor((e.clientY - column.getBoundingClientRect().top) / ROW_HEIGHT);
    const next = resizeSlot(resize.date, draft, resize.edge, row);
    if (next.start !== draft.start || next.end !== draft.end) onResize?.(resize.key, next);
  };
  const endResize = (e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    resizeRef.current = null;
  };

  const isDraft = (key: string) => drafts.some((d) => d.key === key);
  const isSelectable = (key: string) => isDraft(key) || (!!onDeleteSaved && saved.some((s) => s.id === key));

  const blocksOf = (date: string): Block[] => {
    const blocks: Block[] = [
      ...saved.filter((s) => jstDate(s.start) === date).map((s) => ({ ...s, key: s.id, kind: "saved" as const })),
      ...drafts.filter((d) => d.date === date).map((d) => ({ ...d, kind: "draft" as const })),
    ];
    // 作成中の候補(ドラッグ中のプレビュー、スマホの開始の印)も、作成後と同じ幅と位置で並べる
    const making =
      preview && columnsBetween(dates, preview.date, preview.to).includes(date)
        ? preview
        : pendingStart?.date === date
          ? { a: pendingStart.row, b: pendingStart.row }
          : null;
    if (making) blocks.push({ key: "__preview", ...slotFromRows(date, making.a, making.b), kind: "preview" });
    return blocks;
  };

  const rowOf = (date: string, time: number) => (time - jstMidnight(date) + 6 * 60 * 60 * 1000) / (30 * 60 * 1000);

  return (
    <div ref={rootRef} className="relative select-none">
      <div ref={scrollRef} className="relative max-h-[60vh] overflow-auto rounded border border-slate-300 bg-white">
        <div className="flex min-w-full">
          {/* 時刻の目盛り */}
          <div className="sticky left-0 z-20 w-16 shrink-0 bg-white">
            <div className="sticky top-0 z-10 h-10 border-b border-slate-300 bg-white" />
            {Array.from({ length: ROWS }, (_, row) => (
              <div key={row} style={{ height: ROW_HEIGHT }} className="pr-2 text-right text-sm font-medium leading-none text-slate-600">
                {row % 2 === 0 ? rowLabel(row) : ""}
              </div>
            ))}
          </div>
          {/* 日付がまだないときも、時刻の目盛りと空の列を出しておく */}
          {dates.length === 0 && (
            <div className="flex-1 border-l border-slate-300">
              <div className="sticky top-0 z-10 h-10 border-b border-slate-300 bg-white" />
              <div style={{ height: ROWS * ROW_HEIGHT }} />
            </div>
          )}
          {dates.map((date) => (
            <div key={date} className="min-w-20 max-w-[50%] flex-1 basis-0 border-l border-slate-300 sm:min-w-24">
              <div className="sticky top-0 z-10 flex h-10 items-center justify-center gap-1 border-b border-slate-300 bg-white text-sm">
                {formatDay(jstMidnight(date))}
                {onRemoveDate && !fixedDates.includes(date) && (
                  <button
                    type="button"
                    aria-label={`${formatDay(jstMidnight(date))}を外す`}
                    className="flex size-8 items-center justify-center rounded text-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    onClick={() => onRemoveDate(date)}
                  >
                    ×
                  </button>
                )}
              </div>
              <div
                ref={(el) => {
                  if (el) columnRefs.current.set(date, el);
                  else columnRefs.current.delete(date);
                }}
                aria-label={`${formatDay(jstMidnight(date))}の候補の表`}
                className={`relative ${canCreate ? "cursor-pointer" : ""}`}
                style={{ height: ROWS * ROW_HEIGHT }}
                onPointerDown={(e) => onPointerDown(e, date)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => {
                  dragRef.current = null;
                  touchRef.current = null;
                  setPreview(null);
                }}
              >
                {Array.from({ length: ROWS }, (_, row) => (
                  <div
                    key={row}
                    style={{ top: row * ROW_HEIGHT, height: ROW_HEIGHT }}
                    className={`absolute inset-x-0 border-b ${row % 2 === 1 ? "border-slate-200" : "border-slate-100"} ${
                      row < 12 || row >= 60 ? "bg-slate-50" : ""
                    }`}
                  />
                ))}
                {/* 右端の 24px は候補ブロックを置かない余白。スマホではここをタップして重なる候補の開始を選ぶ */}
                <div className="absolute inset-y-0 left-0 right-6">
                  {layout(blocksOf(date)).map(({ slot, lane, lanes }) => {
                    const width = `min(160px, calc(100% / ${lanes}))`;
                    return (
                      <div
                        key={slot.key}
                        data-block-key={slot.kind === "preview" ? undefined : slot.key}
                        style={{
                          top: rowOf(date, slot.start) * ROW_HEIGHT,
                          height: ((slot.end - slot.start) / (30 * 60 * 1000)) * ROW_HEIGHT,
                          left: `calc(${lane} * ${width})`,
                          width,
                        }}
                        className={`absolute rounded border px-1 text-xs leading-tight ${
                          selected === slot.key ? "z-[5]" : ""
                        } ${
                          slot.kind !== "preview" && isSelectable(slot.key) ? "cursor-pointer" : "cursor-default"
                        } ${blockStyle(
                          slot.kind,
                          selected === slot.key,
                        )}`}
                      >
                        <span className="block h-full overflow-hidden">
                          {formatClockInColumn(date, slot.start)}-{formatClockInColumn(date, slot.end, { isEnd: true })}
                        </span>
                        {/* つまみは枠の外に出し、短い候補でも時刻の文字と重ならないようにする */}
                        {onResize &&
                          slot.kind === "draft" &&
                          selected === slot.key &&
                          (["start", "end"] as const).map((edge) => (
                            <span
                              key={edge}
                              data-resize-handle={edge}
                              data-resize-key={slot.key}
                              data-resize-date={date}
                              aria-hidden
                              className={`absolute inset-x-0 flex h-4 cursor-ns-resize touch-none justify-center ${
                                edge === "start" ? "-top-2.5 items-start" : "-bottom-2.5 items-end"
                              }`}
                              onPointerDown={startResize}
                              onPointerMove={moveResize}
                              onPointerUp={endResize}
                              onPointerCancel={endResize}
                            >
                              <span className="h-1.5 w-8 rounded-full border border-accent-strong bg-white" />
                            </span>
                          ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* 日付がないときの案内。スクロールしても動かないよう、表の枠の上に重ねて、時刻の目盛り(w-16)と見出しの行(h-10)を除いた範囲の真ん中に置く */}
      {dates.length === 0 && (
        <div className="pointer-events-none absolute inset-y-0 right-0 left-16 top-10 flex items-center justify-center">
          <p className="rounded-lg bg-white/90 px-4 py-2 text-slate-500">日付を選んでください</p>
        </div>
      )}
      {selected && (
        <div data-slot-grid-ui className="fixed inset-x-0 bottom-0 z-30 flex justify-center border-t border-slate-300 bg-white p-3">
          <button
            type="button"
            className="rounded-lg bg-red-600 px-5 py-2.5 font-bold text-white shadow-sm hover:bg-red-700"
            onClick={() => {
              if (isDraft(selected)) onDelete(selected);
              else onDeleteSaved?.(selected);
              setSelected(null);
            }}
          >
            この候補を削除
          </button>
        </div>
      )}
    </div>
  );
}

/** 目盛りの時刻。表の先頭は前日 18:00 */
function rowLabel(row: number) {
  const minutes = row * 30 - 6 * 60;
  const prefix = minutes < 0 ? "前" : minutes >= 24 * 60 ? "翌" : "";
  const clock = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${prefix}${Math.floor(clock / 60)}:${String(clock % 60).padStart(2, "0")}`;
}

function blockStyle(kind: Block["kind"], selected: boolean) {
  if (kind === "saved") return selected ? "border-slate-800 bg-slate-600 text-white ring-2 ring-slate-300" : "border-slate-400 bg-slate-200 text-slate-600";
  if (kind === "preview") return "border-dashed border-accent bg-accent-soft/80 text-accent-soft-ink";
  return selected ? "border-accent-strong bg-accent-strong text-on-accent ring-2 ring-own-line" : "border-accent-strong bg-accent/60 text-on-accent";
}
