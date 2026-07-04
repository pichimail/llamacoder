import { describe, expect, it } from "vitest";

import { repairMissingLocalComponentFiles } from "../../lib/artifact-auto-repair";
import { validateGeneratedCodeFiles } from "../../lib/generated-code-validation";

const VALIDATION_TIMEOUT_MS = 15_000;

describe("artifact auto repair", () => {
  it("adds missing local component files before validation", async () => {
    const repaired = repairMissingLocalComponentFiles([
      {
        path: "app/page.tsx",
        code: `"use client";

import EnergyPaths from "@/components/EnergyPaths";
import ValuesSection from "@/components/ValuesSection";
import ContactSection from "@/components/ContactSection";

export default function Page() {
  return (
    <main>
      <EnergyPaths />
      <ValuesSection />
      <ContactSection />
    </main>
  );
}`,
      },
    ]);

    expect(repaired.map((file) => file.path)).toEqual([
      "app/page.tsx",
      "components/EnergyPaths.tsx",
      "components/ValuesSection.tsx",
      "components/ContactSection.tsx",
    ]);

    const issues = await validateGeneratedCodeFiles(
      repaired.map((file) => ({
        path: file.path,
        content: file.code || file.content || "",
      })),
    );

    expect(issues).toHaveLength(0);
  }, VALIDATION_TIMEOUT_MS);
});
