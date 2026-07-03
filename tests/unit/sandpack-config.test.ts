import { describe, expect, it } from "vitest";

import { getSandpackConfig } from "../../lib/sandpack-config";

describe("sandpack config", () => {
  it("always injects Next compatibility shims when shadcn is disabled", () => {
    const config = getSandpackConfig(
      [
        {
          path: "app/page.tsx",
          content:
            'import { useRouter } from "next/navigation"; export default function Page() { const router = useRouter(); return <button onClick={() => router.push("/signin")}>Go</button>; }',
        },
      ],
      {},
      { includeShadcn: false },
    );

    expect(config.files["/lib/next-navigation.ts"]).toContain("useRouter");
    expect(config.files["/lib/next-link.tsx"]).toContain("export default function Link");
    expect(config.files["/lib/next-image.tsx"]).toContain("export default function Image");
    expect(config.files["/components/ui/button.tsx"]).toBeUndefined();
  });
});
