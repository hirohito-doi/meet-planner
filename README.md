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

本番は Cloudflare Workers + D1 で動かす。main に push すると、Cloudflare 側(Workers Builds)でビルドして公開する。手元でビルドする必要はない。GitHub Actions は push と pull request のたびに、Workers 向けにビルドして E2E を流す(公開はしない)。

Workers 向けのビルド(OpenNext)は Windows ではできないので、次のコマンドを手元で使うときは Linux か WSL で実行する。

| コマンド | 内容 |
|---|---|
| `pnpm cf:build` | Workers 向けにビルドする(`.open-next/` に出力) |
| `pnpm cf:preview` | 手元の D1 にマイグレーションを当て、ビルドしたものを Workers のランタイムで起動する(http://localhost:8787) |
| `E2E_TARGET=workers pnpm test:e2e` | Workers 向けにビルドし、`cf:preview` のサーバーに E2E を流す |
| `pnpm cf:deploy` | 本番の D1 にマイグレーションを当て、ビルドしたものを公開する(Workers Builds が実行する) |
| `pnpm cf:typegen` | wrangler.jsonc から `cloudflare-env.d.ts`(D1 などの型)を作り直す |

### 初めて公開するとき

Cloudflare の管理画面(ブラウザ)だけで進められる。

1. D1 のデータベースを `meet-planner` という名前で作り、`database_id` を wrangler.jsonc に書く。
2. `.env.production` の `SITE_URL` を公開先の URL(`https://meet-planner.<アカウントの workers.dev サブドメイン>.workers.dev`)に替える(トップと作成画面はビルドのときに作るので、Workers の vars ではなくこのファイルに書く)。サブドメインは Workers & Pages の画面で確かめられる。
3. 1 と 2 を main に入れて GitHub に送る。
4. Workers & Pages で「Create application」から GitHub のリポジトリをつなぎ、Worker を作る。Worker の名前は wrangler.jsonc の `name`(`meet-planner`)と同じにする(違うとビルドが失敗する)。GitHub 側では「Cloudflare Workers & Pages」の GitHub App を入れて、このリポジトリを許可する。
5. Worker の Settings > Build で次のように設定する。
   - Build command: `pnpm cf:build`
   - Deploy command: `pnpm cf:deploy`
   - Branch control: 本番のブランチは `main`。「Enable Preview Builds」はオフにする(プレビュー版は本番の D1 を引き継がず、別の DB の用意が要るため)
6. main に push する(または管理画面からビルドをやり直す)と、ビルドと公開が走る。

Node は `.node-version`、pnpm は package.json の `packageManager` の版が使われる。秘密の値は wrangler.jsonc に書かず、Worker の Settings > Variables & Secrets で入れる(リポジトリは公開)。
