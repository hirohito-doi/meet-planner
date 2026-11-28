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
| `pnpm test:e2e` | E2E テスト(Playwright。開発サーバーは自動で起動する) |
| `pnpm typecheck` | 型チェック |
| `pnpm lint` | ESLint |
| `pnpm build` | 本番ビルド |
| `pnpm seed:demo` | 動作確認用の日程調整(回答者5人)を作り、回答用リンクと管理用リンクを表示する。1つのブラウザでは1人分しか回答できないため、集計や確定を手早く確かめるのに使う |
