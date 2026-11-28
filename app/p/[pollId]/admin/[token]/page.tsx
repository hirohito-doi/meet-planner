import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader, Loading } from "@/app/_components/ui";
import { getDb } from "@/server/db/app-db";
import { openAdmin, readPoll, RETENTION_DAYS } from "@/server/poll";
import { AdminPanel } from "./admin-panel";

// 管理画面のタイトルは出さない(管理用リンクが誤って共有されても、プレビューで中身が分からないように)
export const metadata: Metadata = { title: "管理画面" };

export default function Page({ params, searchParams }: PageProps<"/p/[pollId]/admin/[token]">) {
  return (
    <>
      <AppHeader label="管理画面" />
      <Suspense fallback={<Loading />}>
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
  return <AdminPanel poll={poll} token={token} created={created} retentionDays={RETENTION_DAYS} />;
}
