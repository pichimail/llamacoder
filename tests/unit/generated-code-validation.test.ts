import { describe, expect, it } from "vitest";

import { validateGeneratedCodeFiles } from "../../lib/generated-code-validation";

describe("generated code validation", () => {
  it("rejects ellipsis-only placeholder files", async () => {
    const issues = await validateGeneratedCodeFiles([
      { path: "app/page.tsx", code: "...code..." },
    ]);

    expect(issues[0]?.message).toMatch(/placeholder/i);
  });

  it("allows a small real React page", async () => {
    const issues = await validateGeneratedCodeFiles([
      {
        path: "app/page.tsx",
        code: 'export default function Page() { return <main>Hello</main>; }',
      },
    ]);

    expect(issues).toHaveLength(0);
  });
});
