import type { ArtifactFile } from "@/lib/artifact-analysis";

export type BuildMode = "ask" | "plan" | "agent";

export type BuildTemplateId =
  | "motion-landing"
  | "saas-dashboard"
  | "admin-console"
  | "auth-flow"
  | "ai-builder"
  | "generic-app";

export type BuildSpec = {
  id: string;
  templateId: BuildTemplateId;
  title: string;
  summary: string;
  mode: BuildMode;
  shadcn: boolean;
  keywords: string[];
  dependencies: string[];
  envHints: string[];
  routes: string[];
  previewRoute: string;
  artifactFiles: ArtifactFile[];
  systemContext: string;
};

type TemplateMatch = {
  templateId: BuildTemplateId;
  title: string;
  summary: string;
  keywords: string[];
  dependencies: string[];
  envHints: string[];
  routes: string[];
  makeFiles: (input: BuildInput) => ArtifactFile[];
  makeContext: (input: BuildInput) => string;
};

type BuildInput = {
  prompt: string;
  mode: BuildMode;
  shadcn: boolean;
};

const TEMPLATE_MATCHERS: TemplateMatch[] = [
  {
    templateId: "motion-landing",
    title: "Motion landing scaffold",
    summary: "Cinematic hero, stacked sections, and motion-first composition.",
    keywords: ["landing", "marketing", "hero", "motion", "parallax", "gsap", "three", "anime"],
    dependencies: ["framer-motion", "lucide-react"],
    envHints: ["NEXT_PUBLIC_SITE_URL"],
    routes: ["/", "/api/health"],
    makeFiles: (input) => createMotionLandingFiles(input),
    makeContext: (input) =>
      `Template: motion-landing. Build a premium landing page with cinematic rhythm, a strong hero, and strong visual hierarchy. Respect the user prompt: ${input.prompt.trim()}.`,
  },
  {
    templateId: "saas-dashboard",
    title: "SaaS dashboard scaffold",
    summary: "Workspace shell, KPI cards, table region, and filters.",
    keywords: ["dashboard", "saas", "analytics", "crm", "workspace", "report", "metrics"],
    dependencies: ["lucide-react"],
    envHints: ["DATABASE_URL", "NEXT_PUBLIC_APP_URL"],
    routes: ["/", "/api/health", "/api/metrics"],
    makeFiles: (input) => createDashboardFiles(input),
    makeContext: (input) =>
      `Template: saas-dashboard. Build a product workspace with navigation, metric cards, and a data panel. Respect the user prompt: ${input.prompt.trim()}.`,
  },
  {
    templateId: "admin-console",
    title: "Admin console scaffold",
    summary: "Control panel with roles, settings, and system surfaces.",
    keywords: ["admin", "console", "settings", "users", "permissions", "billing", "moderation"],
    dependencies: ["lucide-react"],
    envHints: ["DATABASE_URL", "ADMIN_ID", "ADMIN_PASSWORD"],
    routes: ["/", "/api/health", "/api/audit"],
    makeFiles: (input) => createAdminFiles(input),
    makeContext: (input) =>
      `Template: admin-console. Build a precise operator dashboard with admin controls and system state. Respect the user prompt: ${input.prompt.trim()}.`,
  },
  {
    templateId: "auth-flow",
    title: "Auth flow scaffold",
    summary: "Split-screen sign in, validation states, and onboarding structure.",
    keywords: ["auth", "login", "sign in", "sign up", "onboarding", "password", "verification"],
    dependencies: ["lucide-react"],
    envHints: ["NEXTAUTH_URL", "NEXTAUTH_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    routes: ["/", "/api/health"],
    makeFiles: (input) => createAuthFiles(input),
    makeContext: (input) =>
      `Template: auth-flow. Build an authentication and onboarding surface with a refined split-screen layout. Respect the user prompt: ${input.prompt.trim()}.`,
  },
  {
    templateId: "ai-builder",
    title: "AI builder scaffold",
    summary: "Prompt workspace, tool rail, result area, and remix controls.",
    keywords: ["ai", "chat", "builder", "prompt", "agent", "assistant", "studio"],
    dependencies: ["lucide-react"],
    envHints: ["TOGETHER_API_KEY", "OPENROUTER_API_KEY"],
    routes: ["/", "/api/health", "/api/rewrite-prompt"],
    makeFiles: (input) => createAIBuildFiles(input),
    makeContext: (input) =>
      `Template: ai-builder. Build an AI product workspace with a prompt bar, control rail, and visible build output. Respect the user prompt: ${input.prompt.trim()}.`,
  },
  {
    templateId: "generic-app",
    title: "Generic app scaffold",
    summary: "A safe starter shell for unclassified build requests.",
    keywords: [],
    dependencies: ["lucide-react"],
    envHints: [],
    routes: ["/", "/api/health"],
    makeFiles: (input) => createGenericFiles(input),
    makeContext: (input) =>
      `Template: generic-app. Build a clean, production-safe starter shell. Respect the user prompt: ${input.prompt.trim()}.`,
  },
];

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "build";
}

