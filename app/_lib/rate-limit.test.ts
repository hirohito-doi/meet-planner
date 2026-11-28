import { describe, expect, it, vi } from "vitest";
import { applyRateLimit, type RateLimiter } from "./rate-limit";

/** 決まった回数まで通し、それを超えると止める偽物の制限。数えたキーを記録する */
function fakeLimiter(allowed: number) {
  const counts = new Map<string, number>();
  const limiter: RateLimiter = {
    async limit({ key }) {
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      return { success: n <= allowed };
    },
  };
  return { limiter, counts };
}

const ok = { ok: true as const, value: "done" };

describe("applyRateLimit", () => {
  it("回数の内なら、操作を実行してその結果を返す", async () => {
    const { limiter } = fakeLimiter(1);
    const run = vi.fn(async () => ok);
    await expect(applyRateLimit(limiter, "203.0.113.1", run)).resolves.toEqual(ok);
    expect(run).toHaveBeenCalledOnce();
  });

  it("回数を超えたら、操作(DB に触る処理)を実行せず、待つように案内する", async () => {
    const { limiter } = fakeLimiter(1);
    const run = vi.fn(async () => ok);
    await applyRateLimit(limiter, "203.0.113.1", run);
    const result = await applyRateLimit(limiter, "203.0.113.1", run);
    expect(result).toEqual({ ok: false, code: "RATE_LIMITED", message: "しばらく待ってから、もう一度お試しください。" });
    expect(run).toHaveBeenCalledOnce();
  });

  it("回数は接続元の IP アドレスごとに数える", async () => {
    const { limiter } = fakeLimiter(1);
    const run = vi.fn(async () => ok);
    await applyRateLimit(limiter, "203.0.113.1", run);
    await expect(applyRateLimit(limiter, "203.0.113.2", run)).resolves.toEqual(ok);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("制限の仕組みがない(Node で動かしている)ときは、制限しない", async () => {
    const run = vi.fn(async () => ok);
    for (let i = 0; i < 10; i++) await applyRateLimit(undefined, "203.0.113.1", run);
    expect(run).toHaveBeenCalledTimes(10);
  });
});
