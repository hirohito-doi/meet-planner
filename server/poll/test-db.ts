import { createDb, migrateDb } from "@/server/db";

/** テスト用: 本番と同じマイグレーションを当てた、メモリ上の SQLite (ADR 0004) */
export async function createTestDb() {
  const db = createDb(":memory:");
  await migrateDb(db);
  return db;
}
