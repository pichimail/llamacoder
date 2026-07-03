import { describe, expect, it } from "vitest";

import { resolveAuthSecret } from "../../lib/auth-secret";
import { buildOgImagePath } from "../../lib/og-shared";
import { getOgDataForChat } from "../../lib/og-utils";

describe("security hardening", () => {
  it("fails closed in production when the auth secret is missing", () => {
    expect(() =>
      resolveAuthSecret({ NODE_ENV: "production" }),
    ).toThrow("AUTH_SECRET or NEXTAUTH_SECRET is required in production");
  });

  it("keeps the dev fallback only outside production", () => {
    expect(resolveAuthSecret({ NODE_ENV: "development" })).toBe(
      "chinna-coder-fallback-secret-change-me",
    );
  });

  it("does not include an arbitrary image URL in OG image paths", () => {
    expect(
      buildOgImagePath({ prompt: "Hello", messageId: "msg_123" }),
    ).toBe("/api/og?prompt=Hello&messageId=msg_123");
  });

  it("derives OG metadata without passing a direct image param", () => {
    const og = getOgDataForChat({
      id: "chat_123",
      title: "Demo",
      prompt: "Build a demo",
      messages: [
        {
          role: "assistant",
          content: "done",
          previewImageUrl: "https://example.com/preview.png",
        },
      ],
    });

    expect(og.ogImageUrl).not.toContain("image=");
    expect(og.messageId).toBeUndefined();
  });
});
