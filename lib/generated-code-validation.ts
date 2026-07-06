import type * as TypeScript from "typescript";
import {
  DEFAULT_STYLE_ID,
  getPresetSurfaceTones,
  type PresetSurfaceTones,
} from "@/lib/sandbox-theme";

export type GeneratedCodeIssue = {
  path: string;
  line: number;
  column: number;
  message: string;
  excerpt: string;
};

const VALIDATABLE_EXTENSIONS = new Set(["ts", "tsx", "js", "jsx", "mjs", "cjs"]);

function getScriptKind(ts: typeof TypeScript, path: string) {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  if (ext === "tsx" || ext === "jsx") return ts.ScriptKind.TSX;
  return ts.ScriptKind.JS;
}

function getExcerpt(source: string, lineIndex: number) {
  const lines = source.split(/\r?\n/);
  const line = lines[lineIndex] ?? "";
  return line.trimEnd();
}

function isValidatablePath(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  return VALIDATABLE_EXTENSIONS.has(ext);
}

const ALLOWED_DEPS = new Set([
  "@react-three/drei",
  "@react-three/fiber",
  "@hookform/resolvers",
  "@radix-ui/react-accordion",
  "@radix-ui/react-alert-dialog",
  "@radix-ui/react-aspect-ratio",
  "@radix-ui/react-avatar",
  "@radix-ui/react-checkbox",
  "@radix-ui/react-collapsible",
  "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-hover-card",
  "@radix-ui/react-label",
  "@radix-ui/react-menubar",
  "@radix-ui/react-navigation-menu",
  "@radix-ui/react-popover",
  "@radix-ui/react-progress",
  "@radix-ui/react-radio-group",
  "@radix-ui/react-scroll-area",
  "@radix-ui/react-select",
  "@radix-ui/react-separator",
  "@radix-ui/react-slider",
  "@radix-ui/react-slot",
  "@radix-ui/react-switch",
  "@radix-ui/react-tabs",
  "@radix-ui/react-toast",
  "@radix-ui/react-toggle",
  "@radix-ui/react-toggle-group",
  "@radix-ui/react-tooltip",
  "@radix-ui/react-visually-hidden",
  "@twind/core",
  "@twind/preset-autoprefix",
  "@twind/preset-tailwind",
  "animejs",
  "class-variance-authority",
  "clsx",
  "cmdk",
  "date-fns",
  "embla-carousel-react",
  "framer-motion",
  "gsap",
  "lucide-react",
  "next",
  "next-themes",
  "postprocessing",
  "react",
  "react-day-picker",
  "react-dom",
  "react-hook-form",
  "react-resizable-panels",
  "react-router-dom",
  "recharts",
  "sonner",
  "tailwind-merge",
  "tailwindcss",
  "three",
  "vaul",
  "zod",
  "zustand",
]);

function getPackageName(spec: string) {
  if (!spec.startsWith("@")) return spec.split("/")[0];
  const [scope, name] = spec.split("/");
  return scope && name ? `${scope}/${name}` : spec;
}

const KNOWN_SANDBOX_FILES = new Set([
  "lib/utils.ts",
  "lib/next-navigation.ts",
  "lib/next-link.tsx",
  "lib/next-image.tsx",
]);

function hasPathTraversal(p: string): boolean {
  return p.includes("..") || p.startsWith("/") || p.includes("://") || /\0/.test(p);
}

function detectBadImports(code: string): string[] {
  const bad: string[] = [];
  const importRe = /from\s+["']([^"']+)["']/g;
  let m;
  while ((m = importRe.exec(code))) {
    const spec = m[1];
    if (spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("@/")) continue;
    const pkg = getPackageName(spec);
    if (!ALLOWED_DEPS.has(pkg) && !pkg.startsWith("node:")) {
      bad.push(spec);
    }
  }
  return bad;
}

function normalizeArtifactPath(path: string) {
  return path.replace(/^\/+/, "").replace(/^src\//, "");
}

function dirname(path: string) {
  const normalized = normalizeArtifactPath(path);
  const index = normalized.lastIndexOf("/");
  return index === -1 ? "" : normalized.slice(0, index);
}

function joinPath(base: string, spec: string) {
  const parts = `${base ? `${base}/` : ""}${spec}`.split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}

function extractImportSpecifiers(code: string) {
  const imports = new Set<string>();
  const importExportRe = /\b(?:import|export)\s+(?:type\s+)?(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicImportRe = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = importExportRe.exec(code))) imports.add(match[1]);
  while ((match = dynamicImportRe.exec(code))) imports.add(match[1]);
  return Array.from(imports);
}

