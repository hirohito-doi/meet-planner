// 画面に共通する見た目の部品。色は白地に slate を基本にし、色は可否と注意の表示だけに使う
import Link from "next/link";

/** 全画面の上に出す帯 */
export function AppHeader({ label }: { label?: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="font-bold text-slate-900">
          meet-planner
        </Link>
        {label && <span className="text-sm text-slate-500">{label}</span>}
      </div>
    </header>
  );
}

/**
 * 上に横幅いっぱいのタイトル、その下に、左に操作と情報、右に広い作業場所を置く2列。
 * スマホでは1列にして top → side → children → sideBottom の順に並べる(作業場所の上で一覧が伸びて、表がずれないように)
 */
export function TwoColumns({
  top,
  side,
  sideBottom,
  children,
}: {
  top: React.ReactNode;
  side?: React.ReactNode;
  sideBottom?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr]">
      <div className="lg:col-span-2 lg:row-start-1">{top}</div>
      {side && <div className="space-y-8 lg:col-start-1 lg:row-start-2">{side}</div>}
      <div className="min-w-0 space-y-8 lg:col-start-2 lg:row-span-2 lg:row-start-2">{children}</div>
      {sideBottom && <div className="space-y-8 lg:col-start-1 lg:row-start-3">{sideBottom}</div>}
    </main>
  );
}

/** 小さな見出し付きのまとまり */
export function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold tracking-wider text-slate-500">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

type ButtonKind = "primary" | "secondary" | "danger";

const BUTTON: Record<ButtonKind, string> = {
  primary: "bg-slate-900 text-white shadow-sm hover:bg-slate-700",
  secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
};

export function Button({
  kind = "secondary",
  size = "sm",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: ButtonKind; size?: "sm" | "lg" }) {
  const sizeClass = size === "lg" ? "px-5 py-3 font-bold" : "px-3 py-1.5 text-sm font-medium";
  return (
    <button type="button" {...props} className={`rounded-lg disabled:opacity-40 ${sizeClass} ${BUTTON[kind]} ${className}`} />
  );
}

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200";

/** 失敗したときのメッセージ */
export function ErrorMessage({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{children}</p>;
}
