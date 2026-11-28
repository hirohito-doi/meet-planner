// 回数制限の中身(docs/spec.md「回数制限」)。Workers の binding や要求の見出しには触らないので、単体テストできる。
// Server Action からは rate-limit-context.ts の rateLimit を使う
import type { ActionResult } from "./action-result";

/** Cloudflare Workers の Rate Limiting の binding と同じ形 */
export type RateLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> };

const MESSAGE = "しばらく待ってから、もう一度お試しください。";

/**
 * 接続元の IP アドレスごとに回数を数え、超えていたら操作を実行せずに RATE_LIMITED を返す。
 * limiter がない(Node で動かしている)ときは制限しない
 */
export async function applyRateLimit<T>(
  limiter: RateLimiter | undefined,
  ip: string,
  run: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  if (limiter) {
    const { success } = await limiter.limit({ key: ip });
    if (!success) return { ok: false, code: "RATE_LIMITED", message: MESSAGE };
  }
  return run();
}
