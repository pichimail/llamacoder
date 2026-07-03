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

  it("rejects unresolved local alias imports before preview", async () => {
    const issues = await validateGeneratedCodeFiles([
      {
        path: "app/page.tsx",
        code: 'import { useAuth } from "@/lib/auth-context"; export default function Page() { return <main />; }',
      },
    ]);

    expect(issues.some((issue) => issue.message.includes("Unresolved local import"))).toBe(true);
  });

  it("allows sandbox-provided Next compatibility shims", async () => {
    const issues = await validateGeneratedCodeFiles([
      {
        path: "app/page.tsx",
        code: 'import { useRouter } from "@/lib/next-navigation"; export default function Page() { const router = useRouter(); return <button onClick={() => router.push("/signin")}>Go</button>; }',
      },
    ]);

    expect(issues).toHaveLength(0);
  });
});
