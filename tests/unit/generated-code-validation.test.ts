import { describe, expect, it } from "vitest";

import { validateGeneratedCodeFiles } from "../../lib/generated-code-validation";

const VALIDATION_TIMEOUT_MS = 15_000;

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
  }, VALIDATION_TIMEOUT_MS);

  it("rejects unresolved local alias imports before preview", async () => {
    const issues = await validateGeneratedCodeFiles([
      {
        path: "app/page.tsx",
        code: 'import { useAuth } from "@/lib/auth-context"; export default function Page() { return <main />; }',
      },
    ]);

    expect(issues.some((issue) => issue.message.includes("Unresolved local import"))).toBe(true);
  }, VALIDATION_TIMEOUT_MS);

  it("allows sandbox-provided Next compatibility shims", async () => {
    const issues = await validateGeneratedCodeFiles([
      {
        path: "app/page.tsx",
        code: 'import { useRouter } from "@/lib/next-navigation"; export default function Page() { const router = useRouter(); return <button onClick={() => router.push("/signin")}>Go</button>; }',
      },
    ]);

    expect(issues).toHaveLength(0);
  }, VALIDATION_TIMEOUT_MS);

  it("allows dependencies that are installed in the preview sandbox", async () => {
    const issues = await validateGeneratedCodeFiles([
      {
        path: "app/page.tsx",
        code: 'import { LineChart } from "recharts"; import gsap from "gsap"; export default function Page() { return <main><LineChart width={100} height={100} data={[]} /></main>; }',
      },
    ]);

    expect(issues).toHaveLength(0);
  }, VALIDATION_TIMEOUT_MS);

  it("allows scoped shadcn/Radix dependencies", async () => {
    const issues = await validateGeneratedCodeFiles([
      {
        path: "app/page.tsx",
        code: 'import * as Dialog from "@radix-ui/react-dialog"; export default function Page() { return <Dialog.Root><Dialog.Trigger>Open</Dialog.Trigger><Dialog.Content>Ready</Dialog.Content></Dialog.Root>; }',
      },
    ]);

    expect(issues).toHaveLength(0);
  }, VALIDATION_TIMEOUT_MS);

  it("allows premium 3D and animation dependencies", async () => {
    const issues = await validateGeneratedCodeFiles([
      {
        path: "app/page.tsx",
        code: 'import { Canvas } from "@react-three/fiber"; import { Float } from "@react-three/drei"; import gsap from "gsap"; import { ScrollTrigger } from "gsap/ScrollTrigger"; import { EffectComposer } from "postprocessing"; import * as THREE from "three"; export default function Page() { gsap.registerPlugin(ScrollTrigger); return <main><Canvas><Float><mesh><boxGeometry /><meshStandardMaterial color="cyan" /></mesh></Float></Canvas><span>{THREE.BackSide}{EffectComposer.name}</span></main>; }',
      },
    ]);

    expect(issues).toHaveLength(0);
  }, VALIDATION_TIMEOUT_MS);
});
