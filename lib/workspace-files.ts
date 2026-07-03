export type WorkspaceFileInput = {
  path: string;
  code?: string;
  content?: string;
  language?: string;
};

export type CleanWorkspaceFile = {
  path: string;
  content: string;
};

export function cleanWorkspaceFiles(files: WorkspaceFileInput[] = []): CleanWorkspaceFile[] {
  return files
    .map((file) => {
      const path = (file.path || "").replace(/^\/+/, "").trim();
      const content = typeof file.code === "string" ? file.code : file.content || "";
      return { path, content };
    })
    .filter((file) => file.path && !file.path.endsWith(".gitkeep"));
}

export function diffWorkspaceFiles(
  existingPaths: string[],
  incomingFiles: WorkspaceFileInput[] = [],
) {
  const clean = cleanWorkspaceFiles(incomingFiles);
  const incomingPaths = new Set(clean.map((file) => file.path));
  const deletedPaths = existingPaths.filter((path) => !incomingPaths.has(path));
  return {
    clean,
    deletedPaths,
  };
}
