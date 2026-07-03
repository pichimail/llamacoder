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
  "PATCH / ITERATION MODE (STRICT): You are improving an EXISTING working application. NEVER delete or omit previously created files unless you are explicitly replacing them with an improved version in this exact response. Return ONLY the files that must be added or changed. Always use fenced blocks with path tags, for example ```tsx{path=app/page.tsx}. Keep app/layout.tsx and all routes working. Never output ellipsis placeholders, TODO stubs, or prose pretending to be code. If the user asks to iterate, build on top of the current structure. Output complete, runnable files for anything you touch.";
