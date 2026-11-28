import { createClient } from "@libsql/client";
import type { BatchItem, BatchResponse } from "drizzle-orm/batch";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import * as schema from "./schema";

/**
 * アプリが使う DB。本番(Cloudflare Workers)は D1、単体テストと pnpm seed:demo は libsql。
 * server/poll はこの型だけを見るので、どちらを渡しても同じように動く
 */
export type Db = BaseSQLiteDatabase<"async", unknown, typeof schema> & {
  batch<U extends BatchItem<"sqlite">, T extends Readonly<[U, ...U[]]>>(batch: T): Promise<BatchResponse<T>>;
};

// 両方の DB がこの型を満たすことを、型の上で確かめる
type Assert<T extends Db> = T;
export type _LibSQLIsDb = Assert<LibSQLDatabase<typeof schema>>;
export type _D1IsDb = Assert<DrizzleD1Database<typeof schema>>;

/**
 * url の例: "file:data/app.sqlite"、テストでは ":memory:"。
 * 外部キーの制約は有効にしない(libsql は接続を作り直すことがあり、PRAGMA が引き継がれる保証がないため)。
 * 関連するデータの削除は server/poll/store.ts に明示的に書く。
 */
export function createDb(url: string) {
  return drizzle({ client: createClient({ url }), schema });
}

/** libsql の DB にマイグレーションを当てる(単体テストと pnpm seed:demo 用。D1 には wrangler d1 migrations apply で当てる) */
export async function migrateDb(db: LibSQLDatabase<typeof schema>) {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "server/db/migrations") });
}
