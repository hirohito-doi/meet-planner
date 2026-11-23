import Link from "next/link";
import { AppHeader, Marks } from "./_components/ui";

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
          <div className="flex gap-2">
            <Marks className="size-10" />
          </div>
          {/* 文節の切れ目で改行し、行の長さをそろえる(1文字だけ次の行に落ちないように) */}
          <h1 className="text-2xl font-bold leading-snug text-balance text-accent-soft-ink [word-break:auto-phrase] sm:text-4xl">リンクを送って、○△× で答えてもらうだけ</h1>
          <p className="max-w-xl text-balance text-slate-600 [word-break:auto-phrase]">
            集まった ○△× から、みんなの都合に合う日時が見つかります。
          </p>
          <CreateLink />
        </section>

        <section aria-labelledby="steps" className="mt-16">
          <h2 id="steps" className="text-center text-xl font-bold text-accent-soft-ink">
            使い方
          </h2>
          <ol className="mx-auto mt-6 flex max-w-2xl flex-col gap-6 rounded-xl border border-line bg-white p-6 sm:p-8">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-on-accent">{i + 1}</span>
                <div>
                  <h3 className="font-bold leading-8">{step.title}</h3>
                  <p className="text-sm text-slate-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="特徴" className="mt-12">
          <ul className="mx-auto flex max-w-2xl flex-col gap-5 rounded-xl bg-accent-soft p-6 sm:p-8">
            {FEATURES.map((feature) => (
              <li key={feature.title}>
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
