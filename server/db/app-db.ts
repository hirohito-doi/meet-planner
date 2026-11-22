import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createDb, type Db, migrateDb } from "./index";

const DEFAULT_URL = "file:data/app.sqlite";

let ready: Promise<Db> | undefined;

/** アプリが使う DB。初めて呼ばれたときにマイグレーションを当てる(プロセスにつき1回) */
export function getDb(): Promise<Db> {
  ready ??= (async () => {
    const url = process.env.DATABASE_URL ?? DEFAULT_URL;
    // ファイルの DB なら、置き場所のディレクトリを用意する
    if (url.startsWith("file:")) mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
    const db = createDb(url);
    await migrateDb(db);
    return db;
  })();
  return ready;
}
