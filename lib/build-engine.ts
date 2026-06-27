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

type BuildInput = {
  prompt: string;
  mode: BuildMode;
  shadcn: boolean;
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

function isExplicitFullStack(prompt: string) {
  const text = prompt.toLowerCase();
  return /\b(full stack|full-stack|backend|api route|database|prisma|supabase|neon|server action|server actions)\b/.test(text);
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

  return Array.from(deps);
}

function envHintsFor(input: BuildInput) {
  const hints = new Set<string>();
  const text = input.prompt.toLowerCase();

  if (isExplicitFullStack(input.prompt)) hints.add("DATABASE_URL");
  if (/\b(auth|login|sign in|signin|oauth|google)\b/.test(text)) {
    hints.add("NEXTAUTH_SECRET");
    hints.add("NEXTAUTH_URL");
  }
  if (/\b(payment|stripe|checkout|subscription|billing)\b/.test(text)) hints.add("STRIPE_SECRET_KEY");
  if (/\b(ai|llm|openrouter|together|gemini|claude|gpt)\b/.test(text)) hints.add("MODEL_PROVIDER_API_KEY");

  return Array.from(hints);
}

function routesFor(input: BuildInput, templateId: BuildTemplateId) {
  const routes = new Set<string>(["/"]);
  const text = input.prompt.toLowerCase();

  if (isExplicitFullStack(input.prompt)) routes.add("/api/health");
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
  ].join("\n");
}

export function buildPhaseOneSpec(input: BuildInput): BuildSpec {
  const templateId = selectTemplate(input);
  const title = deriveTitle(input.prompt);
  const promptKeywords = Array.from(new Set(words(input.prompt).filter((word) => word.length > 3))).slice(0, 12);

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
    artifactFiles: [],
    systemContext: contextFor(input, templateId),
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
    "Artifact files: none seeded; model must generate prompt-specific files from scratch.",
  ].join("\n");
}

export function buildPhaseOneResponse(input: BuildInput) {
  const spec = buildPhaseOneSpec(input);
  return {
    spec,
    artifactFiles: spec.artifactFiles,
  };
}
