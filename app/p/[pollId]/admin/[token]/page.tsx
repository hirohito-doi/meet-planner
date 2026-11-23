import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/app/_components/ui";
import { getDb } from "@/server/db/app-db";
import { openAdmin, readPoll } from "@/server/poll";
import { AdminPanel } from "./admin-panel";

export default function Page({ params, searchParams }: PageProps<"/p/[pollId]/admin/[token]">) {
  return (
    <>
      <AppHeader label="管理画面" />
      <Suspense fallback={<p className="px-6 py-8 text-sm text-slate-500">読み込んでいます…</p>}>
        {Promise.all([params, searchParams]).then(([{ pollId, token }, { created }]) => (
          <Admin pollId={pollId} token={token} created={created === "1"} />
        ))}
      </Suspense>
    </>
  );
}

async function Admin({ pollId, token, created }: { pollId: string; token: string; created: boolean }) {
  const db = await getDb();
  // 管理トークンが使えなければ、日程調整があるかどうかも見せない
  if (!(await openAdmin(db, pollId, token))) notFound();
  const poll = await readPoll(db, pollId);
  if (!poll) notFound();
  return <AdminPanel poll={poll} token={token} created={created} />;
}