function possibleModulePaths(base: string) {
  const withoutExtension = base.replace(/\.(tsx|ts|jsx|js|css|json|mjs|cjs)$/i, "");
  return [
    base,
    `${withoutExtension}.tsx`,
    `${withoutExtension}.ts`,
    `${withoutExtension}.jsx`,
    `${withoutExtension}.js`,
    `${withoutExtension}.css`,
    `${withoutExtension}.json`,
    `${withoutExtension}/index.tsx`,
    `${withoutExtension}/index.ts`,
    `${withoutExtension}/index.jsx`,
    `${withoutExtension}/index.js`,
  ];
}

function detectUnresolvedLocalImports(
  path: string,
  code: string,
  availablePaths: Set<string>,
): string[] {
  const unresolved: string[] = [];

  for (const spec of extractImportSpecifiers(code)) {
    if (!spec.startsWith(".") && !spec.startsWith("@/")) continue;
    const candidateBase = spec.startsWith("@/")
      ? spec.slice(2)
      : joinPath(dirname(path), spec);

    const resolved = possibleModulePaths(candidateBase).some((candidate) => {
      const normalized = normalizeArtifactPath(candidate);
      return availablePaths.has(normalized) || KNOWN_SANDBOX_FILES.has(normalized);
    });

    if (!resolved) unresolved.push(spec);
  }

  return unresolved;
}

/**
 * Structural fallback for detecting a file that was cut off mid-generation
 * (e.g. the provider hit its token limit) even when the streaming layer's
 * finish_reason signal is missing or unreliable for a given provider. This is
 * intentionally conservative — cheap bracket/string/tag balance checks, not a
 * full parser — because it only needs to catch the cases the TypeScript
 * compiler's error recovery might silently paper over.
 */
