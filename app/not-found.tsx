import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader, Notice } from "./_components/ui";

export const metadata: Metadata = { title: "見つかりません" };

// 日程調整がない、削除された、管理用リンクが正しくない、のどれでもこの画面になる。
// どれなのかは区別して見せない(管理トークンが正しいかを推測させないため)
export default function NotFound() {
  return (
    <>
      <AppHeader />
      <Notice
        title="ページが見つかりません"
        action={
          <Link href="/" className="rounded-lg bg-accent px-5 py-3 font-bold text-on-accent hover:bg-accent-strong">
            新しい日程調整を作る
          </Link>
        }
      >
        <p>リンクが正しいか、日程調整が削除されていないかを確かめてください。</p>
        <p>リンクを受け取った場合は、送ってくれた人に確かめてください。</p>
      </Notice>
    </>
  );
}
