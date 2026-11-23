import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/app/_components/ui";
import { getDb } from "@/server/db/app-db";
import { readPoll } from "@/server/poll";
import { ResponseTable } from "./response-table";

export default function Page({ params }: PageProps<"/p/[pollId]">) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <Suspense fallback={<p className="text-sm text-slate-500">読み込んでいます…</p>}>
          {params.then(({ pollId }) => (
            <Poll pollId={pollId} />
          ))}
        </Suspense>
      </main>
    </>
  );
}

async function Poll({ pollId }: { pollId: string }) {
  const poll = await readPoll(await getDb(), pollId);
  if (!poll) notFound();
  // スコアは管理画面だけで使う。回答者のブラウザには送らない(docs/spec.md「回答画面」)
  const { ranking, ...view } = poll;
  return <ResponseTable poll={view} />;
}