function detectTruncatedFile(code: string): string | null {
  const trimmed = code.trimEnd();
  if (!trimmed) return null;

  // An unterminated fenced code block inside the file content itself (rare,
  // but happens when a file legitimately contains markdown/code-fence text).
  const fenceMatches = trimmed.match(/```/g);
  if (fenceMatches && fenceMatches.length % 2 !== 0) {
    return "File ends with an unterminated code fence — the response was likely cut off before completion";
  }

  // Bracket/paren/brace balance. Ignore braces/parens inside string or
  // template literals as best-effort by stripping simple string contents first.
  const withoutStrings = trimmed
    .replace(/`(?:[^`\\]|\\.)*`/g, "``")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");

  const pairs: Array<[string, string]> = [
    ["{", "}"],
    ["(", ")"],
    ["[", "]"],
  ];
  for (const [open, close] of pairs) {
    const openCount = (withoutStrings.match(new RegExp(`\\${open}`, "g")) || []).length;
    const closeCount = (withoutStrings.match(new RegExp(`\\${close}`, "g")) || []).length;
    if (openCount !== closeCount) {
      return `Unbalanced '${open}${close}' pair (${openCount} open vs ${closeCount} close) — the file appears to be cut off mid-statement`;
    }
  }

  // Unterminated string/template literal: an odd number of un-escaped quote
  // characters on the very last non-empty line is a strong truncation signal.
  const lastLine = trimmed.split("\n").filter(Boolean).pop() ?? "";
  for (const quote of ['"', "'", "`"]) {
    const count = (lastLine.match(new RegExp(`(?<!\\\\)${quote}`, "g")) || []).length;
    if (count % 2 !== 0) {
      return "The last line ends with an unterminated string or template literal — the file appears to be cut off mid-statement";
    }
  }

  // A JSX/TSX file whose last non-empty line opens a tag that never closes.
  if (/<[A-Za-z][\w.]*(?:\s[^>]*)?$/.test(lastLine) && !lastLine.trim().endsWith(">")) {
    return "The file ends mid-way through an open JSX tag — the response was likely cut off before completion";
  }

  return null;
}

function detectPlaceholderCode(code: string): string | null {
  const compact = code.trim().replace(/\s+/g, " ");
  if (!compact) return null;

  if (/^\.{2,}\s*code\s*\.{2,}$/i.test(compact)) {
    return "Placeholder ellipsis code is not a runnable implementation";
  }
  if (/^(?:\/\/|\/\*|#)?\s*(?:todo|implementation goes here|insert code here|your code here|full file content|complete runnable implementation goes here)/i.test(compact)) {
    return "Placeholder implementation text is not runnable code";
  }
  if (compact.length < 24 && !/[{}=();]/.test(compact)) {
    return "Generated file is too small to be a real runnable source file";
  }
  if (/\.\.\.\s*(?:code|implementation|rest of|remaining)|(?:code|implementation)\s*\.\.\./i.test(compact)) {
    return "Generated file contains ellipsis placeholders instead of complete code";
  }

  return null;
}

/* ============================================================
 * PHASE 1 AUDIT — POST-GENERATION VISUAL VALIDATOR.
 * Extends (does not replace) the code validator with theme-token checks:
 *   1. Hardcoded hex + text/bg-black/white outside theme-preset files.
 *   2. Arbitrary multi-layer shadow stacks (3+ chained / colored-glow).
 *   3. Low-contrast pairs (dark text + dark bg, or light + light) on one
 *      element, cross-referenced against the ACTIVE preset's real token tones.
 *   4. Explicit literal light/dark color with no dark: variant (fails in one
 *      of the preset's two modes).
 * Unambiguous violations are auto-rewritten to semantic tokens
 * (rewriteUnambiguousVisualTokens); the rest surface as issues that feed the
 * existing autofix pipeline.
 * ============================================================ */

/** A file that legitimately holds raw colors — theme presets, globals, tailwind
 * config. Visual-token checks are skipped for these. */
function isThemePresetFile(path: string): boolean {
  const p = normalizeArtifactPath(path).toLowerCase();
  return (
    /(^|\/)globals?\.css$/.test(p) ||
    /(^|\/)(theme|themes|tokens|design-tokens|colors?)\.[jt]sx?$/.test(p) ||
    /sandbox-theme\.[jt]s$/.test(p) ||
    /tailwind\.config\.[jt]s$/.test(p) ||
    /(^|\/)theme-preset/.test(p)
  );
}

/** Unambiguous class-token rewrites: literal → semantic token. Applied whole-token. */
const UNAMBIGUOUS_CLASS_REWRITES: Array<[RegExp, string]> = [
  [/\bbg-white\b/g, "bg-background"],
  [/\btext-black\b/g, "text-foreground"],
  [/\bborder-white\b/g, "border-border"],
  [/\bborder-black\b/g, "border-border"],
];

/**
 * Auto-rewrite the unambiguous visual-token violations in a set of files.
 * Returns the (possibly) rewritten files plus a human-readable list of what was
 * changed. Theme-preset files are left untouched. This is intentionally
 * conservative — only mappings with a single correct target are applied; every
 * ambiguous case is left for the validator/autofix pipeline instead.
 */
export function rewriteUnambiguousVisualTokens<
  T extends { path: string; code?: string; content?: string },
>(files: T[]): { files: T[]; rewrites: string[] } {
  const rewrites: string[] = [];
  const out = files.map((file) => {
    if (!isValidatablePath(file.path) || isThemePresetFile(file.path)) return file;
    const original = file.code ?? file.content ?? "";
    if (!original) return file;
    let updated = original;
    for (const [re, replacement] of UNAMBIGUOUS_CLASS_REWRITES) {
      const before = updated;
      updated = updated.replace(re, replacement);
      if (updated !== before) {
        const count = (before.match(re) || []).length;
        rewrites.push(`${file.path}: ${re.source.replace(/\\b/g, "")} → ${replacement} (${count})`);
      }
    }
    if (updated === original) return file;
    return typeof file.code === "string"
      ? ({ ...file, code: updated } as T)
      : ({ ...file, content: updated } as T);
  });
  return { files: out, rewrites };
}

function posToLineCol(source: string, index: number): { line: number; column: number } {
  const upto = source.slice(0, index);
  const line = (upto.match(/\n/g) || []).length + 1;
  const column = index - upto.lastIndexOf("\n");
  return { line, column };
}

/** All className / class attribute string values with their start offsets. */
function extractClassAttributeChunks(code: string): Array<{ value: string; index: number }> {
  const chunks: Array<{ value: string; index: number }> = [];
  // className="..." | class="..." | className={"..."} | className={`...`}
  const re = /\b(?:className|class)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)\s*\})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const value = m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? "";
    chunks.push({ value, index: m.index });
  }
  return chunks;
}

