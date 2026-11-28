# meet-planner

「○△× 日程調整」のソースコード。複数人の都合を ○△× で集めて、会議や集まりの日時を1つに決める日程調整アプリ。

- 仕様: [docs/spec.md](docs/spec.md)
- 用語集: [GLOSSARY.md](GLOSSARY.md)
- 設計判断の記録: [docs/adr/](docs/adr/)

## 開発

Node 24 と pnpm 10 を使う。

```bash
pnpm install
pnpm exec playwright install chromium   # E2E テストを初めて動かす前に1回だけ
pnpm dev                                # http://localhost:3000
```

| コマンド | 内容 |
|---|---|
| `pnpm test` | 単体テスト(Vitest) |
| `pnpm test:watch` | 単体テストを監視モードで実行 |
| `pnpm test:e2e` | E2E テスト(Playwright。本番ビルドを Node で起動して確かめる。サーバーは自動で起動する) |
| `pnpm typecheck` | 型チェック |
| `pnpm lint` | ESLint |
| `pnpm build` | 本番ビルド |
| `pnpm seed:demo` | 動作確認用の日程調整(回答者5人)を作り、回答用リンクと管理用リンクを表示する。1つのブラウザでは1人分しか回答できないため、集計や確定を手早く確かめるのに使う |

手元(Node)では、DB は `data/app.sqlite`(E2E は `data/e2e.sqlite`)を使う。本番の Cloudflare D1 との違いは [ADR 0005](docs/adr/0005-cloudflare-workers-with-d1.md) を参照。

## Cloudflare Workers

本番は Cloudflare Workers + D1 で動かす。Workers 向けのビルド(OpenNext)は Windows ではできないので、以下は Linux か WSL で行う。GitHub Actions は push のたびに、Workers 向けにビルドして E2E を流す(Cloudflare への公開はしない)。

| コマンド | 内容 |
|---|---|
| `pnpm cf:build` | Workers 向けにビルドする(`.open-next/` に出力) |
| `pnpm cf:preview` | 手元の D1 にマイグレーションを当て、ビルドしたものを Workers のランタイムで起動する(http://localhost:8787) |
| `E2E_TARGET=workers pnpm test:e2e` | Workers 向けにビルドし、`cf:preview` のサーバーに E2E を流す |
| `pnpm cf:deploy` | ビルドし、本番の D1 にマイグレーションを当て、公開する |
| `pnpm cf:typegen` | wrangler.jsonc から `cloudflare-env.d.ts`(D1 などの型)を作り直す |

### 初めて公開するとき

1. `pnpm exec wrangler login` で Cloudflare のアカウントにログインする。
2. `pnpm exec wrangler d1 create meet-planner` で本番の D1 を作り、表示された `database_id` を wrangler.jsonc に書く。
3. wrangler.jsonc の `SITE_URL` を公開先の URL(例: `https://meet-planner.<アカウント>.workers.dev`)に替える。
4. `pnpm cf:deploy` を実行する。

秘密の値は wrangler.jsonc に書かず、`wrangler secret put` で入れる(リポジトリは公開)。
