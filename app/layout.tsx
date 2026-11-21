import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "meet-planner",
  description: "複数人の都合を集めて、会議の日時を決める日程調整アプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
