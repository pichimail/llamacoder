import { describe, expect, it } from "vitest";

import { buildShareToken } from "../../lib/share-links";

describe("share links", () => {
  it("derives a stable token from chat and message ids", () => {
    expect(buildShareToken("chat_123", "message_456")).toBe("chat_123-message_456");
  });

  it("strips unsafe characters from the token", () => {
    expect(buildShareToken("chat/123", "message?456")).toBe("chat123-message456");
  });
});
