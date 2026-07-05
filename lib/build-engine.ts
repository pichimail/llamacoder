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
  backendMode: boolean;
  backendPlan?: { provider: "neon"; optionalSupabase: boolean; resources: string[]; envVars: string[] };
  systemContext: string;
};

type BuildInput = {
  prompt: string;
  mode: BuildMode;
  shadcn: boolean;
  backendMode?: boolean;
};

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "build"
  );
}

function titleCase(input: string) {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function deriveTitle(prompt: string) {
  const cleaned = prompt
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-/]/g, "")
    .trim();
  if (!cleaned) return "Requested App";
  return titleCase(cleaned).slice(0, 56) || "Requested App";
}

function words(prompt: string) {
  return prompt.toLowerCase().match(/[a-z0-9]+/g) || [];
}

function hasAny(prompt: string, terms: string[]) {
  const normalized = ` ${prompt.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  return terms.some((term) => normalized.includes(` ${term} `));
}

function isExplicitLanding(prompt: string) {
  const text = prompt.toLowerCase();
  return /\b(landing page|marketing site|marketing page|homepage|home page|website landing|saas landing|waitlist page|product page|sales page)\b/.test(text);
}

function isExplicitDashboard(prompt: string) {
  return hasAny(prompt, ["dashboard", "analytics", "metrics", "reporting", "crm", "workspace"]);
}

function isExplicitAdmin(prompt: string) {
  return hasAny(prompt, ["admin", "console", "moderation", "permissions", "roles"]);
}

function isExplicitAuth(prompt: string) {
  const text = prompt.toLowerCase();
  return /\b(auth|authentication|login|log in|sign in|signin|sign up|signup|onboarding|password|verification|protected route|session)\b/.test(text);
}

function isExplicitAiBuilder(prompt: string) {
  const text = prompt.toLowerCase();
  return /\b(ai builder|vibe coding|prompt to app|prompt-to-app|code generator|assistant workspace|chat builder)\b/.test(text);
}

function isExplicitFullStack(prompt: string, backendMode = false) {
  const text = prompt.toLowerCase();
  return backendMode || /\b(full stack|full-stack|backend|api route|database|prisma|supabase|neon|server action|server actions|crud|cms|crm|inventory|booking|orders|database)\b/.test(text);
}

function selectTemplate(input: BuildInput): BuildTemplateId {
  if (isExplicitLanding(input.prompt)) return "motion-landing";
  if (isExplicitAdmin(input.prompt)) return "admin-console";
  if (isExplicitAuth(input.prompt)) return "auth-flow";
  if (isExplicitAiBuilder(input.prompt)) return "ai-builder";
  if (isExplicitDashboard(input.prompt)) return "saas-dashboard";
  return "generic-app";
}

function dependenciesFor(input: BuildInput, templateId: BuildTemplateId) {
  const deps = new Set<string>();
  const text = input.prompt.toLowerCase();

  deps.add("lucide-react");
  if (input.shadcn) deps.add("shadcn-style components");
  if (templateId === "motion-landing" || /\b(animation|motion|framer|gsap|three|3d|canvas|parallax)\b/.test(text)) {
    deps.add("framer-motion");
  }
  if (/\b(chart|charts|graph|analytics|metrics|dashboard)\b/.test(text)) deps.add("local chart-ready data helpers");
  if (/\b(upload|file|image|attachment)\b/.test(text)) deps.add("file input handling");
  if (/\b(export|download|pdf|csv|zip)\b/.test(text)) deps.add("export helpers");
  if (isExplicitFullStack(input.prompt, input.backendMode)) {
    deps.add("@prisma/client");
    deps.add("prisma");
    deps.add("@neondatabase/serverless");
    deps.add("optional @supabase/supabase-js");
  }

  return Array.from(deps);
}

function envHintsFor(input: BuildInput) {
  const hints = new Set<string>();
  const text = input.prompt.toLowerCase();

  if (isExplicitFullStack(input.prompt, input.backendMode)) {
    hints.add("DATABASE_URL");
    hints.add("DIRECT_URL");
    hints.add("SUPABASE_URL");
    hints.add("SUPABASE_ANON_KEY");
  }
  if (/\b(auth|login|sign in|signin|oauth|google)\b/.test(text)) {
    hints.add("NEXTAUTH_SECRET");
    hints.add("NEXTAUTH_URL");
  }
  if (/\b(payment|stripe|checkout|subscription|billing)\b/.test(text)) hints.add("STRIPE_SECRET_KEY");
  if (/\b(ai|llm|assistant|chatbot|smart|summarize|classify|translate)\b/.test(text)) hints.add("CHINNALLM_ENABLED");

  return Array.from(hints);
}

function routesFor(input: BuildInput, templateId: BuildTemplateId) {
  const routes = new Set<string>(["/"]);
  const text = input.prompt.toLowerCase();

  if (isExplicitFullStack(input.prompt, input.backendMode)) routes.add("/api/health");
  if (/\b(admin|dashboard)\b/.test(text)) routes.add("/dashboard");
  if (/\b(settings)\b/.test(text)) routes.add("/settings");
  if (/\b(profile|account)\b/.test(text)) routes.add("/profile");
  if (templateId === "auth-flow") routes.add("/auth");

  return Array.from(routes);
}

function summaryFor(templateId: BuildTemplateId, prompt: string) {
  const title = deriveTitle(prompt);

  switch (templateId) {
    case "motion-landing":
      return `Explicit landing-page request for ${title}.`;
    case "saas-dashboard":
      return `Explicit dashboard/workspace request for ${title}.`;
    case "admin-console":
      return `Explicit admin/operator request for ${title}.`;
    case "auth-flow":
      return `Explicit authentication/onboarding request for ${title}.`;
    case "ai-builder":
      return `Explicit AI builder request for ${title}.`;
    default:
      return `Pure prompt-locked app request for ${title}.`;
  }
}

function contextFor(input: BuildInput, templateId: BuildTemplateId) {
  const exactPrompt = input.prompt.trim();
  const uiLibraryRule = input.shadcn
    ? "Shadcn-style components may be used when they improve forms, dashboards, dialogs, sheets, tabs, selects, tables, or settings."
    : "Do not import shadcn components; build with plain React and Tailwind.";

  return [
    "BUILD SPEC: PURE PROMPT-LOCKED GENERATION.",
    `Selected intent: ${templateId}.`,
    `Exact user prompt: ${exactPrompt}`,
    "The generated app must be based on the exact user prompt, not this build spec title.",
    "Do not seed, reuse, or preserve a generic landing page/template unless the exact prompt explicitly requested a landing page.",
    "Do not add dashboard, admin, auth, payments, backend, database, or API screens unless the exact prompt asked for them or they are required for the requested product to make sense.",
    "If the request is a tracker, build the tracker. If it is an editor, build the editor. If it is a game, build the game. If it is a marketplace, build the marketplace. If it is a landing page, build the landing page.",
    "Build premium UI by default, but keep the visual language specific to the requested product category.",
    uiLibraryRule,
    "No placeholder TODOs, fake metrics, fake testimonials, dead buttons, or static decorative-only UI.",
    ...(input.backendMode ? [getBackendSystemContext(input.prompt)] : []),
  ].join("\n");
}


function inferBackendResources(prompt: string): string[] {
  const text = prompt.toLowerCase();
  if (/\b(crm|lead|deal|pipeline|contact)\b/.test(text)) return ["contacts", "deals", "activities"];
  if (/\b(ecommerce|e-commerce|store|shop|product|cart|order)\b/.test(text)) return ["products", "orders", "customers"];
  if (/\b(booking|appointment|calendar|reservation)\b/.test(text)) return ["services", "bookings", "customers"];
  if (/\b(task|project|kanban|todo|timeline)\b/.test(text)) return ["projects", "tasks", "comments"];
  if (/\b(content|cms|blog|article|post)\b/.test(text)) return ["posts", "authors", "comments"];
  return ["items", "profiles", "events"];
}

function modelName(resource: string) {
  const singular = resource.endsWith("ies") ? `${resource.slice(0, -3)}y` : resource.endsWith("s") ? resource.slice(0, -1) : resource;
  return singular
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join("") || "Item";
}

function getBackendSystemContext(prompt: string) {
  const resources = inferBackendResources(prompt);
  return [
    "BACKEND MODE ENABLED.",
    "Generate a real full-stack artifact structure while keeping the preview client safe.",
    "Use Neon-compatible PostgreSQL as the primary database and Prisma schema as the source of truth.",
    "Generated backend-only files must live behind app/api/*, lib/db/*, prisma/*, or server-only modules and must not be imported by client components.",
    "Include .env.example with REQUIRED/OPTIONAL labels for every backend variable.",
    `Domain resources inferred for this prompt: ${resources.join(", ")}.`,
  ].join("\n");
}

function generatePrismaSchema(resources: string[]) {
  const models = resources.map((resource) => {
    const name = modelName(resource);
    if (resource === "contacts") {
      return `model Contact {\n  id        String   @id @default(cuid())\n  name      String\n  email     String?\n  phone     String?\n  company   String?\n  notes     String?\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n}`;
    }
    if (resource === "deals") {
      return `model Deal {\n  id        String   @id @default(cuid())\n  title     String\n  value     Int      @default(0)\n  stage     String   @default("new")\n  owner     String?\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n}`;
    }
    if (resource === "bookings") {
      return `model Booking {\n  id        String   @id @default(cuid())\n  customer  String\n  service   String\n  startsAt  DateTime\n  status    String   @default("pending")\n  notes     String?\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n}`;
    }
    if (resource === "products") {
      return `model Product {\n  id          String   @id @default(cuid())\n  name        String\n  description String?\n  price       Int      @default(0)\n  imageUrl    String?\n  active      Boolean  @default(true)\n  createdAt   DateTime @default(now())\n  updatedAt   DateTime @updatedAt\n}`;
    }
    if (resource === "orders") {
      return `model Order {\n  id        String   @id @default(cuid())\n  customer  String\n  total     Int      @default(0)\n  status    String   @default("new")\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n}`;
    }
    return `model ${name} {\n  id        String   @id @default(cuid())\n  title     String\n  summary   String?\n  status    String   @default("active")\n  metadata  Json?\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n}`;
  });
  return [`generator client {`, `  provider = "prisma-client-js"`, `}`, ``, `datasource db {`, `  provider = "postgresql"`, `  url      = env("DATABASE_URL")`, `}`, ``, ...models].join("\n");
}

function generateResourceRoute(resource: string) {
  const name = modelName(resource);
  const prismaDelegate = name[0].toLowerCase() + name.slice(1);
  return `import { NextRequest, NextResponse } from "next/server";\nimport { z } from "zod";\nimport { prisma } from "@/lib/db/neon";\n\nconst createSchema = z.object({\n  title: z.string().min(1).max(160).optional(),\n  name: z.string().min(1).max(160).optional(),\n  summary: z.string().max(1000).optional(),\n  status: z.string().max(40).optional(),\n  metadata: z.record(z.unknown()).optional(),\n});\n\nexport async function GET() {\n  const records = await prisma.${prismaDelegate}.findMany({ orderBy: { createdAt: "desc" }, take: 100 });\n  return NextResponse.json({ records });\n}\n\nexport async function POST(request: NextRequest) {\n  const parsed = createSchema.safeParse(await request.json().catch(() => null));\n  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });\n  const title = parsed.data.title || parsed.data.name || "Untitled";\n  const record = await prisma.${prismaDelegate}.create({ data: { ...parsed.data, title } as any });\n  return NextResponse.json({ record }, { status: 201 });\n}\n`;
}

function generateBackendArtifactFiles(prompt: string): { files: ArtifactFile[]; plan: BuildSpec["backendPlan"] } {
  const resources = inferBackendResources(prompt);
  const envVars = ["DATABASE_URL", "DIRECT_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY"];
  const files: ArtifactFile[] = [
    {
      path: "lib/db/neon.ts",
      language: "ts",
      code: `import { PrismaClient } from "@prisma/client";\n\ndeclare global {\n  // eslint-disable-next-line no-var\n  var __appPrisma: PrismaClient | undefined;\n}\n\nexport const prisma = globalThis.__appPrisma ?? new PrismaClient({\n  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],\n});\n\nif (process.env.NODE_ENV !== "production") globalThis.__appPrisma = prisma;\n`,
    },
    {
      path: "lib/db/supabase.ts",
      language: "ts",
      code: `type SupabaseConfig = { url: string; anonKey: string };\n\nexport function getSupabaseConfig(): SupabaseConfig | null {\n  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;\n  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;\n  if (!url || !anonKey) return null;\n  return { url, anonKey };\n}\n\nexport async function createSupabaseClient() {\n  const config = getSupabaseConfig();\n  if (!config) return null;\n  const mod = await import("@supabase/supabase-js");\n  return mod.createClient(config.url, config.anonKey);\n}\n`,
    },
    {
      path: "prisma/schema.prisma",
      language: "prisma",
      code: generatePrismaSchema(resources),
    },
    {
      path: ".env.example",
      language: "bash",
      code: `# REQUIRED: Neon/Postgres connection string for Prisma runtime\nDATABASE_URL=\"postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require\"\n\n# REQUIRED for Prisma migrations when using pooled DATABASE_URL\nDIRECT_URL=\"postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require\"\n\n# OPTIONAL: Supabase client support if configured\nSUPABASE_URL=\"\"\nSUPABASE_ANON_KEY=\"\"\nNEXT_PUBLIC_SUPABASE_URL=\"\"\nNEXT_PUBLIC_SUPABASE_ANON_KEY=\"\"\n`,
    },
  ];

  for (const resource of resources) {
    files.push({ path: `app/api/${resource}/route.ts`, language: "ts", code: generateResourceRoute(resource) });
  }

  files.push({
    path: "BACKEND_SETUP.md",
    language: "md",
    code: `# Backend setup\n\nThis generated app is backend-enabled.\n\n## Required variables\n\n| Variable | Required | Purpose |\n|---|---|---|\n| DATABASE_URL | Yes | Neon/Postgres runtime connection for Prisma Client |\n| DIRECT_URL | Yes | Direct connection for Prisma migrations |\n| SUPABASE_URL | Optional | Enables optional Supabase client |\n| SUPABASE_ANON_KEY | Optional | Enables optional Supabase client |\n\n## Commands\n\n\`\`\`bash\npnpm install\npnpm prisma generate\npnpm prisma migrate dev\npnpm dev\n\`\`\`\n`,
  });

  return { files, plan: { provider: "neon", optionalSupabase: true, resources, envVars } };
}

