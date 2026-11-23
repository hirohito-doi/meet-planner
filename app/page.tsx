import Link from "next/link";
import { AppHeader } from "./_components/ui";

// サービスの紹介ページ。日程調整はここでは作らず、作成画面(/new)へ案内する
const STEPS = [
  { title: "候補の日時を選ぶ", body: "カレンダーで日付を選び、表をドラッグして時間帯を決めます。" },
  { title: "リンクを送る", body: "できた回答用リンクを、LINE やメールでみんなに送ります。" },
  { title: "集計を見て決める", body: "○△× の集計で都合のいい日時がひと目でわかります。決めたら確定します。" },
];

const FEATURES = [
  { title: "ログイン不要", body: "作る人も答える人も、アカウントを作らずに使えます。" },
  { title: "スマホで答えやすい", body: "マスをタップするだけで ○ → △ → × と切り替わります。" },
  { title: "候補をまとめて作れる", body: "横にドラッグすると、複数の日に同じ時間帯の候補ができます。" },
];

export default function Home() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <section className="flex flex-col items-center gap-6 text-center">
          <Marks />
          <h1 className="text-3xl font-bold leading-snug text-accent-soft-ink sm:text-4xl">
            みんなの都合を集めて、
            <br />
            日時を決める
          </h1>
          <p className="max-w-xl text-slate-600">
            候補の日時を作ってリンクを送るだけ。集まった ○△× から、全員に都合のいい日時が見つかります。
          </p>
          <CreateLink />
        </section>

        <section aria-labelledby="steps" className="mt-16">
          <h2 id="steps" className="text-center text-xl font-bold text-accent-soft-ink">
            使い方
          </h2>
          <ol className="mt-6 grid divide-y divide-line rounded-xl border border-line bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {STEPS.map((step, i) => (
              <li key={step.title} className="p-6">
                <span className="flex size-8 items-center justify-center rounded-full bg-accent font-bold text-on-accent">{i + 1}</span>
                <h3 className="mt-3 font-bold">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="features" className="mt-16">
          <h2 id="features" className="text-center text-xl font-bold text-accent-soft-ink">
            特徴
          </h2>
          <ul className="mt-6 grid divide-y divide-line rounded-xl bg-accent-soft sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="p-6">
                <h3 className="font-bold text-accent-soft-ink">{feature.title}</h3>
                <p className="mt-1 text-sm text-slate-700">{feature.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-16 flex justify-center">
          <CreateLink />
        </div>
      </main>
    </>
  );
}

function CreateLink() {
  return (
    <Link href="/new" className="rounded-lg bg-accent px-8 py-3.5 text-lg font-bold text-on-accent shadow-sm hover:bg-accent-strong">
      日程調整を作る
    </Link>
  );
}

/** 回答画面と同じ色の ○△×(飾り) */
function Marks() {
  return (
    <div aria-hidden className="flex gap-4">
      <svg viewBox="0 0 24 24" className="size-10 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={3}>
        <circle cx="12" cy="12" r="8.5" />
      </svg>
      <svg viewBox="0 0 24 24" className="size-10 text-amber-500" fill="none" stroke="currentColor" strokeWidth={3} strokeLinejoin="round">
        <path d="M12 3.5 21 19.5H3Z" />
      </svg>
      <svg viewBox="0 0 24 24" className="size-10 text-rose-500" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
        <path d="M5 5 19 19M19 5 5 19" />
      </svg>
    </div>
  );
}
