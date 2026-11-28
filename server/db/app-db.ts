import "server-only";
import { isWorkers } from "../runtime";
import type { Db } from "./index";

/**
 * アプリが使う DB(ADR 0005)。
 * - Cloudflare Workers の中(本番、wrangler dev)では、wrangler.jsonc の D1(binding: DB)を使う。
 *   マイグレーションは wrangler d1 migrations apply で先に当てておく。
 * - Node で動かすとき(pnpm dev、pnpm start、Windows の E2E)は libsql(DATABASE_URL、なければ data/app.sqlite)。
 *   初めて呼ばれたときにマイグレーションを当てる(プロセスにつき1回)。
 */
export function getDb(): Promise<Db> {
  return isWorkers() ? openD1() : openLibsql();
}

async function openD1(): Promise<Db> {
  const [{ getCloudflareContext }, { drizzle }, schema] = await Promise.all([
    import("@opennextjs/cloudflare"),
    import("drizzle-orm/d1"),
    import("./schema"),
  ]);
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { schema });
}

let libsql: Promise<Db> | undefined;

function openLibsql(): Promise<Db> {
  libsql ??= import("./libsql-app-db").then((m) => m.openLibsqlAppDb());
  return libsql;
}