export function buildPhaseOneSpec(input: BuildInput): BuildSpec {
  const templateId = selectTemplate(input);
  const title = deriveTitle(input.prompt);
  const promptKeywords = Array.from(new Set(words(input.prompt).filter((word) => word.length > 3))).slice(0, 12);
  const backendEnabled = Boolean(input.backendMode) || isExplicitFullStack(input.prompt, false);
  const backend = backendEnabled ? generateBackendArtifactFiles(input.prompt) : null;

  return {
    id: `${slugify(input.prompt)}-${templateId}`,
    templateId,
    title,
    summary: summaryFor(templateId, input.prompt),
    mode: input.mode,
    shadcn: input.shadcn,
    keywords: promptKeywords,
    dependencies: dependenciesFor(input, templateId),
    envHints: envHintsFor(input),
    routes: routesFor(input, templateId),
    previewRoute: "/",
    artifactFiles: backend?.files ?? [],
    backendMode: backendEnabled,
    backendPlan: backend?.plan,
    systemContext: contextFor({ ...input, backendMode: backendEnabled }, templateId),
  };
}

export function buildPhaseOneSpecMessage(input: BuildInput) {
  const spec = buildPhaseOneSpec(input);
  return [
    `BUILD SPEC: ${spec.title}`,
    `Intent: ${spec.templateId}`,
    `Summary: ${spec.summary}`,
    `Routes: ${spec.routes.join(", ")}`,
    `Dependencies: ${spec.dependencies.join(", ") || "none"}`,
    `Env hints: ${spec.envHints.join(", ") || "none"}`,
    `Preview route: ${spec.previewRoute}`,
    spec.backendMode
      ? `Backend mode: enabled (${spec.backendPlan?.resources.join(", ") || "resources inferred"})`
      : "Backend mode: off",
    `Artifact files: ${spec.artifactFiles.length ? spec.artifactFiles.map((file) => file.path).join(", ") : "none seeded; model must generate prompt-specific files from scratch."}`,
  ].join("\n");
}

export function buildPhaseOneResponse(input: BuildInput) {
  const spec = buildPhaseOneSpec(input);
  return {
    spec,
    artifactFiles: spec.artifactFiles,
  };
}
