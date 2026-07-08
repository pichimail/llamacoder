import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getPrisma } from "@/lib/prisma";
import { getMainCodingPrompt } from "@/lib/prompts";
import { filesToImportMarkdown, type ImportedRepoFile } from "@/lib/github-repo-import";
import { extractPreviewDependencies } from "@/lib/package-deps";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { requireCurrentUser } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const SKIP_DIR_SEGMENTS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  ".cache",
  ".turbo",
  ".vercel",
  "__MACOSX",
]);

const MAX_ZIP_BYTES = 24 * 1024 * 1024;
const MAX_FILES = 140;
const MAX_FILE_BYTES = 512_000;
const MAX_TOTAL_BYTES = 3_000_000;

const INCLUDE_EXTENSIONS = new Set([
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".mjs",
  ".cjs",
  ".css",
  ".scss",
  ".json",
  ".md",
  ".txt",
  ".html",
  ".vue",
  ".svelte",
  ".py",
  ".go",
  ".rs",
  ".sh",
  ".yml",
  ".yaml",
  ".toml",
  ".env",
  ".example",
]);

function languageFromPath(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() || "txt";
  if (["tsx", "ts", "jsx", "js", "mjs", "cjs"].includes(ext)) return ext;
  if (["css", "scss"].includes(ext)) return "css";
  if (ext === "json") return "json";
  if (ext === "md") return "md";
  if (ext === "html") return "html";
  if (ext === "vue") return "vue";
  if (ext === "svelte") return "svelte";
  if (ext === "py") return "python";
  if (ext === "go") return "go";
  if (ext === "rs") return "rust";
  if (["yml", "yaml"].includes(ext)) return "yaml";
  if (["sh", "bash"].includes(ext)) return "shell";
  return ext;
}

function normalizeZipPath(path: string) {
  const clean = path.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts.length > 1 && !parts[0].includes(".")) return parts.slice(1).join("/");
  return clean;
}

function shouldInclude(path: string) {
  const normalized = normalizeZipPath(path);
  const parts = normalized.split("/");
  if (!normalized || parts.some((part) => SKIP_DIR_SEGMENTS.has(part))) return false;
  if (parts.some((part) => part.startsWith(".") && !part.startsWith(".env"))) return false;

  const basename = parts.at(-1)?.toLowerCase() || "";
  const lower = normalized.toLowerCase();
  const ext = `.${lower.split(".").pop() || ""}`;
  const always = [
    "package.json",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    "bun.lockb",
    "requirements.txt",
    "pyproject.toml",
    "readme.md",
    "vite.config.ts",
    "vite.config.js",
    "next.config.ts",
    "next.config.js",
    "tailwind.config.ts",
    "tailwind.config.js",
    "tsconfig.json",
    ".env.example",
  ];

  if (always.includes(basename)) return true;
  if (!INCLUDE_EXTENSIONS.has(ext) && !INCLUDE_EXTENSIONS.has(basename)) return false;
  if (ext === ".json" && !/(package|tsconfig|app|components|theme|config)/.test(lower)) return false;
  if (ext === ".md" && basename !== "readme.md") return false;
  return true;
}

function detectEnvVars(files: ImportedRepoFile[]) {
  const names = new Set<string>();
  const patterns = [
    /process\.env\.([A-Z0-9_]+)/g,
    /import\.meta\.env\.([A-Z0-9_]+)/g,
    /NEXT_PUBLIC_[A-Z0-9_]+/g,
    /VITE_[A-Z0-9_]+/g,
  ];

  for (const file of files) {
    for (const pattern of patterns) {
      for (const match of file.code.matchAll(pattern)) {
        names.add((match[1] || match[0]).replace(/^process\.env\./, "").replace(/^import\.meta\.env\./, ""));
      }
    }
    if (file.path.toLowerCase().endsWith(".env.example")) {
      for (const line of file.code.split("\n")) {
        const name = line.match(/^([A-Z0-9_]+)=/)?.[1];
        if (name) names.add(name);
      }
    }
  }

  return Array.from(names).sort().slice(0, 24);
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await rateLimitOrThrow(`project-import:${user.id}`, { limit: 8, windowSeconds: 60 });

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Server misconfiguration: missing database URL" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a project .zip file." }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: "Only .zip project archives are supported here." }, { status: 400 });
    }
    if (file.size > MAX_ZIP_BYTES) {
      return NextResponse.json({ error: "Project zip is too large. Keep it under 24 MB." }, { status: 413 });
    }

    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const entries = Object.values(zip.files)
      .filter((entry) => !entry.dir && shouldInclude(entry.name))
      .sort((a, b) => normalizeZipPath(a.name).localeCompare(normalizeZipPath(b.name)))
      .slice(0, MAX_FILES);

    const files: ImportedRepoFile[] = [];
    let totalBytes = 0;
    for (const entry of entries) {
      const code = await entry.async("string").catch(() => "");
      const bytes = new TextEncoder().encode(code).length;
      if (!code || bytes > MAX_FILE_BYTES) continue;
      totalBytes += bytes;
      if (totalBytes > MAX_TOTAL_BYTES) break;
      files.push({
        path: normalizeZipPath(entry.name),
        code,
        language: languageFromPath(entry.name),
      });
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No previewable source files found in this zip." }, { status: 400 });
    }

    const packageFile = files.find((item) => item.path === "package.json" || item.path.endsWith("/package.json"));
    const previewDependencies = packageFile ? extractPreviewDependencies(packageFile.code) : {};
    const envVars = detectEnvVars(files);
    const zipName = file.name.replace(/\.zip$/i, "");
    const title = `${zipName || "Project"} (zip import)`;
    const userPrompt = `Import this uploaded project zip, install the detected dependencies, ask for missing environment variables, and open a live preview.`;
    const envLine = envVars.length
      ? `Detected possible environment variables: ${envVars.map((item) => `\`${item}\``).join(", ")}. Ask for missing values in the chat composer before running features that need them.`
      : "No obvious environment variables were detected.";
    const assistantIntro = [
      `Imported **${file.name}** from a project zip.`,
      `${files.length} source/config files loaded for live preview.`,
      Object.keys(previewDependencies).length
        ? `${Object.keys(previewDependencies).length} dependencies detected from package.json.`
        : "No extra runtime dependencies detected in package.json.",
      envLine,
    ].join(" ");
    const markdown = `${assistantIntro}\n\n${filesToImportMarkdown(files)}`;

    const prisma = getPrisma();
    const project = await prisma.project.create({
      data: {
        name: title,
        description: userPrompt,
        userId: user.id,
      },
    });

    const chat = await prisma.chat.create({
      data: {
        model: "openrouter/auto",
        quality: "low",
        prompt: userPrompt,
        title,
        shadcn: false,
        project: { connect: { id: project.id } },
        messages: {
          create: [
            {
              role: "system",
              content: getMainCodingPrompt("agent", false, false, userPrompt, false),
              position: 0,
            },
            {
              role: "user",
              content: userPrompt,
              position: 1,
              files: [{ kind: "file", filename: file.name, size: file.size }],
            },
            {
              role: "assistant",
              content: markdown,
              position: 2,
              files,
            },
          ],
        },
      },
    });

    await logAudit({ userId: user.id, action: "import-project-zip", resource: "chat", resourceId: chat.id });

    return NextResponse.json({
      id: chat.id,
      chatId: chat.id,
      fileCount: files.length,
      dependencies: previewDependencies,
      envVars,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import project zip." },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 120;
