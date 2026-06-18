const BUILTIN_PREVIEW_PACKAGES = new Set([
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "typescript",
  "@types/react",
  "@types/react-dom",
  "@types/node",
  "next",
  "tailwindcss",
  "postcss",
  "autoprefixer",
  "eslint",
  "eslint-config-next",
]);

function normalizeVersion(version: string) {
  const trimmed = version.trim();
  if (!trimmed || trimmed === "*" || trimmed === "workspace:*") return "latest";
  return trimmed.replace(/^[\^~>=<]+/, "") || "latest";
}

export function extractPreviewDependencies(packageJsonText: string): Record<string, string> {
  try {
    const json = JSON.parse(packageJsonText) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };

    const merged = {
      ...(json.dependencies || {}),
      ...(json.devDependencies || {}),
      ...(json.peerDependencies || {}),
    };

    const result: Record<string, string> = {};
    for (const [name, version] of Object.entries(merged)) {
      if (BUILTIN_PREVIEW_PACKAGES.has(name)) continue;
      if (name.startsWith("@types/")) continue;
      if (name.startsWith("eslint")) continue;
      if (name.includes("tailwindcss")) continue;
      if (name.includes("postcss")) continue;
      if (name.includes("prisma")) continue;
      result[name] = normalizeVersion(version);
    }

    return result;
  } catch {
    return {};
  }
}