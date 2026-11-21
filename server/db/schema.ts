import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** 日程調整 (Poll) */
export const polls = sqliteTable("polls", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  /** 管理トークンの SHA-256。トークンそのものは保存しない (ADR 0001) */
  adminTokenHash: text("admin_token_hash").notNull().unique(),
  createdAt: integer("created_at").notNull(),
});

/** 候補 (Slot)。日時は UTC のミリ秒 */
export const slots = sqliteTable(
  "slots",
  {
    id: text("id").primaryKey(),
    pollId: text("poll_id").notNull(),
    startAt: integer("start_at").notNull(),
    endAt: integer("end_at").notNull(),
  },
  (t) => [index("slots_poll_id_idx").on(t.pollId)],
);
