import { drizzle } from "drizzle-orm/d1";
import type { Db } from "./index";
import * as schema from "./schema";

/**
 * D1 の binding から、アプリが使う DB を作る(ADR 0005)。
 * 要求を処理するとき(app-db.ts)と、Cron Triggers で動くとき(worker.ts)の両方で使う。
 * worker.ts からも読むので、server-only は付けない
 */
export function openD1Db(d1: D1Database): Db {
  return drizzle(d1, { schema });
}
