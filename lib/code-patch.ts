export type PatchableFile = {
  path: string;
  code?: string;
  content?: string;
  language?: string;
};

export function normalizePatchFile(file: PatchableFile) {
  const path = (file.path || "App.tsx").replace(/^\/+/, "");
  const code = typeof file.code === "string" ? file.code : file.content || "";
  const language = file.language || path.split(".").pop() || "tsx";
  return { path, code, language };
}

/** Merge patch files onto a base artifact map (diff-style iteration). */
export function mergeArtifactFiles(
  baseFiles: PatchableFile[],
  patchFiles: PatchableFile[],
): PatchableFile[] {
  const fileMap = new Map<string, PatchableFile>();
  baseFiles.forEach((file) => {
    const normalized = normalizePatchFile(file);
    fileMap.set(normalized.path, normalized);
  });
  patchFiles.forEach((file) => {
    const normalized = normalizePatchFile(file);
    fileMap.set(normalized.path, normalized);
  });
  return Array.from(fileMap.values());
}

export const patchModeSystemHint =
  "PATCH MODE: The user is iterating on an existing app. Return ONLY files that must change. Do not regenerate unchanged files. Use exact ```lang{path=...} fences. Keep app/page.tsx renderable.";