import { ImageResponse } from "next/og";
import { domain } from "@/lib/domain";
import { getShareScreenshotUrl } from "@/lib/og-utils";

function truncatePrompt(text: string, max = 140) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 3).trimEnd()}...`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const prompt = truncatePrompt(
    searchParams.get("prompt") || "Built with Chinna-Coder",
    160,
  );
  const messageId = searchParams.get("messageId");

  const screenshotUrl = messageId ? getShareScreenshotUrl(messageId) : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0a0a0a 0%, #171717 45%, #0f172a 100%)",
          color: "#fafafa",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: screenshotUrl ? "46%" : "100%",
            padding: "56px 52px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              C
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
                Chinna-Coder
              </span>
              <span style={{ fontSize: 14, color: "#a3a3a3" }}>
                AI app generation
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#34d399",
              }}
            >
              Prompt
            </span>
            <div
              style={{
                display: "flex",
                fontSize: screenshotUrl ? 34 : 42,
                fontWeight: 600,
                lineHeight: 1.2,
                letterSpacing: -0.8,
                color: "#f5f5f5",
              }}
            >
              {prompt}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15, color: "#737373" }}>{domain}</span>
          </div>
        </div>

        {screenshotUrl ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "54%",
              padding: "40px 48px 40px 0",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                height: "100%",
                borderRadius: 20,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
                background: "#111827",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  height: 36,
                  padding: "0 14px",
                  background: "rgba(255,255,255,0.04)",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: 999, background: "#ef4444" }} />
                <div style={{ width: 10, height: 10, borderRadius: 999, background: "#f59e0b" }} />
                <div style={{ width: 10, height: 10, borderRadius: 999, background: "#22c55e" }} />
                <span style={{ marginLeft: 8, fontSize: 12, color: "#a3a3a3" }}>
                  Live preview
                </span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshotUrl}
                alt=""
                width={620}
                height={500}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "top center",
                  background: "#0f172a",
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