function titleCase(input: string) {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function deriveHeadline(prompt: string) {
  const cleaned = prompt
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-/]/g, "")
    .trim();
  if (!cleaned) return "Build";
  return titleCase(cleaned).slice(0, 42);
}

function normalizePrompt(prompt: string) {
  return prompt.toLowerCase();
}

function selectTemplate(input: BuildInput): TemplateMatch {
  const prompt = normalizePrompt(input.prompt);
  const pool = TEMPLATE_MATCHERS.filter((template) =>
    template.keywords.some((keyword) => prompt.includes(keyword)),
  );

  if (pool.length === 0) return TEMPLATE_MATCHERS.at(-1)!;
  if (input.mode === "plan") return pool.find((item) => item.templateId === "saas-dashboard") ?? pool[0];
  if (input.mode === "ask") return pool.find((item) => item.templateId === "generic-app") ?? pool[0];
  return pool[0];
}

function starterPageShell(params: {
  headline: string;
  subheading: string;
  accent: string;
  sections: Array<{ label: string; value: string }>;
  footer: string;
  showToolbar?: boolean;
}) {
  const sections = params.sections
    .map(
      (section) =>
        `<div className="rounded-3xl border border-white/10 bg-white/5 p-4"><div className="text-xs uppercase tracking-[0.24em] text-white/50">${section.label}</div><div className="mt-2 text-base text-white/90">${section.value}</div></div>`,
    )
    .join("");

  return `\
"use client";

import { ArrowRight, Sparkles, PanelTop, LayoutDashboard, Shield, Bot, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const sections = [
  ${params.sections
    .map((section) => `{ label: ${JSON.stringify(section.label)}, value: ${JSON.stringify(section.value)} }`)
    .join(",\n  ")},
];

export default function App() {
  return (
    <main className="min-h-screen bg-[#0b0d12] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_36%),radial-gradient(circle_at_bottom,_rgba(244,114,182,0.2),_transparent_36%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
          ${params.showToolbar ? `<div className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 backdrop-blur-xl"><span className="inline-flex items-center gap-2"><Sparkles className="size-4" /> ${params.footer}</span><span className="hidden items-center gap-2 sm:inline-flex"><PanelTop className="size-4" /> Live preview</span></div>` : ""}
          <section className="grid flex-1 gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/60">${params.accent}</div>
              <div className="space-y-4">
                <h1 className="max-w-2xl text-5xl font-semibold tracking-tight sm:text-6xl">${params.headline}</h1>
                <p className="max-w-xl text-base leading-7 text-white/70">${params.subheading}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button className="rounded-full bg-white text-slate-950 hover:bg-white/90">Remix in builder <ArrowRight className="ml-2 size-4" /></Button>
                <Button variant="outline" className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10">Open preview</Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">${sections}</div>
            </div>
            <Card className="border-white/10 bg-white/5 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <CardContent className="p-4 sm:p-6">
                <div className="grid gap-4">
                  <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-5">
                    <div className="flex items-center gap-2 text-sm text-white/70"><LayoutDashboard className="size-4" /> Workspace</div>
                    <div className="mt-4 grid gap-3">
                      <div className="rounded-2xl bg-black/20 p-4"><div className="text-xs uppercase tracking-[0.24em] text-white/45">Build queue</div><p className="mt-2 text-sm text-white/85">Scaffold selected, workspace seeded, and preview-ready files are delivered automatically.</p></div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-black/20 p-4"><div className="text-xs uppercase tracking-[0.24em] text-white/45">Artifacts</div><p className="mt-2 text-sm text-white/85">Files, routes, and env hints land here.</p></div>
                        <div className="rounded-2xl bg-black/20 p-4"><div className="text-xs uppercase tracking-[0.24em] text-white/45">Backend</div><p className="mt-2 text-sm text-white/85">Preview-safe + backend-shaped files are tracked separately.</p></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
`;
}

function createMotionLandingFiles(input: BuildInput): ArtifactFile[] {
  const headline = deriveHeadline(input.prompt) || "Build something cinematic";
  return [
    {
      path: "app/page.tsx",
      code: starterPageShell({
        headline,
        subheading:
          "A motion-forward landing page scaffold with a hero, proof blocks, and a premium product frame.",
        accent: "Motion landing",
        footer: "Motion scaffold",
        showToolbar: true,
        sections: [
          { label: "Hero", value: "Cinematic first viewport" },
          { label: "Motion", value: "GSAP-ready section rhythm" },
          { label: "Output", value: "Preview-safe React shell" },
        ],
      }),
    },
    {
      path: "app/api/health/route.ts",
      code: `import { NextResponse } from "next/server"; export function GET() { return NextResponse.json({ ok: true, scope: "motion-landing" }); }`,
    },
    {
      path: "lib/scaffold.ts",
      code: `export const scaffoldName = "motion-landing"; export const scaffoldSummary = "Cinematic landing scaffold seeded by the build engine.";`,
    },
  ];
}

function createDashboardFiles(input: BuildInput): ArtifactFile[] {
  const headline = deriveHeadline(input.prompt) || "Ship your dashboard";
  return [
    {
      path: "app/page.tsx",
      code: starterPageShell({
        headline,
        subheading:
          "A clean SaaS workspace scaffold with KPIs, filters, and a data surface for backend wiring.",
        accent: "SaaS dashboard",
        footer: "Dashboard scaffold",
        showToolbar: true,
        sections: [
          { label: "Users", value: "1,248 active seats" },
          { label: "Revenue", value: "$84.2k this month" },
          { label: "Health", value: "All services green" },
        ],
      }),
    },
    {
      path: "app/api/metrics/route.ts",
      code: `import { NextResponse } from "next/server"; export function GET() { return NextResponse.json({ ok: true, activeUsers: 1248, revenue: 84200, services: "green" }); }`,
    },
    {
      path: "lib/mock-metrics.ts",
      code: `export const mockMetrics = [{ label: "Active users", value: "1,248" }, { label: "Revenue", value: "$84.2k" }, { label: "Uptime", value: "99.98%" }];`,
    },
  ];
}

function createAdminFiles(input: BuildInput): ArtifactFile[] {
  const headline = deriveHeadline(input.prompt) || "Operate with control";
  return [
    {
      path: "app/page.tsx",
      code: starterPageShell({
        headline,
        subheading:
          "An admin console scaffold with clear sections for permissions, deployments, and system control.",
        accent: "Admin console",
        footer: "Operator scaffold",
        showToolbar: true,
        sections: [
          { label: "Roles", value: "User, editor, owner" },
          { label: "Deploys", value: "Preview and production channels" },
          { label: "Audit", value: "Config changes tracked" },
        ],
      }),
    },
    {
      path: "app/api/audit/route.ts",
      code: `import { NextResponse } from "next/server"; export function GET() { return NextResponse.json({ ok: true, events: [] }); }`,
    },
    {
      path: "lib/admin-shell.ts",
      code: `export const adminShell = { sections: ["roles", "deployments", "audit"], source: "phase-1-build-engine" };`,
    },
  ];
}

function createAuthFiles(input: BuildInput): ArtifactFile[] {
  const headline = deriveHeadline(input.prompt) || "Secure the experience";
  return [
    {
      path: "app/page.tsx",
      code: starterPageShell({
        headline,
        subheading:
          "An auth-first scaffold with a split-screen flow, validation-ready forms, and onboarding space.",
        accent: "Auth flow",
        footer: "Authentication scaffold",
        showToolbar: true,
        sections: [
          { label: "Sign in", value: "Email, OAuth, magic link" },
          { label: "Onboarding", value: "Workspace creation steps" },
          { label: "Security", value: "Validation + session state" },
        ],
      }),
    },
    {
      path: "app/api/health/route.ts",
      code: `import { NextResponse } from "next/server"; export function GET() { return NextResponse.json({ ok: true, scope: "auth-flow" }); }`,
    },
    {
      path: "lib/auth-scaffold.ts",
      code: `export const authScaffold = { features: ["signin", "signup", "onboarding"], source: "phase-1-build-engine" };`,
    },
  ];
}

function createAIBuildFiles(input: BuildInput): ArtifactFile[] {
  const headline = deriveHeadline(input.prompt) || "Build in one flow";
  return [
    {
      path: "app/page.tsx",
      code: starterPageShell({
        headline,
        subheading:
          "An AI builder scaffold with a prompt surface, control rail, and visible artifact delivery lane.",
        accent: "AI builder",
        footer: "Prompt-to-artifact scaffold",
        showToolbar: true,
        sections: [
          { label: "Prompt", value: "Natural language input" },
          { label: "Artifacts", value: "Files arrive automatically" },
          { label: "Preview", value: "Ready for remix and ship" },
        ],
      }),
    },
    {
      path: "app/api/rewrite-prompt/route.ts",
      code: `import { NextResponse } from "next/server"; export function GET() { return NextResponse.json({ ok: true, scope: "ai-builder" }); }`,
    },
    {
      path: "lib/builder-engine.ts",
      code: `export const builderEngine = { version: "phase-1", mode: ${JSON.stringify(input.mode)}, shadcn: ${JSON.stringify(input.shadcn)} };`,
    },
  ];
}

function createGenericFiles(input: BuildInput): ArtifactFile[] {
  const headline = deriveHeadline(input.prompt) || "Start building";
  return [
    {
      path: "app/page.tsx",
      code: starterPageShell({
        headline,
        subheading:
          "A safe starter shell that keeps the preview working while the real app shape is selected.",
        accent: "Generic scaffold",
        footer: "Fallback scaffold",
        showToolbar: true,
        sections: [
          { label: "Route", value: "Renderable app/page.tsx" },
          { label: "Mode", value: input.mode },
          { label: "Library", value: input.shadcn ? "shadcn on" : "plain React" },
        ],
      }),
    },
    {
      path: "app/api/health/route.ts",
      code: `import { NextResponse } from "next/server"; export function GET() { return NextResponse.json({ ok: true, scope: "generic-app" }); }`,
    },
    {
      path: "lib/scaffold.ts",
      code: `export const scaffoldName = "generic-app"; export const scaffoldSummary = "Fallback build scaffold chosen by phase 1.";`,
    },
  ];
}

export function buildPhaseOneSpec(input: BuildInput): BuildSpec {
  const template = selectTemplate(input);
  const artifactFiles = template.makeFiles(input);
  const title = template.title;
  const previewRoute = "/";
  const id = `${slugify(input.prompt)}-${template.templateId}`;

  return {
    id,
    templateId: template.templateId,
    title,
    summary: template.summary,
    mode: input.mode,
    shadcn: input.shadcn,
    keywords: template.keywords,
    dependencies: template.dependencies,
    envHints: template.envHints,
    routes: template.routes,
    previewRoute,
    artifactFiles,
    systemContext: template.makeContext(input),
  };
}

export function buildPhaseOneSpecMessage(input: BuildInput) {
  const spec = buildPhaseOneSpec(input);
  return [
    `BUILD SPEC: ${spec.title}`,
    `Template: ${spec.templateId}`,
    `Summary: ${spec.summary}`,
    `Routes: ${spec.routes.join(", ")}`,
    `Dependencies: ${spec.dependencies.join(", ") || "none"}`,
    `Env hints: ${spec.envHints.join(", ") || "none"}`,
    `Preview route: ${spec.previewRoute}`,
    `Artifact files: ${spec.artifactFiles.map((file) => file.path).join(", ")}`,
  ].join("\n");
}

export function buildPhaseOneResponse(input: BuildInput) {
  const spec = buildPhaseOneSpec(input);
  return {
    spec,
    artifactFiles: spec.artifactFiles,
  };
}
