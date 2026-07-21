import { extractAllCodeBlocks } from "@/lib/utils";
import type { ArtifactFile } from "@/lib/artifact-analysis";
import type { Message } from "./page";

export type RawGeneratedFile = {
  path: string;
  code?: string;
  content?: string;
  language?: string;
  isPartial?: boolean;
};

export const MAX_AUTO_FIX_ATTEMPTS = 5;
export const FIX_CONTEXT_FILE_LIMIT = 18;
export const FIX_CONTEXT_CHAR_BUDGET = 70000;
export const SANDBOX_BUNDLER_TIMEOUT_RE = /Sandbox bundler did not respond in time/i;

/** Max automatic "continue where you left off" rounds when a response is cut
 * off at the provider's token limit. Distinct from the general autofix loop. */
export const MAX_CONTINUATION_ROUNDS = 5;

/** Trailing characters of a truncated response sent back as continuation context. */
export const CONTINUATION_TAIL_CHARS = 6000;

/** Wall-clock budget for a single user-initiated build attempt (ms). */
export const GENERATION_BUDGET_MS = 360_000;
export const GENERATION_BUDGET_FULLSTACK_MS = 600_000;

export function getMessageFiles(message: Message): RawGeneratedFile[] {
  const stored = message.files as RawGeneratedFile[] | null;
  if (stored && Array.isArray(stored) && stored.length > 0) {
    return stored.filter(
      (f) => f && typeof f.path === "string" && f.path.trim() && (f.code || f.content),
    );
  }
  try {
    const extracted = extractAllCodeBlocks(message.content || "") as RawGeneratedFile[];
    return extracted.filter((f) => f && f.path && (f.code || f.content));
  } catch (error) {
    console.warn("Failed to extract code blocks:", error);
    return [];
  }
}

export function normalizeFile(file: RawGeneratedFile): ArtifactFile {
  const path = (file.path || "App.tsx").replace(/^\/+/, "");
  const code = typeof file.code === "string" ? file.code : file.content || "";
  const language = file.language || path.split(".").pop() || "tsx";
  return { path, code, language };
}

export function normalizeAutoFixError(error: string) {
  return error
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/:\d+:\d+/g, ":line:col")
    .replace(/\bline\s+\d+\b/gi, "line n")
    .replace(/\bcolumn\s+\d+\b/gi, "column n")
    .replace(/\(\d+\)/g, "(n)")
    .replace(/\s+/g, " ");
}

export function autoFixFingerprint(error: string) {
  return normalizeAutoFixError(error)
    .replace(/Generated code validation failed before preview commit\.\s*/i, "")
    .replace(/Preview error:\s*/i, "")
    .slice(0, 900);
}

export function isNonFixablePreviewError(error: string) {
  return SANDBOX_BUNDLER_TIMEOUT_RE.test(error);
}

export function isPlanModeConversation(messages: Message[]) {
  return messages.some(
    (message) =>
      message.role === "system" &&
      /PLAN mode|Buildable Scope|Not Possible \/ Needs Input/i.test(message.content || ""),
  );
}

export function validationDescription(result: any, fallback: string) {
  const formatted =
    typeof result?.validation?.formatted === "string"
      ? result.validation.formatted.trim()
      : "";
  if (formatted) return formatted.slice(0, 900);

  const issues = Array.isArray(result?.validation?.issues) ? result.validation.issues : [];
  if (issues.length > 0) {
    return issues
      .slice(0, 3)
      .map((issue: any) => {
        const path = issue?.path ? `${issue.path}: ` : "";
        return `${path}${issue?.message || "Validation issue"}`;
      })
      .join("\n");
  }

  return result?.reason || fallback;
}

export function formatFixFileContext(files: RawGeneratedFile[]) {
  let remaining = FIX_CONTEXT_CHAR_BUDGET;
  const blocks: string[] = [];

  for (const rawFile of files.slice(0, FIX_CONTEXT_FILE_LIMIT)) {
    if (remaining <= 0) break;
    const file = normalizeFile(rawFile);
    if (!file.path || !file.code.trim()) continue;

    const budgetForFile = Math.max(1200, Math.min(remaining, 14000));
    const clipped =
      file.code.length > budgetForFile
        ? `${file.code.slice(0, budgetForFile)}\n/* ...truncated for fix context... */`
        : file.code;

    blocks.push(`\`\`\`${file.language || "tsx"}{path=${file.path}}\n${clipped}\n\`\`\``);
    remaining -= clipped.length;
  }

  if (files.length > FIX_CONTEXT_FILE_LIMIT) {
    blocks.push(
      `/* ${files.length - FIX_CONTEXT_FILE_LIMIT} additional files omitted from fix context. Preserve existing untouched files unless they must change. */`,
    );
  }

  return blocks.join("\n\n");
}

export function detectRequiredEnvKeys(files: ArtifactFile[]) {
  const keys = new Set<string>();
  const code = files.map((f) => f.code || "").join("\n");
  if (/openai|gpt|chatgpt|ai.*key|OPENAI_API_KEY/i.test(code)) keys.add("OPENAI_API_KEY");
  if (/supabase|SUPABASE|database.*url|DATABASE_URL/i.test(code)) keys.add("DATABASE_URL");
  if (/neon|NEON|postgres|postgresql/i.test(code)) keys.add("DATABASE_URL");
  if (/stripe|STRIPE|payment/i.test(code)) {
    keys.add("STRIPE_SECRET_KEY");
    keys.add("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  }
  if (/gemini|GEMINI_API_KEY/i.test(code)) keys.add("GEMINI_API_KEY");
  if (/anthropic|claude|ANTHROPIC/i.test(code)) keys.add("ANTHROPIC_API_KEY");
  if (/auth|nextauth|AUTH_SECRET|clerk/i.test(code)) keys.add("AUTH_SECRET");
  if (/clerk/i.test(code)) {
    keys.add("CLERK_SECRET_KEY");
    keys.add("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }
  if (/google.*auth|GOOGLE_CLIENT_ID|oauth.*google/i.test(code)) keys.add("GOOGLE_CLIENT_ID");
  if (/google.*auth|GOOGLE_CLIENT_SECRET/i.test(code)) keys.add("GOOGLE_CLIENT_SECRET");
  if (/grok|xai|GROK_API_KEY/i.test(code)) keys.add("GROK_API_KEY");
  if (/upstash|UPSTASH_REDIS/i.test(code)) {
    keys.add("UPSTASH_REDIS_REST_URL");
    keys.add("UPSTASH_REDIS_REST_TOKEN");
  }
  if (/shopify|SHOPIFY/i.test(code)) {
    keys.add("SHOPIFY_API_KEY");
    keys.add("SHOPIFY_API_SECRET");
    keys.add("SHOPIFY_STORE_DOMAIN");
  }
  if (/chinna|chinnallm|chinnaLLM|api\/chinnallm/i.test(code)) keys.add("CHINNALLM_ENABLED");
  return Array.from(keys);
}