const LIGHT_SCALE = new Set(["50", "100", "200"]);
const DARK_SCALE = new Set(["700", "800", "900", "950"]);
const NEUTRAL_FAMILIES = "(?:gray|slate|zinc|neutral|stone)";

/** Classify a single class token's tone as light/dark/mid for contrast checks. */
function classTone(token: string): "light" | "dark" | "mid" | null {
  if (/^(?:bg|text|border)-white$/.test(token)) return "light";
  if (/^(?:bg|text|border)-black$/.test(token)) return "dark";
  const scaleMatch = token.match(new RegExp(`^(?:bg|text|border)-${NEUTRAL_FAMILIES}-(\\d{2,3})$`));
  if (scaleMatch) {
    const step = scaleMatch[1];
    if (LIGHT_SCALE.has(step)) return "light";
    if (DARK_SCALE.has(step)) return "dark";
    return "mid";
  }
  return null;
}

function tokensOfKind(tokens: string[], kind: "bg" | "text"): string[] {
  return tokens.filter((t) => t.startsWith(`${kind}-`));
}

/** Detects visual-token violations. `tones` is the active preset's real token
 * lightness values, so the dark-on-dark / light-on-light reasoning is grounded
 * in the actual theme, not a guess. */
function detectVisualTokenIssues(
  path: string,
  code: string,
  tones: PresetSurfaceTones,
): GeneratedCodeIssue[] {
  const issues: GeneratedCodeIssue[] = [];
  if (!isValidatablePath(path) || isThemePresetFile(path)) return issues;

  const push = (index: number, message: string, excerptSource: string) => {
    const { line, column } = posToLineCol(code, index);
    issues.push({ path, line, column, message, excerpt: excerptSource.trim().slice(0, 200) });
  };

  // 1a. Hardcoded hex colors used as Tailwind arbitrary color values.
  const hexArbitraryRe = /\b(?:bg|text|border|from|via|to|ring|fill|stroke|decoration|outline|shadow)-\[#[0-9a-fA-F]{3,8}\]/g;
  let hm: RegExpExecArray | null;
  while ((hm = hexArbitraryRe.exec(code))) {
    push(hm.index, `Hardcoded hex color in a utility class ("${hm[0]}"). Use a semantic token (bg-background, text-foreground, bg-primary, border-border, ...).`, hm[0]);
  }

  const chunks = extractClassAttributeChunks(code);
  for (const chunk of chunks) {
    const tokens = chunk.value.split(/\s+/).filter(Boolean);
    const hasDarkVariant = tokens.some((t) => t.startsWith("dark:"));
    const bare = tokens.filter((t) => !t.includes(":")); // ignore variant-prefixed for base analysis

    // 1b. text/bg-black|white literals (outside theme-preset files).
    for (const t of bare) {
      if (/^(?:text|bg)-(?:black|white)$/.test(t)) {
        const idx = code.indexOf(t, chunk.index);
        push(idx === -1 ? chunk.index : idx, `Literal "${t}" bypasses the theme. Use a semantic token (${t.startsWith("bg-") ? "bg-background / bg-card / bg-primary" : "text-foreground / text-muted-foreground / text-primary-foreground"}).`, chunk.value);
      }
    }

    // 2. Multi-layer shadow stacks: 3+ chained shadow-* utilities, or a colored
    //    0_0_ glow, or an arbitrary multi-layer box-shadow.
    const shadowTokens = bare.filter((t) => /^shadow(?:-|$)/.test(t) && t !== "shadow-none");
    if (shadowTokens.length >= 3) {
      push(chunk.index, `Multi-layer shadow stack (${shadowTokens.length} chained shadow utilities). Use a single shadow-sm / shadow / shadow-md from the scale.`, chunk.value);
    }
    for (const t of bare) {
      if (/^shadow-\[.*(?:0_0_|,).*\]$/.test(t)) {
        const idx = code.indexOf(t, chunk.index);
        push(idx === -1 ? chunk.index : idx, `Arbitrary colored-glow / multi-layer shadow ("${t}"). Use a single scale shadow token instead.`, chunk.value);
      }
    }

    // 3. Low-contrast pair on one element: bg + text literals on the same tone side.
    const bgTones = tokensOfKind(bare, "bg").map(classTone).filter(Boolean) as Array<"light" | "dark" | "mid">;
    const textTones = tokensOfKind(bare, "text").map(classTone).filter(Boolean) as Array<"light" | "dark" | "mid">;
    const bgTone = bgTones.find((x) => x === "light" || x === "dark");
    const textTone = textTones.find((x) => x === "light" || x === "dark");
    if (bgTone && textTone && bgTone === textTone) {
      push(chunk.index, `Low-contrast pair: ${textTone} text on a ${bgTone} background on the same element. This fails WCAG contrast. Use foreground/background token pairs (e.g. bg-card + text-card-foreground).`, chunk.value);
    }

    // 4. Explicit literal color with NO dark: variant → fails in one of the
    //    preset's two runtime modes. Cross-referenced against real token tones.
    if (!hasDarkVariant) {
      const litText = tokensOfKind(bare, "text").find((t) => classTone(t) === "light" || classTone(t) === "dark");
      const litBgAlso = tokensOfKind(bare, "bg").some((t) => classTone(t) !== null);
      if (litText && !litBgAlso) {
        const tone = classTone(litText);
        if (tone === "light") {
          push(chunk.index, `"${litText}" has no background and no dark: variant. Against this preset's light surface (background lightness ${tones.light.background}%) it renders light-on-light. Use text-foreground or add a dark: variant.`, chunk.value);
        } else if (tone === "dark") {
          push(chunk.index, `"${litText}" has no background and no dark: variant. Against this preset's dark surface (background lightness ${tones.dark.background}%) it renders dark-on-dark. Use text-foreground or add a dark: variant.`, chunk.value);
        }
      }
    }
  }

  return issues;
}

function detectGeneratedControlIssues(path: string, code: string): GeneratedCodeIssue[] {
  const issues: GeneratedCodeIssue[] = [];
  if (!isValidatablePath(path) || isThemePresetFile(path)) return issues;
  const normalizedPath = normalizeArtifactPath(path);
  const push = (index: number, message: string, excerptSource: string) => {
    const { line, column } = posToLineCol(code, Math.max(0, index));
    issues.push({ path, line, column, message, excerpt: excerptSource.trim().slice(0, 200) });
  };

  if (/components\/ui\/button\.(tsx|jsx|ts|js)$/.test(normalizedPath)) {
    const staticButtonTemplate =
      /shadow-md/.test(code) &&
      /hover:(?:-)?translate-[xy]-/.test(code) &&
      /bg-foreground\s+text-background/.test(code);
    if (staticButtonTemplate) {
      push(
        code.indexOf("shadow-md"),
        "Static generated Button template detected: shadow-md + hover translate + bg-foreground/text-background repeats the same control style across every theme. Use style-preset-aware token variants instead.",
        "shadow-md hover:translate-* bg-foreground text-background",
      );
    }
  }

  if (/components\/ui\/(button|input|textarea)\.(tsx|jsx|ts|js)$/.test(normalizedPath)) {
    const repeatedHeavyControls = (code.match(/\bshadow-md\b/g) || []).length >= 2 && /hover:shadow/.test(code);
    if (repeatedHeavyControls) {
      push(
        code.indexOf("shadow-md"),
        "Heavy repeated control shadows detected. Buttons and inputs should use subtle outlines/elevation from the active style preset, not the same shadowed recipe everywhere.",
        "shadow-md hover:shadow",
      );
    }
  }

  const chunks = extractClassAttributeChunks(code);
  for (const chunk of chunks) {
    const tokens = chunk.value.split(/\s+/).filter(Boolean);
    const hasIconOnlyShape = tokens.some((t) => /^(?:size|h|w)-/.test(t)) && !tokens.some((t) => /^px-|^gap-/.test(t));
    const hasSameSurfacePair =
      (tokens.includes("bg-background") && tokens.includes("text-background")) ||
      (tokens.includes("bg-card") && tokens.includes("text-card")) ||
      (tokens.includes("bg-muted") && tokens.includes("text-muted")) ||
      (tokens.includes("bg-primary") && tokens.includes("text-primary"));
    if (hasIconOnlyShape && hasSameSurfacePair) {
      push(
        chunk.index,
        "Icon-only control uses same-surface background/text tokens, which can make icons disappear. Use paired foreground tokens such as bg-secondary text-secondary-foreground or bg-primary text-primary-foreground.",
        chunk.value,
      );
    }
  }

  return issues;
}

export async function validateGeneratedCodeFiles(
  files: Array<{ path: string; code?: string; content?: string }>,
  styleId: string = DEFAULT_STYLE_ID,
): Promise<GeneratedCodeIssue[]> {
  const presetTones = getPresetSurfaceTones(styleId);
  const issues: GeneratedCodeIssue[] = [];
  let tsModule: typeof TypeScript | null = null;
  const availablePaths = new Set(
    files
      .filter((file) => typeof file.path === "string")
      .map((file) => normalizeArtifactPath(file.path)),
  );

  for (const file of files) {
    const code = file.code ?? file.content ?? "";
    if (!code.trim() || !isValidatablePath(file.path)) continue;

    if (hasPathTraversal(file.path)) {
      issues.push({ path: file.path, line: 1, column: 1, message: "Path traversal or absolute path rejected", excerpt: file.path });
      continue;
    }

    const placeholderIssue = detectPlaceholderCode(code);
    if (placeholderIssue) {
      issues.push({ path: file.path, line: 1, column: 1, message: placeholderIssue, excerpt: getExcerpt(code, 0) });
      continue;
    }

    // Fallback safety net: catches truncation even if the streaming layer's
    // finish_reason signal was missing or the provider misreported it.
    const truncationIssue = detectTruncatedFile(code);
    if (truncationIssue) {
      const lines = code.split("\n");
      issues.push({
        path: file.path,
        line: lines.length,
        column: 1,
        message: `[TRUNCATED_RESPONSE] ${truncationIssue}`,
        excerpt: getExcerpt(code, lines.length - 1),
      });
      continue;
    }

    const bad = detectBadImports(code);
    for (const b of bad) {
      issues.push({ path: file.path, line: 1, column: 1, message: `Unapproved external dependency: ${b}`, excerpt: b });
    }

    const unresolved = detectUnresolvedLocalImports(file.path, code, availablePaths);
    for (const spec of unresolved) {
      issues.push({
        path: file.path,
        line: 1,
        column: 1,
        message: `Unresolved local import: ${spec}. Generate the imported file or remove the import before preview.`,
        excerpt: spec,
      });
    }

    // Phase 1 audit: post-generation visual-token validation. Grounded in the
    // active preset's real token tones. Unambiguous fixes are applied upstream
    // by rewriteUnambiguousVisualTokens; whatever remains surfaces here and
    // feeds the existing autofix pipeline.
    for (const visualIssue of detectVisualTokenIssues(file.path, code, presetTones)) {
      issues.push(visualIssue);
    }

    for (const controlIssue of detectGeneratedControlIssues(file.path, code)) {
      issues.push(controlIssue);
    }

    tsModule ??= await import("typescript");
    const ts = tsModule;
    const scriptKind = getScriptKind(ts, file.path);
    const sourceFile = ts.createSourceFile(file.path, code, ts.ScriptTarget.Latest, true, scriptKind);
    const diagnostics = ts.transpileModule(code, {
      compilerOptions: {
        allowJs: true,
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
        noEmit: true,
        isolatedModules: true,
      },
      fileName: file.path,
      reportDiagnostics: true,
    }).diagnostics ?? [];

    for (const diagnostic of diagnostics) {
      if (diagnostic.category !== ts.DiagnosticCategory.Error) continue;
      const start = diagnostic.start ?? 0;
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
      issues.push({
        path: file.path,
        line: line + 1,
        column: character + 1,
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        excerpt: getExcerpt(code, line),
      });
    }
  }

  return issues;
}

export function formatGeneratedCodeIssues(issues: GeneratedCodeIssue[]) {
  if (issues.length === 0) return "";

  return issues
    .map((issue, index) => {
      const header = `${index + 1}. ${issue.path}:${issue.line}:${issue.column}`;
      const lines = [header, `   ${issue.message}`];
      if (issue.excerpt) lines.push(`   > ${issue.excerpt}`);
      return lines.join("\n");
    })
    .join("\n\n");
}
