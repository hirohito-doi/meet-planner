// リンクを LINE や Slack などに貼ったときのプレビュー画像。すべてのページで使う。
// 日本語の書体を同梱しないため、画像には英字と ○△× の図形だけを描く(タイトルはプレビューの文字で出る)
import { ImageResponse } from "next/og";

export const alt = "meet-planner";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MARKS = [
  { color: "#059669", shape: <circle cx="40" cy="40" r="28" fill="none" stroke="#059669" strokeWidth="10" /> },
  { color: "#f59e0b", shape: <path d="M40 10 72 66H8Z" fill="none" stroke="#f59e0b" strokeWidth="10" strokeLinejoin="round" /> },
  { color: "#f43f5e", shape: <path d="M14 14 66 66M66 14 14 66" stroke="#f43f5e" strokeWidth="10" strokeLinecap="round" /> },
];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 56,
          background: "#fffbf6",
          borderTop: "24px solid #f4a261",
        }}
      >
        <div style={{ display: "flex", gap: 48 }}>
          {MARKS.map((m) => (
            <svg key={m.color} width="120" height="120" viewBox="0 0 80 80">
              {m.shape}
            </svg>
          ))}
        </div>
        <div style={{ fontSize: 88, fontWeight: 700, color: "#6b3410" }}>meet-planner</div>
      </div>
    ),
    size,
  );
}
