import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const prompt = (searchParams.get("prompt") || "HyperSpeed generated app").slice(0, 120);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#050505",
          color: "#f7f7f7",
          padding: 64,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid #3a3a3a", display: "flex", alignItems: "center", justifyContent: "center" }}>HS</div>
          <div style={{ letterSpacing: -1 }}>HyperSpeed</div>
        </div>
        <div style={{ maxWidth: 900, fontSize: 76, lineHeight: 1, letterSpacing: -4, fontWeight: 700 }}>{prompt}</div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#a3a3a3", fontSize: 24 }}>
          <span>Generated app preview</span>
          <span>Build. Refine. Share.</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
