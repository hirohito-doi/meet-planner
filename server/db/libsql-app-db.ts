import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createDb, migrateDb } from "./index";

const DEFAULT_URL = "file:data/app.sqlite";

/** Node で動かすときのアプリの DB を開き、マイグレーションを当てる。app-db.ts からだけ呼ぶ */
export async function openLibsqlAppDb() {
  const url = process.env.DATABASE_URL ?? DEFAULT_URL;
  // ファイルの DB なら、置き場所のディレクトリを用意する
  if (url.startsWith("file:")) mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
  const db = createDb(url);
  await migrateDb(db);
  return db;
}
