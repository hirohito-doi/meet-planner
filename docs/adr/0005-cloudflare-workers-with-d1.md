# Cloudflare Workers + D1 で公開し、Cache Components は使わない

デプロイ先を Cloudflare Workers に決めた。Next.js のアプリは OpenNext(`@opennextjs/cloudflare`)で Workers 用に変換し、DB は Cloudflare D1 を使う。D1 は SQLite なので、Drizzle のスキーマとマイグレーションはそのまま使える。ADR 0002 の「Node サーバー + SQLite」は、Node で動かすとき(開発、Windows の E2E、単体テスト)の構成として残す。

試作(spike/cloudflare ブランチ、docs/process-log.md の 24)では、Cache Components を有効にしたままだと、静的なトップページも含めてすべてのページが Workers の上で止まった。Next.js は「Workers の setTimeout の実装では Cache Components の動作を保証できない」と警告し、OpenNext もまだ対応していない([PR #1318](https://github.com/opennextjs/opennextjs-cloudflare/pull/1318))。このアプリが Cache Components に頼っていたのは、回答画面と管理画面の `<Suspense>` だけだったので、切ることにした。切ると全画面が動き、E2E も Workers の上ですべて通った。

## Consequences

- `cacheComponents` を切ったので、回答画面と管理画面は要求のたびにページ全体を描く。外側を先に返し、中身を後から流す仕組みはなくなる。OpenNext が対応したら、戻すかどうかを考え直す。`partialPrefetching` の設定も、Cache Components とあわせて使うものなので外した。
- DB の入口(`server/db/app-db.ts` の `getDb`)は、Workers の中では D1、Node では libsql を開く。`server/poll` が受け取る `Db` の型は、両方が満たすことを型の上で確かめている。どちらも SQLite なので、SQL の違いはない。
- D1 のマイグレーションは、アプリが起動時に当てるのではなく、`wrangler d1 migrations apply` で先に当てる(`pnpm cf:preview`、`pnpm cf:deploy` に入れてある)。libsql は今までどおり、初めて開いたときに当てる。
- OpenNext のビルドは Windows ではできない(シンボリックリンクを作れない)。Workers 向けのビルドと、Workers の上での E2E は、Linux(GitHub Actions、または WSL)で行う。Windows の手元では、今までどおり Node で開発し、E2E も Node で流す。
- 公開するのは Cloudflare のアカウントを持つ人が手で行う(`pnpm cf:deploy`)。CI は確認だけで、Cloudflare には触らない。API トークンを GitHub に置かずに済む。
- 秘密の値は wrangler.jsonc に書かない(リポジトリは公開)。管理用リンクはパスにトークンを含むので、Workers のログに残る。ログを見られる人を絞る。POST の回数制限(Cloudflare の Rate Limiting)は、公開後の様子を見て足す。
