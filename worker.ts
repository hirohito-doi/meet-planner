// Cloudflare Workers の入口(wrangler.jsonc の main)。OpenNext の手順「Custom Worker」に沿い、
// 要求の処理(fetch)は OpenNext がビルドで作る .open-next/worker.js にそのまま渡し、
// Cron Triggers(wrangler.jsonc の triggers.crons)で動く scheduled を足す
import { openD1Db } from "./server/db/d1-db";
import { deleteExpiredPolls } from "./server/poll";
// .open-next/worker.js は pnpm cf:build で作られるので、ビルドの前はない。ビルドの後はあるので @ts-expect-error は使えない
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { default as handler } from "./.open-next/worker.js";

export default {
  fetch: handler.fetch,

  /** 1日1回、古い日程調整を自動で削除する(docs/spec.md「自動削除」) */
  async scheduled(controller, env) {
    const deleted = await deleteExpiredPolls(openD1Db(env.DB), controller.scheduledTime);
    console.log(`古い日程調整を${deleted}件削除しました`);
  },
} satisfies ExportedHandler<CloudflareEnv>;
