/* eslint-disable @next/next/no-img-element */
import { getPrisma } from "@/lib/prisma";
import { getShareScreenshotUrl } from "@/lib/og-utils";
import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: { messageId: string };
}) {
  let messageId = params.messageId;
  const prisma = getPrisma();
  let message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
    include: {
      chat: true,
    },
  });

  const title = message ? message.chat.title : "An app generated on Chinna-Coder";
  const prompt = message?.chat.prompt || title;
  const screenshotUrl = message?.previewImageUrl || getShareScreenshotUrl(messageId);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #050505 0%, #111827 48%, #0f766e 100%)",
          color: "#f8fafc",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "45%",
            padding: "56px 48px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#34d399" }}>
              Chinna-Coder generation
            </div>
            <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.4 }}>
              {title}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#99f6e4", letterSpacing: "0.16em", textTransform: "uppercase" }}>
              Prompt
            </div>
            <div style={{ fontSize: 25, lineHeight: 1.25, color: "#e5e7eb" }}>
              {prompt.slice(0, 180)}
              {prompt.length > 180 ? "..." : ""}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "55%", padding: "46px 52px 46px 0" }}>
          <div style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden", borderRadius: 28, border: "1px solid rgba(255,255,255,0.16)", boxShadow: "0 26px 80px rgba(0,0,0,0.48)", background: "#020617" }}>
            <img src={screenshotUrl} alt="" width={660} height={530} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
