import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "PostFlow — social media scheduler with AI";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center",
          padding: 80, color: "white", background: "linear-gradient(135deg, #5b5bf0, #8b5cf6 55%, #ec4899)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 800, opacity: 0.9 }}>PostFlow</div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, marginTop: 24 }}>Post everywhere.</div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>Plan it in minutes.</div>
        <div style={{ fontSize: 30, marginTop: 30, opacity: 0.9 }}>Calendar · Scheduler · AI rewrite · WordPress & RSS auto-posting</div>
      </div>
    ),
    size,
  );
}
