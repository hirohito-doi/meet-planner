import type { Metadata } from "next";
import "./globals.css";
import { SITE_NAME } from "./_lib/site";

export const metadata: Metadata = {
  // プレビュー画像の URL を組み立てるためのサイトの URL。本番の値は .env.production(ビルドのときにも読まれる)
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: "みんなの都合を ○△× で集めて、日時を1つに決める日程調整サービス",
  // プレビュー画像には名前を描かないので、プレビューの文字にサービス名を出す
  openGraph: { siteName: SITE_NAME },
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
