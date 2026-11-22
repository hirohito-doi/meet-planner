import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** 日程調整 (Poll) */
export const polls = sqliteTable("polls", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  /** 管理トークンの SHA-256。トークンそのものは保存しない (ADR 0001) */
  adminTokenHash: text("admin_token_hash").notNull().unique(),
  /** 確定した候補の ID。null なら確定していない */
  finalizedSlotId: text("finalized_slot_id"),
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

/** 回答 (Response): 1人の回答者の名前と、各候補への可否 */
export const responses = sqliteTable(
  "responses",
  {
    id: text("id").primaryKey(),
    pollId: text("poll_id").notNull(),
    name: text("name").notNull(),
    /** 編集用トークンの SHA-256 (ADR 0001) */
    editTokenHash: text("edit_token_hash").notNull().unique(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("responses_poll_id_idx").on(t.pollId)],
);

/** 可否 (Availability): 1つの候補に対する回答者の都合。行がなければ未回答 */
export const availabilities = sqliteTable(
  "availabilities",
  {
    responseId: text("response_id").notNull(),
    slotId: text("slot_id").notNull(),
    value: text("value", { enum: ["yes", "maybe", "no"] }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.responseId, t.slotId] }), index("availabilities_slot_id_idx").on(t.slotId)],
);
