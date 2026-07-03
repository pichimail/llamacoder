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
    expect(config.files["/app/page.tsx"]).toContain('from "../lib/next-navigation"');
    expect(config.files["/components/ui/button.tsx"]).toBeUndefined();
  });

  it("rewrites local alias imports to relative imports for the Sandpack runtime", () => {
    const config = getSandpackConfig(
      [
        {
          path: "app/admin/page.tsx",
          content:
            'import { Button } from "@/components/ui/button"; import { cn } from "@/lib/utils"; export default function Page() { return <Button className={cn("px-4")}>Admin</Button>; }',
        },
      ],
      {},
      { includeShadcn: true },
    );

    const page = config.files["/app/admin/page.tsx"];
    expect(page).toContain('from "../../components/ui/button"');
    expect(page).toContain('from "../../lib/utils"');
  });

  it("strips root html and body tags from generated Next layouts for preview", () => {
    const config = getSandpackConfig(
      [
        {
          path: "app/layout.tsx",
          content: `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black text-white">{children}</body>
    </html>
  );
}`,
        },
        {
          path: "app/page.tsx",
          content: "export default function Page() { return <main>Hello</main>; }",
        },
      ],
      {},
      { includeShadcn: false },
    );

    const layout = config.files["/app/layout.tsx"];
    expect(layout).not.toContain("<html");
    expect(layout).not.toContain("<body");
    expect(layout).toContain('<div className="min-h-screen bg-black text-white">');
  });

  it("installs premium 3D and cinematic animation dependencies in preview", () => {
    const config = getSandpackConfig(
      [
        {
          path: "app/page.tsx",
          content:
            'import { Canvas } from "@react-three/fiber"; import { Float } from "@react-three/drei"; import gsap from "gsap"; import * as THREE from "three"; export default function Page() { return <Canvas><Float><mesh><boxGeometry /><meshBasicMaterial color={new THREE.Color("#38bdf8")} /></mesh></Float></Canvas>; }',
        },
      ],
      {},
      { includeShadcn: false },
    );

    expect(config.customSetup.dependencies).toMatchObject({
      "@react-three/fiber": expect.any(String),
      "@react-three/drei": expect.any(String),
      gsap: expect.any(String),
      postprocessing: expect.any(String),
      three: expect.any(String),
    });
  });

  it("uses a single slash-normalized App.tsx preview entrypoint", () => {
    const config = getSandpackConfig(
      [
        {
          path: "app/page.tsx",
          content: "export default function Page() { return <main>Generated page</main>; }",
        },
      ],
      {},
      { includeShadcn: false },
    );

    expect(config.files["/App.tsx"]).toContain("const routeComponents");
    expect(config.files["/App.tsx"]).toContain("import HomePage from './app/page';");
    expect(config.files["/app/page.tsx"]).toContain("Generated page");
    expect(config.files["App.tsx"]).toBeUndefined();
  });
});
