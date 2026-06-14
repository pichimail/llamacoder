import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const FILE_PATH_EXTENSIONS = "tsx|ts|jsx|js|css|json|mjs|cjs|md|mdx|prisma";
const GENERATED_FILE_RE = /^file\.(?:txt|tsx|ts|jsx|js|css|json|md)$/i;

function cleanGeneratedPath(rawPath: string | undefined | null): string | null {
  if (!rawPath) return null;

  let path = rawPath
    .trim()
    .replace(/^[`'"<({\[]+/, "")
    .replace(/[`'">)},;:\]]+$/g, "")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");

  if (path.startsWith("src/")) path = path.slice(4);
  if (!path || path.includes("..") || /^https?:\/\//i.test(path)) return null;
  if (!new RegExp(`\\.(?:${FILE_PATH_EXTENSIONS})$`, "i").test(path)) return null;

  return path;
}

function extractPathFromLine(line: string): string | null {
  const trimmed = line
    .trim()
    .replace(/^[>\s*\-•]+/, "")
    .replace(/^(?:path|file|filename|route)\s*[:=\-]\s*/i, "")
    .trim();

  if (!trimmed || trimmed.length > 180) return null;

  const quoted = trimmed.match(
    new RegExp("[`'\"]([^`'\"]+\\.(?:" + FILE_PATH_EXTENSIONS + "))[`'\"]", "i"),
  );
  if (quoted) return cleanGeneratedPath(quoted[1]);

  const direct = trimmed.match(
    new RegExp(
      "(^|\\s)(\\/?(?:app|pages|components|lib|hooks|styles|public|utils|types|data|store|server|api|prisma|config|scripts)\\/[A-Za-z0-9_@./()[\\]-]+\\.(?:" +
        FILE_PATH_EXTENSIONS +
        ")|\\/?[A-Za-z0-9_@()[\\]-]+\\/[A-Za-z0-9_@./()[\\]-]+\\.(?:" +
        FILE_PATH_EXTENSIONS +
        ")|[A-Za-z0-9_@()[\\]-]+\\.(?:" +
        FILE_PATH_EXTENSIONS +
        "))($|\\s)",
      "i",
    ),
  );

  const candidate = cleanGeneratedPath(direct?.[2]);
  if (!candidate || GENERATED_FILE_RE.test(candidate)) return null;

  return candidate;
}

function extractPathHintFromText(text: string): string | null {
  const lines = text.split("\n").slice(-8).reverse();
  for (const line of lines) {
    const path = extractPathFromLine(line);
    if (path) return path;
  }
  return null;
}

function consumeTrailingPathHint(lines: string[]): { path: string | null; lines: string[] } {
  const nextLines = [...lines];

  for (let i = nextLines.length - 1; i >= Math.max(0, nextLines.length - 8); i--) {
    const path = extractPathFromLine(nextLines[i] ?? "");
    if (!path) continue;

    const withoutLabel = (nextLines[i] ?? "")
      .trim()
      .replace(/^[>\s*\-•]+/, "")
      .replace(/^(?:path|file|filename|route)\s*[:=\-]\s*/i, "")
      .trim();

    const isPathOnly = withoutLabel.includes(path) && withoutLabel.length <= path.length + 8;
    if (isPathOnly) {
      nextLines.splice(i, 1);
      while (nextLines.length && nextLines[nextLines.length - 1].trim() === "") {
        nextLines.pop();
      }
    }

    return { path, lines: nextLines };
  }

  return { path: null, lines };
}

function inferLanguageFromPath(path: string | null, fallbackLanguage: string): string {
  if (!path) return fallbackLanguage;
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "jsx",
    ts: "ts",
    tsx: "tsx",
    css: "css",
    json: "json",
    md: "markdown",
    mdx: "mdx",
    prisma: "prisma",
    mjs: "javascript",
    cjs: "javascript",
  };
  return map[ext || ""] || fallbackLanguage;
}

// Helper function to parse fence tag for language and path.
// Supports ```tsx{path=app/page.tsx}, ```tsx path="app/page.tsx",
// ```app/page.tsx, and path labels written immediately above the fence.
function parseFenceTag(
  tag: string,
  fallbackPath?: string | null,
): { language: string; path: string } {
  const raw = tag || "";
  const langMatch = raw.trim().match(/^([A-Za-z0-9]+)/);
  const explicitPathMatch = raw.match(
    /(?:path|file|filename)\s*=\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`|([^}\s]+))/i,
  );
  const explicitPath = cleanGeneratedPath(
    explicitPathMatch?.[1] ||
      explicitPathMatch?.[2] ||
      explicitPathMatch?.[3] ||
      explicitPathMatch?.[4],
  );
  const directPath = extractPathFromLine(raw);
  const path = explicitPath || directPath || cleanGeneratedPath(fallbackPath) || null;
  const rawLanguage = langMatch && !langMatch[1].includes("/") ? langMatch[1] : "text";
  const language = inferLanguageFromPath(path, rawLanguage);

  return {
    language,
    path: path || `file.${getExtensionForLanguage(language)}`,
  };
}

export function extractFirstCodeBlock(input: string) {
  const match = input.match(/```([^\n]*)\n([\s\S]*?)\n```/);

  if (match) {
    const fenceTag = match[1] || "";
    const code = match[2];
    const fullMatch = match[0];

    let language: string | null = null;
    let filename: { name: string; extension: string } | null = null;

    const parsed = parseFenceTag(
      fenceTag,
      extractPathHintFromText(input.slice(0, match.index ?? 0)),
    );
    language = parsed.language;
    filename = parseFileName(parsed.path.split("/").pop() || parsed.path);

    return { code, language, filename, fullMatch };
  }
  return null;
}

function uniquifyPath(path: string, existingPaths: Set<string>): string {
  if (!existingPaths.has(path)) return path;

  const dot = path.lastIndexOf(".");
  const base = dot === -1 ? path : path.slice(0, dot);
  const ext = dot === -1 ? "" : path.slice(dot);
  let index = 2;
  let next = `${base}-${index}${ext}`;

  while (existingPaths.has(next)) {
    index += 1;
    next = `${base}-${index}${ext}`;
  }

  return next;
}

function finalizeGeneratedPath(
  path: string,
  language: string,
  code: string,
  existingPaths: Set<string>,
): string {
  let finalPath = path;

  if (GENERATED_FILE_RE.test(finalPath)) {
    const filename = generateIntelligentFilename(code, language);
    finalPath = `${filename.name}.${filename.extension}`;
  }

  finalPath = cleanGeneratedPath(finalPath) || `file.${getExtensionForLanguage(language)}`;
  finalPath = uniquifyPath(finalPath, existingPaths);
  existingPaths.add(finalPath);

  return finalPath;
}

export function extractAllCodeBlocks(input: string): Array<{
  code: string;
  language: string;
  path: string;
  fullMatch: string;
}> {
  const codeBlockRegex = /```([^\n]*)\n([\s\S]*?)\n```/g;
  const files: Array<{
    code: string;
    language: string;
    path: string;
    fullMatch: string;
  }> = [];
  const existingPaths = new Set<string>();

  let match;
  let lastIndex = 0;
  while ((match = codeBlockRegex.exec(input)) !== null) {
    const fenceTag = match[1] || "";
    const code = match[2];
    const fullMatch = match[0];
    const pathHint = extractPathHintFromText(input.slice(lastIndex, match.index));
    const { language, path } = parseFenceTag(fenceTag, pathHint);
    const finalPath = finalizeGeneratedPath(path, language, code, existingPaths);

    files.push({ code, language, path: finalPath, fullMatch });
    lastIndex = match.index + fullMatch.length;
  }

  return files;
}

function parseFileName(fileName: string): { name: string; extension: string } {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex === -1) {
    return { name: fileName, extension: "" };
  }
  return {
    name: fileName.slice(0, lastDotIndex),
    extension: fileName.slice(lastDotIndex + 1),
  };
}

// Parse an assistant reply into ordered text and file segments.
// Supports multiple files per reply and interleaved text. Streaming-safe: returns
// a partial file segment if the closing fence has not arrived yet.
export type ReplySegment =
  | { type: "text"; content: string }
  | {
      type: "file";
      code: string;
      language: string;
      path: string;
      isPartial: boolean;
    };

export function parseReplySegments(markdown: string): ReplySegment[] {
  const segments: ReplySegment[] = [];
  const lines = markdown.split("\n");
  const fenceRegex = /^```([^\n]*)$/;

  let textBuffer: string[] = [];
  let codeBuffer: string[] = [];
  let openTag: string | null = null;
  let openPathHint: string | null = null;

  const existingPaths = () =>
    new Set(
      segments
        .filter((segment): segment is Extract<ReplySegment, { type: "file" }> => segment.type === "file")
        .map((segment) => segment.path),
    );

  const flushText = () => {
    if (textBuffer.length > 0) {
      segments.push({ type: "text", content: textBuffer.join("\n") });
      textBuffer = [];
    }
  };

  for (const line of lines) {
    const match = line.match(fenceRegex);
    if (match && !openTag) {
      const consumed = consumeTrailingPathHint(textBuffer);
      textBuffer = consumed.lines;
      openPathHint = consumed.path;
      openTag = match[1] || "";
      flushText();
      codeBuffer = [];
    } else if (match && openTag) {
      const { language, path } = parseFenceTag(openTag, openPathHint);
      const code = codeBuffer.join("\n");
      segments.push({
        type: "file",
        code,
        language,
        path: finalizeGeneratedPath(path, language, code, existingPaths()),
        isPartial: false,
      });
      openTag = null;
      openPathHint = null;
      codeBuffer = [];
    } else if (openTag) {
      codeBuffer.push(line);
    } else {
      textBuffer.push(line);
    }
  }

  if (openTag) {
    const { language, path } = parseFenceTag(openTag, openPathHint);
    const code = codeBuffer.join("\n");
    segments.push({
      type: "file",
      code,
      language,
      path: finalizeGeneratedPath(path, language, code, existingPaths()),
      isPartial: true,
    });
  } else {
    flushText();
  }

  return segments.filter(
    (r) => r.type !== "text" || (r.type === "text" && r.content.length > 0),
  );
}

// Enhanced filename generation for when models do not provide filenames.
export function generateIntelligentFilename(
  content: string,
  language: string,
): { name: string; extension: string } {
  const pathFromFirstLine = extractPathFromLine((content ?? "").split("\n", 1)[0] || "");
  if (pathFromFirstLine) return parseFileName(pathFromFirstLine.split("/").pop() || pathFromFirstLine);

  const patterns = [
    /export\s+default\s+(?:function\s+)?(\w+)/i,
    /function\s+(\w+)\s*\(/i,
    /const\s+(\w+)\s*=\s*\(/i,
    /class\s+(\w+)/i,
    /component\s*:\s*(\w+)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const name = match[1];
      const kebabName = name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
      return { name: kebabName, extension: getExtensionForLanguage(language) };
    }
  }

  return { name: `component`, extension: getExtensionForLanguage(language) };
}

export function getExtensionForLanguage(language: string): string {
  const extensions: Record<string, string> = {
    javascript: "js",
    js: "js",
    typescript: "tsx",
    ts: "ts",
    tsx: "tsx",
    jsx: "jsx",
    python: "py",
    py: "py",
    html: "html",
    css: "css",
    json: "json",
    markdown: "md",
    md: "md",
    mdx: "mdx",
    sql: "sql",
    prisma: "prisma",
    bash: "sh",
    sh: "sh",
    yaml: "yaml",
    yml: "yml",
  };

  return extensions[language.toLowerCase()] || "txt";
}

export function getLanguageOfFile(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase();
  const languages: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    tsx: "typescript",
    jsx: "javascript",
    py: "python",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    sql: "sql",
    sh: "shell",
    yaml: "yaml",
    yml: "yaml",
  };
  return languages[extension || ""] || "plaintext";
}

export function getMonacoLanguage(language: string): string {
  const map: Record<string, string> = {
    js: "javascript",
    javascript: "javascript",
    ts: "typescript",
    typescript: "typescript",
    tsx: "typescript",
    jsx: "javascript",
    py: "python",
    python: "python",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    markdown: "markdown",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    yaml: "yaml",
    yml: "yaml",
  };
  return map[language.toLowerCase()] || "plaintext";
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toTitleCase(rawName: string): string {
  const parts = rawName.split(/[-_]+/);
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
