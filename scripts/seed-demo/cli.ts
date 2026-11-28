// pnpm seed:demo — 動作確認用の日程調整を作り、回答用リンクと管理用リンクを表示する。
// DB はアプリと同じ(DATABASE_URL、なければ data/app.sqlite)。リンクの先頭は BASE_URL(なければ http://localhost:3000)
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createDb, migrateDb } from "@/server/db";
import { seedDemo } from "./seed";

const url = process.env.DATABASE_URL ?? "file:data/app.sqlite";
const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function main() {
  if (url.startsWith("file:")) mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
  const db = createDb(url);
  await migrateDb(db);
  const { pollId, adminToken } = await seedDemo(db, { now: Date.now() });

  console.log("動作確認用の日程調整を作りました(回答者5人)。");
  console.log(`回答用リンク: ${base}/p/${pollId}`);
  console.log(`管理用リンク: ${base}/p/${pollId}/admin/${adminToken}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
