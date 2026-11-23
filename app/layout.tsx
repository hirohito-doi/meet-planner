import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // プレビュー画像の URL を組み立てるためのサイトの URL。公開するときに SITE_URL を設定する
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: "meet-planner", template: "%s | meet-planner" },
  description: "複数人の都合を集めて、会議の日時を決める日程調整アプリ",
  // 回答用リンクと管理用リンクは、知っている人だけが開ける秘密の URL(ADR 0001)。
  // 検索エンジンに載せず、ほかのサイトへ移るときにも URL を送らない

  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
