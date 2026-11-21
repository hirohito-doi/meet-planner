# Vercel を使わず、Node サーバー + SQLite(Drizzle 経由)で動かす

Vercel は使わない方針のため、Next.js は Node サーバーとして動かし、Docker で動く構成にする。デプロイ先は未定なので、設定不要で始められる SQLite を DB にする。DB へのアクセスは Drizzle ORM を通し、後で Postgres や Cloudflare D1 に移るときの書き換えを減らす。

## Consequences

- SQLite はファイルなので、ディスクが永続化される環境が必要になる。サーバーレス環境(Vercel など)にはそのまま載せられない。
- SQLite への接続には `@libsql/client` を使う。最初は better-sqlite3 を試したが、ネイティブモジュールのビルドに Windows SDK などの開発ツールが必要で、開発環境を用意する手間が増えるため見送った。libsql はビルド済みのバイナリが配布されていて、Drizzle も対応している。API は非同期になる。
- バックエンドのロジックは Next.js に依存しない `server/` に置き、Server Actions はそれを呼ぶだけの入口にする。デプロイ先や構成を変えても、ロジックはそのまま使える。
