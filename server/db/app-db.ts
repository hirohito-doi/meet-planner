import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import type { Db } from "./index";
import * as schema from "./schema";

/**
 * アプリが使う DB(Cloudflare D1)。接続はリクエストごとに Cloudflare から渡される。
 * マイグレーションはここでは当てず、デプロイの前に wrangler d1 migrations apply で当てる。
 * ./index は型だけを読む(libsql を Worker に入れないため)
 */
export async function getDb(): Promise<Db> {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { schema });
}
