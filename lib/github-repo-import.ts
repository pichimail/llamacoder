export type GithubFileSpec = {
  owner: string;
  repo: string;
  ref: string;
  path: string;
  filename: string;
  rawUrl: string;
};

export type GithubRepoSpec = {
  owner: string;
  repo: string;
  ref?: string;
};

export type ImportedRepoFile = {
  path: string;
  code: string;
  language: string;
};

const SKIP_DIR_SEGMENTS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "out",
  "coverage",
  ".cache",
  "vendor",
  "__pycache__",
  ".turbo",
  ".vercel",
  ".idea",
  ".vscode",
  "storybook-static",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".css",
  ".json",
  ".md",
  ".mjs",
  ".cjs",
]);

const MAX_REPO_FILES = 120;
const MAX_FILE_BYTES = 512_000;
const MAX_TOTAL_BYTES = 2_500_000;

export function parseGithubFileUrl(input: string): GithubFileSpec | null {
  try {
    const parsed = new URL(input);
    const parts = parsed.pathname.split("/").filter(Boolean);

    if (parsed.hostname === "raw.githubusercontent.com") {
      if (parts.length < 4) return null;
      const [owner, repo, ref, ...rest] = parts;
      const path = rest.join("/");
      if (!path) return null;
      return {
        owner,
        repo,
        ref,
        path,
        filename: rest.at(-1) || "github-file",
        rawUrl: input,
      };
    }

    if (parsed.hostname !== "github.com") return null;
    if (parts.length < 5) return null;
    const [owner, repo, mode, ref, ...rest] = parts;
    if (mode !== "blob" && mode !== "raw") return null;
    const path = rest.join("/");
    if (!path) return null;
    return {
      owner,
      repo,
      ref,
      path,
      filename: rest.at(-1) || "github-file",
      rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`,
    };
  } catch {
    return null;
  }
}

export function parseGithubRepoUrl(input: string): GithubRepoSpec | null {
  try {
    const parsed = new URL(input.trim());
    if (parsed.hostname !== "github.com") return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, "");
    const rest = parts.slice(2);

    if (rest.length === 0) return { owner, repo };

    if (rest[0] === "tree" && rest[1]) {
      return { owner, repo, ref: rest[1] };
    }

    if (rest[0] === "blob" || rest[0] === "raw") return null;

    return { owner, repo };
  } catch {
    return null;
  }
}

export function isGithubRepoUrl(input: string): boolean {
  return parseGithubRepoUrl(input) !== null && parseGithubFileUrl(input) === null;
}

function githubApiHeaders(token?: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "HyperSpeed-GitHub-Import",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function languageFromPath(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() || "txt";
  if (ext === "tsx" || ext === "ts") return ext;
  if (ext === "jsx" || ext === "js" || ext === "mjs" || ext === "cjs") return ext;
  if (ext === "css") return "css";
  if (ext === "json") return "json";
  if (ext === "md") return "md";
  return ext;
}

function shouldIncludeRepoPath(path: string) {
  const normalized = path.replace(/^\/+/, "");
  const segments = normalized.split("/");
  if (segments.some((segment) => SKIP_DIR_SEGMENTS.has(segment))) return false;
  if (segments.some((segment) => segment.startsWith(".") && segment !== ".")) return false;

  const lower = normalized.toLowerCase();
  const ext = `.${lower.split(".").pop() || ""}`;
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;

  if (ext === ".json" && !lower.endsWith("package.json") && !lower.endsWith("tsconfig.json")) {
    return false;
  }

  if (ext === ".md" && !lower.endsWith("readme.md")) return false;

  return true;
}

async function githubJson<T>(url: string, token?: string): Promise<T> {
  const response = await fetch(url, { headers: githubApiHeaders(token) });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `GitHub API error (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function fetchGithubRepoFiles(
  spec: GithubRepoSpec,
  options?: { accessToken?: string },
): Promise<{
  files: ImportedRepoFile[];
  ref: string;
  defaultBranch: string;
  readme?: string;
  packageJson?: Record<string, unknown>;
  repoUrl: string;
}> {
  const token = options?.accessToken || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const apiBase = `https://api.github.com/repos/${spec.owner}/${spec.repo}`;

  const repoMeta = await githubJson<{ default_branch: string }>(apiBase, token);
  const ref = spec.ref || repoMeta.default_branch;

  const refData = await githubJson<{ object: { sha: string } }>(
    `${apiBase}/git/ref/heads/${encodeURIComponent(ref)}`,
    token,
  ).catch(async () => {
    const tagData = await githubJson<{ object: { sha: string } }>(
      `${apiBase}/git/ref/tags/${encodeURIComponent(ref)}`,
      token,
    );
    return tagData;
  });

  const commit = await githubJson<{ tree: { sha: string } }>(
    `${apiBase}/git/commits/${refData.object.sha}`,
    token,
  );

  const tree = await githubJson<{
    tree: Array<{ path?: string; type?: string; size?: number }>;
  }>(`${apiBase}/git/trees/${commit.tree.sha}?recursive=1`, token);

  const blobPaths = (tree.tree || [])
    .filter((entry) => entry.type === "blob" && entry.path && shouldIncludeRepoPath(entry.path))
    .sort((a, b) => {
      const score = (path: string) => {
        if (path === "package.json") return 0;
        if (path.startsWith("app/") || path.startsWith("src/")) return 1;
        if (path.startsWith("components/")) return 2;
        if (path.endsWith("README.md")) return 3;
        return 4;
      };
      return score(a.path!) - score(b.path!);
    })
    .slice(0, MAX_REPO_FILES);

  const files: ImportedRepoFile[] = [];
  let totalBytes = 0;

  for (const entry of blobPaths) {
    const path = entry.path!;
    if ((entry.size ?? 0) > MAX_FILE_BYTES) continue;

    const rawUrl = `https://raw.githubusercontent.com/${spec.owner}/${spec.repo}/${ref}/${path}`;
    const response = await fetch(rawUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) continue;

    const code = await response.text();
    const bytes = new TextEncoder().encode(code).length;
    if (bytes > MAX_FILE_BYTES) continue;
    totalBytes += bytes;
    if (totalBytes > MAX_TOTAL_BYTES) break;

    files.push({
      path: path.replace(/^src\//, ""),
      code,
      language: languageFromPath(path),
    });
  }

  if (files.length === 0) {
    throw new Error("No previewable source files found in this repository.");
  }

  const packageFile = files.find((file) => file.path === "package.json");
  const readmeFile = files.find((file) => file.path.toLowerCase() === "readme.md");

  let packageJson: Record<string, unknown> | undefined;
  if (packageFile) {
    try {
      packageJson = JSON.parse(packageFile.code) as Record<string, unknown>;
    } catch {
      packageJson = undefined;
    }
  }

  return {
    files,
    ref,
    defaultBranch: repoMeta.default_branch,
    readme: readmeFile?.code,
    packageJson,
    repoUrl: `https://github.com/${spec.owner}/${spec.repo}`,
  };
}

export function filesToImportMarkdown(files: ImportedRepoFile[]) {
  return files
    .map(
      (file) =>
        "```" +
        file.language +
        `{path=${file.path}}\n` +
        file.code +
        "\n```",
    )
    .join("\n\n");
}