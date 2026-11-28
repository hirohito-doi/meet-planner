import "server-only";
import { headers } from "next/headers";
import type { ActionResult } from "./action-result";
import { applyRateLimit } from "./rate-limit";
import { isWorkers } from "@/server/runtime";

const LIMITERS = { createPoll: "CREATE_POLL_LIMITER", join: "JOIN_LIMITER" } as const;

/**
 * Server Action の入口で回数制限を確かめてから run を実行する(docs/spec.md「回数制限」)。
 * Workers の中では wrangler.jsonc の ratelimits と接続元の IP アドレス(CF-Connecting-IP)で数える。
 * Node で動かすとき(pnpm dev、Windows の E2E)と、E2E 用のプレビュー(RATE_LIMIT=off)では制限しない
 */
export async function rateLimit<T>(kind: keyof typeof LIMITERS, run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  if (!isWorkers()) return run();
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  // 型は wrangler.jsonc の値("on")になるが、--var で "off" に替えられる
  const limiter = String(env.RATE_LIMIT) === "off" ? undefined : env[LIMITERS[kind]];
  const ip = (await headers()).get("cf-connecting-ip") ?? "unknown";
  return applyRateLimit(limiter, ip, run);
}
