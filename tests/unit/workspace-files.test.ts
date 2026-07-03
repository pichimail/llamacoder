import { describe, expect, it } from "vitest";

import { diffWorkspaceFiles } from "../../lib/workspace-files";

describe("workspace files", () => {
  it("treats missing files as deletions during sync", () => {
    const result = diffWorkspaceFiles(["app/page.tsx", "app/layout.tsx"], [
      { path: "app/page.tsx", code: "export default function Page() {}" },
    ]);

    expect(result.clean).toEqual([
      { path: "app/page.tsx", content: "export default function Page() {}" },
    ]);
    expect(result.deletedPaths).toEqual(["app/layout.tsx"]);
  });

  it("drops gitkeep files from canonical sync payloads", () => {
    const result = diffWorkspaceFiles(["app/.gitkeep"], [
      { path: "app/.gitkeep", code: "" },
      { path: "app/page.tsx", code: "export default function Page() {}" },
    ]);

    expect(result.clean).toEqual([
      { path: "app/page.tsx", content: "export default function Page()" + " {}" },
    ]);
    expect(result.deletedPaths).toEqual(["app/.gitkeep"]);
  });
});
