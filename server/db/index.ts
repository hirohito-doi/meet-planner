import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

/**
 * url の例: "file:data/app.sqlite"、テストでは ":memory:"。
 * 外部キーの制約は有効にしない(libsql は接続を作り直すことがあり、PRAGMA が引き継がれる保証がないため)。
 * 関連するデータの削除は server/poll/store.ts に明示的に書く。
 */
export function createDb(url: string) {
  return drizzle({ client: createClient({ url }), schema });
}

export async function migrateDb(db: Db) {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "server/db/migrations") });
}
