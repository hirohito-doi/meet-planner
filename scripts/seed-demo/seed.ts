// 動作確認用の日程調整を作る。1つのブラウザでは1人分しか回答できないため、
// 回答者が何人もいるときの集計・順位・確定・回答者の削除を手早く確かめるのに使う
import { jstDate, jstMidnight } from "@/lib/jst";
import type { Db } from "@/server/db";
import { type Availability, createPoll, join, openResponse, readPoll } from "@/server/poll";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const NAMES = ["佐藤", "鈴木", "高橋", "田中", "伊藤"];

// 行が候補、列が回答者(NAMES の順)。null は未回答。
// スコア: 1件目 7、2件目 9(1位)、3件目 3、4件目 6、5件目 5
const ANSWERS: (Availability | null)[][] = [
  ["yes", "yes", "maybe", "yes", "no"],
  ["yes", "maybe", "yes", "yes", "yes"],
  ["no", "maybe", "yes", "no", null],
  ["maybe", "yes", "no", "yes", "maybe"],
  ["yes", "no", "yes", "maybe", null],
];

/** 1週間後から5日続けて 19:00-21:00 の候補を作り、5人分の回答を入れる */
export async function seedDemo(db: Db, { now }: { now: number }) {
  const firstDay = jstDate(now + 7 * DAY);
  const slots = ANSWERS.map((_, i) => {
    const start = jstMidnight(firstDay) + i * DAY + 19 * HOUR;
    return { start, end: start + 2 * HOUR };
  });
  const { pollId, adminToken } = await createPoll(db, {
    title: "動作確認用の日程調整",
    description: "pnpm seed:demo で作ったデータです。",
    slots,
  });

  // 候補の ID は保存後に決まるので、開始時刻で対応をとる
  const saved = (await readPoll(db, pollId))!.slots;
  const slotIdAt = (i: number) => saved.find((s) => s.start === slots[i].start)!.id;

  for (const [person, name] of NAMES.entries()) {
    const { editToken } = await join(db, pollId, { name });
    const me = (await openResponse(db, pollId, editToken))!;
    for (const [i, row] of ANSWERS.entries()) {
      const value = row[person];
      if (value) await me.setAvailability(slotIdAt(i), value);
    }
  }
  return { pollId, adminToken };
}
