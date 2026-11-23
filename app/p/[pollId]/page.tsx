import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { AppHeader, Loading } from "@/app/_components/ui";
import { getDb } from "@/server/db/app-db";
import { readPoll } from "@/server/poll";
import { ResponseTable } from "./response-table";

/** 1回のリクエストの中で、メタデータとページが同じ読み取りを使う */
const getPoll = cache(async (pollId: string) => readPoll(await getDb(), pollId));

/** リンクのプレビューには日程調整のタイトルを出す(リンクを受け取った人だけが見る) */
export async function generateMetadata(
  { params }: PageProps<"/p/[pollId]">,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const poll = await getPoll((await params).pollId);
  if (!poll) return { title: "見つかりません" };
  const description = "候補の日時に ○ △ × で回答してください。";
  // openGraph を指定すると親の指定(プレビュー画像)がまるごと置き換わるので、引き継いでから上書きする
  const inherited = (await parent).openGraph ?? {};
  return { title: poll.title, description, openGraph: { ...inherited, title: poll.title, description } };
}

export default function Page({ params }: PageProps<"/p/[pollId]">) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <Suspense fallback={<Loading />}>
          {params.then(({ pollId }) => (
            <Poll pollId={pollId} />
          ))}
        </Suspense>
      </main>
    </>
  );
}

async function Poll({ pollId }: { pollId: string }) {
  const poll = await getPoll(pollId);
  if (!poll) notFound();
  // スコアは管理画面だけで使う。回答者のブラウザには送らない(docs/spec.md「回答画面」)
  const { ranking, ...view } = poll;
  return <ResponseTable poll={view} />;
}
