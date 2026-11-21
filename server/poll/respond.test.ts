import { describe, expect, test } from "vitest";
import { createPoll, readPoll, respond } from "./index";
import { createTestDb } from "./test-db";

const at = (iso: string) => new Date(iso).getTime();

/** 候補が2件(12/3 と 12/4 の 19:00-21:00)ある日程調整を作る */
async function setup() {
  const db = await createTestDb();
  const { pollId } = await createPoll(db, {
    title: "忘年会",
    description: "",
    slots: [
      { start: at("2026-12-03T19:00:00+09:00"), end: at("2026-12-03T21:00:00+09:00") },
      { start: at("2026-12-04T19:00:00+09:00"), end: at("2026-12-04T21:00:00+09:00") },
    ],
  });
  const poll = await readPoll(db, pollId);
  const [dec3, dec4] = poll!.slots.map((s) => s.id);
  return { db, pollId, dec3, dec4 };
}

describe("回答", () => {
  test("回答すると、回答画面に名前・可否・コメントが表示される", async () => {
    const { db, pollId, dec3, dec4 } = await setup();

    await respond(db, pollId, {
      name: "田中",
      availabilities: { [dec3]: "yes", [dec4]: "no" },
      comment: "20時以降なら参加できます",
    });

    expect((await readPoll(db, pollId))?.responses).toMatchObject([
      {
        name: "田中",
        availabilities: { [dec3]: "yes", [dec4]: "no" },
        comment: "20時以降なら参加できます",
      },
    ]);
  });

  test("存在しない日程調整には回答できない", async () => {
    const db = await createTestDb();

    await expect(
      respond(db, "no-such-poll", { name: "田中", availabilities: {}, comment: "" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("回答の入力値の検証", () => {
  test.each([
    ["名前が空", { name: "" }],
    ["名前が空白だけ", { name: "　 " }],
    ["名前が31文字", { name: "あ".repeat(31) }],
    ["コメントが201文字", { comment: "あ".repeat(201) }],
  ])("%sなら回答できない", async (_, override) => {
    const { db, pollId } = await setup();

    await expect(
      respond(db, pollId, { name: "田中", availabilities: {}, comment: "", ...override }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  test("名前とコメントは前後の空白を取り除いて保存し、取り除いた後の上限の文字数までは回答できる", async () => {
    const { db, pollId } = await setup();
    const name = "あ".repeat(30);
    const comment = "い".repeat(200);

    await respond(db, pollId, { name: ` ${name} `, availabilities: {}, comment: `\n${comment}\n` });

    expect((await readPoll(db, pollId))?.responses).toMatchObject([{ name, comment }]);
  });

  test("この日程調整にない候補への可否は受け付けない", async () => {
    const { db, pollId, dec3 } = await setup();

    await expect(
      respond(db, pollId, {
        name: "田中",
        availabilities: { [dec3]: "yes", "other-poll-slot": "yes" },
        comment: "",
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  test("可否が ○△× (yes / maybe / no) 以外なら受け付けない", async () => {
    const { db, pollId, dec3 } = await setup();

    await expect(
      respond(db, pollId, {
        name: "田中",
        availabilities: { [dec3]: "absolutely" as never },
        comment: "",
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});
