import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getDb } from "@/server/db/app-db";
import { readPoll } from "@/server/poll";
import { ResponseTable } from "./response-table";

export default function Page({ params }: PageProps<"/p/[pollId]">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">読み込んでいます…</p>}>
        {params.then(({ pollId }) => (
          <Poll pollId={pollId} />
        ))}
      </Suspense>
    </main>
  );
}

async function Poll({ pollId }: { pollId: string }) {
  const poll = await readPoll(await getDb(), pollId);
  if (!poll) notFound();
  return <ResponseTable poll={poll} />;
}
