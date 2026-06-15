"use client";

import {
  Code2,
  Copy,
  Database,
  Download,
  Eye,
  FileCode2,
  FilePlus2,
  Files,
  Folder,
  FolderPlus,
  GitCompareArrows,
  Image as ImageIcon,
  Inspect,
  Loader2,
  MousePointer2,
  Package,
  PaintBucket,
  PanelLeftClose,
  RefreshCw,
  Replace,
  Save,
  Search,
  SquareTerminal,
  Trash2,
  Type,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import {
  copyWorkspaceFile,
  createWorkspaceFile,
  createWorkspaceFolder,
  refreshWorkspaceFiles,
  saveWorkspaceFiles,
  syncWorkspaceFiles,
  type WorkspaceFile,
} from "@/app/actions/project-files";
import BuilderTerminal from "@/components/builder-terminal";

import { Tip, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { extractAllCodeBlocks, parseReplySegments } from "@/lib/utils";
import type { Chat, Message } from "./page";

const CodeRunner = dynamic(() => import("@/components/code-runner"), { ssr: false });
const CodeEditor = dynamic(() => import("@/components/code-editor"), { ssr: false });

type ViewerFile = { path: string; code: string; language: string; isPartial?: boolean; updatedAt?: string };
type ArtifactTab = "code" | "preview" | "database";
type ActivityTab = "files" | "search" | "extensions" | "changes" | "inspect";
type TreeNode = {
  name: string;
  path: string;
  type: "file" | "folder";
  children: TreeNode[];
};
type ChangeRecord = {
  path: string;
  status: "added" | "modified" | "deleted";
};



const FOLDER_MARKER = ".gitkeep";

export async function downloadFilesAsZip(files: Array<{ path: string; code: string }>, zipName: string) {
  if (files.length === 0) {
    toast({ title: "Nothing to download", description: "No generated files yet.", variant: "destructive" });
    return;
  }

  try {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const file of files) zip.file(file.path.replace(/^\/+/, "") || "App.tsx", file.code ?? "");
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${zipName.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "app"}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast({ title: "Download started" });
  } catch (error) {
    toast({ title: "Download failed", description: error instanceof Error ? error.message : "Could not build zip", variant: "destructive" });
  }
}

function normalizeViewerFile(file: WorkspaceFile | ViewerFile): ViewerFile {
  return {
    path: file.path.replace(/^\/+/, ""),
    code: file.code ?? "",
    language: file.language || "tsx",
    updatedAt: file.updatedAt,
  };
}

function visibleFiles(files: ViewerFile[]) {
  return files.filter((file) => !file.path.endsWith(`/${FOLDER_MARKER}`));
}

function folderPathFromMarker(path: string) {
  return path.endsWith(`/${FOLDER_MARKER}`) ? path.slice(0, -1 * (`/${FOLDER_MARKER}`).length) : path;
}

function buildTree(files: ViewerFile[]) {
  const root: TreeNode = { name: "root", path: "", type: "folder", children: [] };
  const folders = new Map<string, TreeNode>([["", root]]);

  const getFolder = (path: string) => {
    if (folders.has(path)) return folders.get(path)!;
    const parts = path.split("/").filter(Boolean);
    let current = root;
    let currentPath = "";
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      let next = folders.get(currentPath);
      if (!next) {
        next = { name: part, path: currentPath, type: "folder", children: [] };
        current.children.push(next);
        folders.set(currentPath, next);
      }
      current = next;
    }
    return current;
  };

  for (const file of files) {
    const path = file.path.replace(/^\/+/, "");
    const folderMarkerPath = folderPathFromMarker(path);
    if (folderMarkerPath !== path) {
      getFolder(folderMarkerPath);
      continue;
    }

    const parts = path.split("/").filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) continue;
    const parent = getFolder(parts.join("/"));
    if (!parent.children.some((child) => child.path === path)) {
      parent.children.push({ name: fileName, path, type: "file", children: [] });
    }
  }

  const sortTree = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortTree);
  };

  sortTree(root);
  return root.children;
}

function extensionOf(path: string) {
  const name = path.split("/").pop() || "";
  const ext = name.includes(".") ? name.split(".").pop() || "file" : "file";
  return ext.toLowerCase();
}

function languageFromPath(path: string) {
  const extension = extensionOf(path);
  if (extension === "ts" || extension === "tsx") return "tsx";
  if (extension === "js" || extension === "jsx") return "jsx";
  if (extension === "css") return "css";
  if (extension === "json") return "json";
  if (extension === "md") return "md";
  return extension;
}

function fileSizeLabel(code: string) {
  const bytes = new Blob([code]).size;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function countMatches(code: string, query: string) {
  if (!query) return 0;
  return code.toLowerCase().split(query.toLowerCase()).length - 1;
}

function getChanges(baseFiles: ViewerFile[], draftFiles: ViewerFile[]) {
  const base = new Map(visibleFiles(baseFiles).map((file) => [file.path, file]));
  const draft = new Map(visibleFiles(draftFiles).map((file) => [file.path, file]));
  const changes: ChangeRecord[] = [];

  for (const [path, file] of draft) {
    const original = base.get(path);
    if (!original) changes.push({ path, status: "added" });
    else if (original.code !== file.code) changes.push({ path, status: "modified" });
  }

  for (const path of base.keys()) {
    if (!draft.has(path)) changes.push({ path, status: "deleted" });
  }

  return changes.sort((a, b) => a.path.localeCompare(b.path));
}

function appendClassToFirstElement(code: string, classToken: string) {
  if (!classToken.trim()) return code;
  const token = classToken.trim();
  if (code.includes("className=\"")) {
    return code.replace(/className="([^"]*)"/, (_match, classes: string) => `className="${[classes, token].filter(Boolean).join(" ")}"`);
  }
  if (code.includes("className='")) {
    return code.replace(/className='([^']*)'/, (_match, classes: string) => `className='${[classes, token].filter(Boolean).join(" ")}'`);
  }
  return code.replace(/<([a-zA-Z][^\s/>]*)/, `<$1 className="${token}"`);
}

function replaceClassToken(code: string, replacement: string, pattern: RegExp) {
  if (!replacement.trim()) return code;
  return code.replace(/className=(["'])(.*?)\1/g, (_match, quote: string, classes: string) => {
    const nextClasses = classes.split(/\s+/).filter(Boolean).filter((item: string) => !pattern.test(item));
    nextClasses.push(replacement.trim());
    return `className=${quote}${nextClasses.join(" ")}${quote}`;
  });
}

function removeClassToken(code: string, classToken: string) {
  if (!classToken.trim()) return code;
  const token = classToken.trim();
  return code.replace(/className=(["'])(.*?)\1/g, (_match, quote: string, classes: string) => {
    const nextClasses = classes.split(/\s+/).filter(Boolean).filter((item: string) => item !== token);
    return `className=${quote}${nextClasses.join(" ")}${quote}`;
  });
}

function replaceFirstImageSource(code: string, source: string) {
  if (!source.trim()) return code;
  if (/src=(["']).*?\1/.test(code)) {
    return code.replace(/src=(["']).*?\1/, `src="${source.trim()}"`);
  }
  if (/src:\s*(["']).*?\1/.test(code)) {
    return code.replace(/src:\s*(["']).*?\1/, `src: "${source.trim()}"`);
  }
  return code;
}

function insertBeforeLastClosingTag(code: string, snippet: string) {
  if (!snippet.trim()) return code;
  const index = code.lastIndexOf("</");
  if (index === -1) return `${code}\n${snippet.trim()}\n`;
  return `${code.slice(0, index)}\n${snippet.trim()}\n${code.slice(index)}`;
}

export default function CodeViewer({
  chat,
  streamText,
  message,
  activeTab,
  onTabChange,
  onRequestFix,
  onPreviewError,
  onPreviewReady,
  onSaveFiles,
  hideHeaderOnMobile = false,
}: {
  chat: Chat;
  streamText: string;
  message?: Message;
  activeTab: string;
  onTabChange: (value: "code" | "preview" | "database") => void;
  onRequestFix?: (error: string) => void;
  onPreviewError: (error: string) => void;
  onPreviewReady: () => void;
  onSaveFiles: (files: ViewerFile[]) => void;
  hideHeaderOnMobile?: boolean;
}) {
  const currentTab: ArtifactTab = ["code", "preview", "database"].includes(activeTab) ? (activeTab as ArtifactTab) : "code";
  const [isPending, startTransition] = useTransition();
  const getInitialFiles = () => {
    if (!message) return [];
    const stored = message.files as ViewerFile[] | null;
    const existing = stored && Array.isArray(stored) && stored.length > 0 ? stored : extractAllCodeBlocks(message.content);
    return existing.map(normalizeViewerFile);
  };
  const initialFiles = getInitialFiles();
  const [activityTab, setActivityTab] = useState<ActivityTab>("files");
  const [baseFiles, setBaseFiles] = useState<ViewerFile[]>(initialFiles);
  const [draft, setDraft] = useState<ViewerFile[]>(initialFiles);
  const [selectedPath, setSelectedPath] = useState<string | null>(visibleFiles(initialFiles)[0]?.path ?? null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [createIntent, setCreateIntent] = useState<"file" | "folder" | null>(null);
  const [createPath, setCreatePath] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceValue, setReplaceValue] = useState("");
  const [extensionFilter, setExtensionFilter] = useState<string | null>(null);
  const [extraDependencies, setExtraDependencies] = useState<Record<string, string>>({});
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [refresh, setRefresh] = useState(0);

  const streamedFiles = useMemo<ViewerFile[]>(() => parseReplySegments(streamText)
    .filter((segment) => segment.type === "file")
    .map((segment) => ({ path: segment.path.replace(/^\/+/, ""), code: segment.code, language: segment.language, isPartial: segment.isPartial })), [streamText]);

  const seedFiles = useMemo<ViewerFile[]>(() => {
    if (!message) return streamedFiles;
    const stored = message.files as ViewerFile[] | null;
    const existing = stored && Array.isArray(stored) && stored.length > 0 ? stored : extractAllCodeBlocks(message.content);
    if (streamedFiles.length === 0) return existing.map(normalizeViewerFile);
    const map = new Map<string, ViewerFile>();
    existing.map(normalizeViewerFile).forEach((file) => map.set(file.path, file));
    streamedFiles.forEach((file) => map.set(file.path, file));
    return Array.from(map.values());
  }, [message, streamedFiles]);

  const seedKey = useMemo(() => seedFiles.map((file) => `${file.path}:${file.code.length}`).join("|"), [seedFiles]);

  useEffect(() => {
    let cancelled = false;
    const immediateFiles = seedFiles.map(normalizeViewerFile);
    if (immediateFiles.length > 0) {
      setDraft(immediateFiles);
      setSelectedPath((current) => current && immediateFiles.some((file) => file.path === current) ? current : visibleFiles(immediateFiles)[0]?.path ?? null);
      setExpandedFolders((current) => {
        if (current.size > 0) return current;
        return new Set(immediateFiles.flatMap((file) => {
          const parts = folderPathFromMarker(file.path).split("/").filter(Boolean);
          return parts.map((_, index) => parts.slice(0, index + 1).join("/")).slice(0, -1);
        }));
      });
    }
    startTransition(async () => {
      try {
        const synced = await syncWorkspaceFiles(chat.id, seedFiles);
        if (cancelled) return;
        const normalized = synced.map(normalizeViewerFile);
        setBaseFiles(normalized);
        setDraft(normalized);
        setSelectedPath((current) => current && normalized.some((file) => file.path === current) ? current : visibleFiles(normalized)[0]?.path ?? null);
        setExpandedFolders((current) => {
          if (current.size > 0) return current;
          return new Set(normalized.flatMap((file) => {
            const parts = folderPathFromMarker(file.path).split("/").filter(Boolean);
            return parts.map((_, index) => parts.slice(0, index + 1).join("/")).slice(0, -1);
          }));
        });
      } catch (error) {
        if (!cancelled) {
          toast({ title: "Workspace sync failed", description: error instanceof Error ? error.message : "Could not load project files", variant: "destructive" });
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [chat.id, seedKey]);

  const filteredDraft = useMemo(() => {
    if (!extensionFilter) return draft;
    return draft.filter((file) => file.path.endsWith(`/${FOLDER_MARKER}`) || extensionOf(file.path) === extensionFilter);
  }, [draft, extensionFilter]);

  const selectedFile = visibleFiles(draft).find((file) => file.path === selectedPath) ?? visibleFiles(draft)[0] ?? null;
  const runnerFiles = visibleFiles(draft).map((file) => ({ path: file.path, content: file.code ?? "" }));
  const databaseFiles = visibleFiles(draft).filter((file) => {
    const lower = file.path.toLowerCase();
    return lower.includes("schema.prisma") || lower.includes("migration") || lower.endsWith(".sql") || lower.includes("supabase") || lower.includes("database");
  });
  const tree = useMemo(() => buildTree(filteredDraft), [filteredDraft]);
  const changes = useMemo(() => getChanges(baseFiles, draft), [baseFiles, draft]);
  const dirty = changes.length > 0;
  const extensionStats = useMemo(() => {
    const stats = new Map<string, number>();
    visibleFiles(draft).forEach((file) => stats.set(extensionOf(file.path), (stats.get(extensionOf(file.path)) ?? 0) + 1));
    return Array.from(stats.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [draft]);
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return visibleFiles(draft)
      .map((file) => ({ path: file.path, matches: countMatches(file.code, searchQuery.trim()) }))
      .filter((result) => result.matches > 0);
  }, [draft, searchQuery]);

  const runBackendAction = (action: () => Promise<ViewerFile[] | WorkspaceFile[]>, success?: string) => {
    startTransition(async () => {
      try {
        const result = (await action()).map(normalizeViewerFile);
        setBaseFiles(result);
        setDraft(result);
        if (success) toast({ title: success });
      } catch (error) {
        toast({ title: "Workspace action failed", description: error instanceof Error ? error.message : "The action could not complete", variant: "destructive" });
      }
    });
  };

  const handleRefresh = () => {
    runBackendAction(() => refreshWorkspaceFiles(chat.id), "Explorer refreshed");
  };

  const handleCreateSubmit = () => {
    if (!createIntent || !createPath.trim()) return;
    const nextPath = createPath.trim();
    runBackendAction(
      () => createIntent === "file" ? createWorkspaceFile(chat.id, nextPath) : createWorkspaceFolder(chat.id, nextPath),
      createIntent === "file" ? "File created" : "Folder created",
    );
    setSelectedPath(createIntent === "file" ? nextPath.replace(/^\/+/, "") : selectedPath);
    setCreateIntent(null);
    setCreatePath("");
  };

  const handleCopySelected = async () => {
    if (!selectedFile) {
      toast({ title: "Select a file first", variant: "destructive" });
      return;
    }
    const target = window.prompt("Copy file to", selectedFile.path.replace(/(\.[^/.]+)?$/, ".copy$1"));
    if (!target) return;
    runBackendAction(() => copyWorkspaceFile(chat.id, selectedFile.path, target), "File copied");
    setSelectedPath(target.replace(/^\/+/, ""));
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = (await saveWorkspaceFiles(chat.id, draft)).map(normalizeViewerFile);
        setBaseFiles(result);
        setDraft(result);
        onSaveFiles(visibleFiles(result));
        toast({ title: "Saved", description: "Workspace files persisted to the backend." });
      } catch (error) {
        toast({ title: "Save failed", description: error instanceof Error ? error.message : "Could not save workspace files", variant: "destructive" });
      }
    });
  };

  const replaceInFile = (path: string) => {
    if (!searchQuery) return;
    setDraft((list) => list.map((file) => file.path === path ? { ...file, code: file.code.split(searchQuery).join(replaceValue) } : file));
    setActivityTab("changes");
  };

  const replaceEverywhere = () => {
    if (!searchQuery) return;
    setDraft((list) => list.map((file) => ({ ...file, code: file.path.endsWith(`/${FOLDER_MARKER}`) ? file.code : file.code.split(searchQuery).join(replaceValue) })));
    setActivityTab("changes");
  };

  const upsertDraftFile = (path: string, code = "") => {
    const nextPath = path.replace(/^\/+/, "").trim();
    if (!nextPath) return;
    setDraft((list) => {
      if (list.some((file) => file.path === nextPath)) {
        return list.map((file) => file.path === nextPath ? { ...file, code } : file);
      }
      return [...list, { path: nextPath, code, language: languageFromPath(nextPath) }];
    });
    setSelectedPath(nextPath.endsWith(`/${FOLDER_MARKER}`) ? selectedPath : nextPath);
    setActivityTab("changes");
  };

  const deleteDraftFile = (path: string) => {
    setDraft((list) => list.filter((file) => file.path !== path));
    setSelectedPath((current) => current === path ? visibleFiles(draft).find((file) => file.path !== path)?.path ?? null : current);
    setActivityTab("changes");
  };

  const mutateDraftFile = (path: string, mutate: (code: string) => string, success: string) => {
    setDraft((list) => list.map((file) => file.path === path ? { ...file, code: mutate(file.code) } : file));
    setSelectedPath(path);
    setActivityTab("changes");
    toast({ title: success, description: "Preview will reload from the edited code." });
  };

  const tabs: Array<{ value: ArtifactTab; label: string; icon: React.ReactNode }> = [
    { value: "code", label: "Code", icon: <Code2 className="size-3.5" /> },
    { value: "preview", label: "Preview", icon: <Eye className="size-3.5" /> },
    { value: "database", label: "Database", icon: <Database className="size-3.5" /> },
  ];

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
        <div className={`${hideHeaderOnMobile ? "hidden md:flex" : "flex"} h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-2 text-sm`}>
          <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto" role="tablist" aria-label="Artifact view">
            {tabs.map((tab) => (
              <button key={tab.value} type="button" role="tab" aria-selected={currentTab === tab.value} onClick={() => onTabChange(tab.value)} className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${currentTab === tab.value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}>
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Tip label="Download zip">
              <button type="button" onClick={() => void downloadFilesAsZip(visibleFiles(draft), chat.title || "app")} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" aria-label="Download zip">
                <Download className="size-3.5" />
              </button>
            </Tip>
            <Tip label="Refresh preview">
              <button type="button" onClick={() => setRefresh((value) => value + 1)} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" aria-label="Refresh preview">
                <RefreshCw className="size-3.5" />
              </button>
            </Tip>
            {dirty && (
              <button type="button" onClick={handleSave} disabled={isPending} className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground disabled:opacity-60" aria-label="Save changes">
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                <span className="hidden sm:inline">Save</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {currentTab === "code" && (
            <CodeTab
              activityTab={activityTab}
              baseFiles={baseFiles}
              changes={changes}
              createIntent={createIntent}
              createPath={createPath}
              draft={draft}
              expandedFolders={expandedFolders}
              extensionFilter={extensionFilter}
              extensionStats={extensionStats}
              isPending={isPending}
              replaceValue={replaceValue}
              searchQuery={searchQuery}
              searchResults={searchResults}
              selectedFile={selectedFile}
              selectedPath={selectedPath}
              terminalOpen={terminalOpen}
              tree={tree}
              onActivityChange={setActivityTab}
              onChange={(code) => {
                if (!selectedFile) return;
                setDraft((list) => list.map((file) => file.path === selectedFile.path ? { ...file, code } : file));
              }}
              onCollapseAll={() => setExpandedFolders(new Set())}
              onCopySelected={handleCopySelected}
              onCreateIntentChange={setCreateIntent}
              onCreatePathChange={setCreatePath}
              onCreateSubmit={handleCreateSubmit}
              onExtensionFilterChange={setExtensionFilter}
              onInspectSelected={() => setActivityTab("inspect")}
              onRefresh={handleRefresh}
              onReplaceAll={replaceEverywhere}
              onReplaceFile={replaceInFile}
              onReplaceValueChange={setReplaceValue}
              onSearchQueryChange={setSearchQuery}
              onSelect={setSelectedPath}
              onTerminalCreateFile={upsertDraftFile}
              onTerminalDeleteFile={deleteDraftFile}
              onTerminalInstall={(pkg, version = "latest") => {
                setExtraDependencies((current) => ({ ...current, [pkg]: version }));
                setRefresh((value) => value + 1);
              }}
              onTerminalToggle={() => setTerminalOpen((open) => !open)}
              onToggleFolder={(path) => setExpandedFolders((current) => {
                const next = new Set(current);
                if (next.has(path)) next.delete(path);
                else next.add(path);
                return next;
              })}
              previewDependencies={extraDependencies}
            />
          )}

          {runnerFiles.length > 0 ? (
            <div
              className={
                currentTab === "preview"
                  ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                  : "hidden"
              }
              aria-hidden={currentTab !== "preview"}
            >
              <PreviewInspectorTab
                files={visibleFiles(draft)}
                refresh={refresh}
                runnerFiles={runnerFiles}
                selectedFile={selectedFile}
                streamText={streamText}
                extraDependencies={extraDependencies}
                onCreateFile={upsertDraftFile}
                onDeleteFile={deleteDraftFile}
                onMutateFile={mutateDraftFile}
                onPreviewError={onPreviewError}
                onPreviewReady={onPreviewReady}
                onRequestFix={onRequestFix}
                onSelect={setSelectedPath}
              />
            </div>
          ) : currentTab === "preview" ? (
            <EmptyState isStreaming={Boolean(streamText)} />
          ) : null}
          {currentTab === "database" && <DatabaseTab files={databaseFiles} totalFiles={visibleFiles(draft).length} />}
        </div>

        <div className="flex h-7 shrink-0 items-center gap-3 border-t border-border px-3 text-[11px] text-muted-foreground">
          <span>{visibleFiles(draft).length} files</span>
          <span>{extensionStats.length} extensions</span>
          {dirty && <button type="button" onClick={() => setActivityTab("changes")} className="text-amber-500 hover:underline">{changes.length} change{changes.length === 1 ? "" : "s"}</button>}
          <div className="flex-1" />
          <span className={streamText ? "text-amber-500" : "text-emerald-500"}>{streamText ? "Generating" : "Live"}</span>
        </div>
      </div>
    </TooltipProvider>
  );
}

function CodeTab({
  activityTab,
  baseFiles,
  changes,
  createIntent,
  createPath,
  draft,
  expandedFolders,
  extensionFilter,
  extensionStats,
  isPending,
  replaceValue,
  searchQuery,
  searchResults,
  selectedFile,
  selectedPath,
  terminalOpen,
  tree,
  onActivityChange,
  onChange,
  onCollapseAll,
  onCopySelected,
  onCreateIntentChange,
  onCreatePathChange,
  onCreateSubmit,
  onExtensionFilterChange,
  onInspectSelected,
  onRefresh,
  onReplaceAll,
  onReplaceFile,
  onReplaceValueChange,
  onSearchQueryChange,
  onSelect,
  onTerminalCreateFile,
  onTerminalDeleteFile,
  onTerminalInstall,
  onTerminalToggle,
  onToggleFolder,
  previewDependencies,
}: {
  activityTab: ActivityTab;
  baseFiles: ViewerFile[];
  changes: ChangeRecord[];
  createIntent: "file" | "folder" | null;
  createPath: string;
  draft: ViewerFile[];
  expandedFolders: Set<string>;
  extensionFilter: string | null;
  extensionStats: Array<[string, number]>;
  isPending: boolean;
  replaceValue: string;
  searchQuery: string;
  searchResults: Array<{ path: string; matches: number }>;
  selectedFile: ViewerFile | null;
  selectedPath: string | null;
  terminalOpen: boolean;
  tree: TreeNode[];
  onActivityChange: (tab: ActivityTab) => void;
  onChange: (code: string) => void;
  onCollapseAll: () => void;
  onCopySelected: () => void;
  onCreateIntentChange: (intent: "file" | "folder" | null) => void;
  onCreatePathChange: (path: string) => void;
  onCreateSubmit: () => void;
  onExtensionFilterChange: (extension: string | null) => void;
  onInspectSelected: () => void;
  onRefresh: () => void;
  onReplaceAll: () => void;
  onReplaceFile: (path: string) => void;
  onReplaceValueChange: (value: string) => void;
  onSearchQueryChange: (query: string) => void;
  onSelect: (path: string) => void;
  onTerminalCreateFile: (path: string, code?: string) => void;
  onTerminalDeleteFile: (path: string) => void;
  onTerminalInstall: (pkg: string, version?: string) => void;
  onTerminalToggle: () => void;
  onToggleFolder: (path: string) => void;
  previewDependencies: Record<string, string>;
}) {
  const activityItems: Array<{ value: ActivityTab; label: string; icon: React.ReactNode }> = [
    { value: "files", label: "Explorer", icon: <Files className="size-4" /> },
    { value: "search", label: "Search and replace", icon: <Search className="size-4" /> },
    { value: "extensions", label: "Extensions", icon: <Package className="size-4" /> },
    { value: "changes", label: "Changes", icon: <GitCompareArrows className="size-4" /> },
    { value: "inspect", label: "Inspect", icon: <Inspect className="size-4" /> },
  ];

  const explorerPanel = (
      <aside className="flex h-full min-h-0 border-border bg-card sm:border-r" aria-label="Code workspace controls">
        <div className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-border py-2">
          {activityItems.map((item) => (
            <Tip key={item.value} label={item.label} side="right">
              <button type="button" onClick={() => onActivityChange(item.value)} className={`inline-flex size-8 items-center justify-center rounded-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${activityTab === item.value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"}`} aria-label={item.label}>
                {item.icon}
              </button>
            </Tip>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <WorkspacePanelHeader
            activityTab={activityTab}
            createIntent={createIntent}
            isPending={isPending}
            onCollapseAll={onCollapseAll}
            onCopySelected={onCopySelected}
            onCreateIntentChange={onCreateIntentChange}
            onInspectSelected={onInspectSelected}
            onRefresh={onRefresh}
          />

          {createIntent && (
            <form
              className="border-b border-border p-2"
              onSubmit={(event) => {
                event.preventDefault();
                onCreateSubmit();
              }}
            >
              <input
                autoFocus
                value={createPath}
                onChange={(event) => onCreatePathChange(event.target.value)}
                placeholder={createIntent === "file" ? "app/page.tsx" : "components/ui"}
                className="h-8 w-full rounded-md border border-border bg-background px-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </form>
          )}

          <div className="min-h-0 flex-1 overflow-auto">
            {activityTab === "files" && (
              <div className="py-2">
                {extensionFilter && (
                  <button type="button" onClick={() => onExtensionFilterChange(null)} className="mx-2 mb-2 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
                    Showing .{extensionFilter} files
                  </button>
                )}
                {tree.length > 0 ? tree.map((node) => (
                  <TreeNodeRow key={node.path} node={node} level={0} expandedFolders={expandedFolders} selectedPath={selectedPath} onSelect={onSelect} onToggleFolder={onToggleFolder} />
                )) : (
                  <p className="p-4 text-sm text-muted-foreground">No workspace files yet.</p>
                )}
              </div>
            )}

            {activityTab === "search" && (
              <SearchPanel
                replaceValue={replaceValue}
                searchQuery={searchQuery}
                searchResults={searchResults}
                onReplaceAll={onReplaceAll}
                onReplaceFile={onReplaceFile}
                onReplaceValueChange={onReplaceValueChange}
                onSearchQueryChange={onSearchQueryChange}
                onSelect={onSelect}
              />
            )}

            {activityTab === "extensions" && (
              <ExtensionsPanel extensionFilter={extensionFilter} extensionStats={extensionStats} onExtensionFilterChange={onExtensionFilterChange} />
            )}

            {activityTab === "changes" && (
              <ChangesPanel baseFiles={baseFiles} changes={changes} draft={draft} onSelect={onSelect} />
            )}

            {activityTab === "inspect" && (
              <InspectPanel selectedFile={selectedFile} />
            )}
          </div>
        </div>
      </aside>
  );

  const editorPanel = (
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" aria-label="Code editor">
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-card px-3 text-xs">
          <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">{selectedFile?.path ?? "No file selected"}</span>
          <Tip label={terminalOpen ? "Hide terminal" : "Show terminal"}>
            <button type="button" onClick={onTerminalToggle} className={`inline-flex size-7 items-center justify-center rounded-md hover:bg-accent hover:text-foreground ${terminalOpen ? "text-foreground" : "text-muted-foreground"}`} aria-label={terminalOpen ? "Hide terminal" : "Show terminal"}>
              <SquareTerminal className="size-3.5" />
            </button>
          </Tip>
          {selectedFile && (
            <>
              <Tip label="Copy file contents">
                <button type="button" onClick={() => void navigator.clipboard.writeText(selectedFile.code)} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Copy file contents">
                  <Copy className="size-3.5" />
                </button>
              </Tip>
              <Tip label="Inspect selected file">
                <button type="button" onClick={onInspectSelected} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Inspect selected file">
                  <Inspect className="size-3.5" />
                </button>
              </Tip>
            </>
          )}
        </div>
        {terminalOpen ? (
          <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
            <ResizablePanel defaultSize={75} minSize={30}>
              <div className="h-full overflow-hidden">
                {selectedFile ? <CodeEditor key={selectedFile.path} path={selectedFile.path} value={selectedFile.code} onChange={onChange} /> : <EmptyState isStreaming={false} />}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={25} minSize="112px" maxSize="420px">
              <div className="h-full border-t border-border">
                <BuilderTerminal
                  deps={previewDependencies}
                  files={visibleFiles(draft)}
                  onCreateFile={onTerminalCreateFile}
                  onDeleteFile={onTerminalDeleteFile}
                  onInstall={onTerminalInstall}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="min-h-0 flex-1 overflow-hidden">
            {selectedFile ? <CodeEditor key={selectedFile.path} path={selectedFile.path} value={selectedFile.code} onChange={onChange} /> : <EmptyState isStreaming={false} />}
          </div>
        )}
      </section>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:hidden">
        <div className="max-h-[40%] shrink-0 overflow-hidden border-b border-border">
          {explorerPanel}
        </div>
        {editorPanel}
      </div>

      <ResizablePanelGroup
        orientation="horizontal"
        className="hidden min-h-0 flex-1 sm:flex"
      >
        <ResizablePanel
          id="explorer-panel"
          defaultSize="22%"
          minSize="240px"
          maxSize="420px"
          className="min-h-0"
        >
          {explorerPanel}
        </ResizablePanel>
        <ResizableHandle withHandle className="w-1.5" />
        <ResizablePanel id="editor-panel" minSize="40%" className="min-h-0">
          {editorPanel}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function WorkspacePanelHeader({
  activityTab,
  createIntent,
  isPending,
  onCollapseAll,
  onCopySelected,
  onCreateIntentChange,
  onInspectSelected,
  onRefresh,
}: {
  activityTab: ActivityTab;
  createIntent: "file" | "folder" | null;
  isPending: boolean;
  onCollapseAll: () => void;
  onCopySelected: () => void;
  onCreateIntentChange: (intent: "file" | "folder" | null) => void;
  onInspectSelected: () => void;
  onRefresh: () => void;
}) {
  const title = activityTab === "files" ? "Rebuild chat page" : activityTab === "search" ? "Search" : activityTab === "extensions" ? "Extensions" : activityTab === "changes" ? "Changes" : "Inspect";

  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
      <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="flex shrink-0 items-center gap-0.5">
        <Tip label="New file">
          <button type="button" onClick={() => onCreateIntentChange(createIntent === "file" ? null : "file")} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Create file">
            <FilePlus2 className="size-3.5" />
          </button>
        </Tip>
        <Tip label="New folder">
          <button type="button" onClick={() => onCreateIntentChange(createIntent === "folder" ? null : "folder")} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Create folder">
            <FolderPlus className="size-3.5" />
          </button>
        </Tip>
        <Tip label="Refresh explorer from backend">
          <button type="button" onClick={onRefresh} disabled={isPending} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50" aria-label="Refresh explorer">
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          </button>
        </Tip>
        <Tip label="Collapse folders">
          <button type="button" onClick={onCollapseAll} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Collapse folders">
            <PanelLeftClose className="size-3.5" />
          </button>
        </Tip>
        <Tip label="Copy selected file">
          <button type="button" onClick={onCopySelected} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Copy selected file">
            <Copy className="size-3.5" />
          </button>
        </Tip>
        <Tip label="Inspect selected file">
          <button type="button" onClick={onInspectSelected} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Inspect selected file">
            <Inspect className="size-3.5" />
          </button>
        </Tip>
      </div>
    </div>
  );
}

function TreeNodeRow({
  node,
  level,
  expandedFolders,
  selectedPath,
  onSelect,
  onToggleFolder,
}: {
  node: TreeNode;
  level: number;
  expandedFolders: Set<string>;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onToggleFolder: (path: string) => void;
}) {
  const isExpanded = expandedFolders.has(node.path);
  const isFile = node.type === "file";
  return (
    <div>
      <button
        type="button"
        onClick={() => isFile ? onSelect(node.path) : onToggleFolder(node.path)}
        className={`flex h-7 w-full items-center gap-1.5 px-2 text-left text-xs transition hover:bg-accent/60 hover:text-foreground ${selectedPath === node.path ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
        style={{ paddingLeft: `${level * 12 + 10}px` }}
      >
        {isFile ? <FileCode2 className="size-3.5 shrink-0" /> : <Folder className="size-3.5 shrink-0" />}
        <span className="min-w-0 flex-1 truncate font-mono">{node.name}</span>
      </button>
      {!isFile && isExpanded && node.children.map((child) => (
        <TreeNodeRow key={child.path} node={child} level={level + 1} expandedFolders={expandedFolders} selectedPath={selectedPath} onSelect={onSelect} onToggleFolder={onToggleFolder} />
      ))}
    </div>
  );
}

function SearchPanel({
  replaceValue,
  searchQuery,
  searchResults,
  onReplaceAll,
  onReplaceFile,
  onReplaceValueChange,
  onSearchQueryChange,
  onSelect,
}: {
  replaceValue: string;
  searchQuery: string;
  searchResults: Array<{ path: string; matches: number }>;
  onReplaceAll: () => void;
  onReplaceFile: (path: string) => void;
  onReplaceValueChange: (value: string) => void;
  onSearchQueryChange: (query: string) => void;
  onSelect: (path: string) => void;
}) {
  return (
    <div className="space-y-2 p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-2.5 size-3.5 text-muted-foreground" />
        <input value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} placeholder="Search files" className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      <div className="relative">
        <Replace className="pointer-events-none absolute left-2 top-2.5 size-3.5 text-muted-foreground" />
        <input value={replaceValue} onChange={(event) => onReplaceValueChange(event.target.value)} placeholder="Replace with" className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      <button type="button" onClick={onReplaceAll} disabled={!searchQuery || searchResults.length === 0} className="h-8 w-full rounded-md border border-border text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50">
        Replace all matches
      </button>
      <div className="pt-2">
        {searchResults.map((result) => (
          <div key={result.path} className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent/60">
            <button type="button" onClick={() => onSelect(result.path)} className="min-w-0 flex-1 truncate text-left font-mono text-muted-foreground group-hover:text-foreground">
              {result.path}
            </button>
            <span className="text-muted-foreground">{result.matches}</span>
            <button type="button" onClick={() => onReplaceFile(result.path)} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground">
              Replace
            </button>
          </div>
        ))}
        {searchQuery && searchResults.length === 0 && <p className="p-2 text-xs text-muted-foreground">No matches found.</p>}
      </div>
    </div>
  );
}

function ExtensionsPanel({ extensionFilter, extensionStats, onExtensionFilterChange }: { extensionFilter: string | null; extensionStats: Array<[string, number]>; onExtensionFilterChange: (extension: string | null) => void }) {
  return (
    <div className="p-3">
      <button type="button" onClick={() => onExtensionFilterChange(null)} className={`mb-2 flex w-full items-center justify-between rounded-md px-2 py-2 text-sm ${extensionFilter === null ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}>
        <span>All files</span>
        <span>{extensionStats.reduce((sum, [, count]) => sum + count, 0)}</span>
      </button>
      {extensionStats.map(([extension, count]) => (
        <button key={extension} type="button" onClick={() => onExtensionFilterChange(extension)} className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-sm ${extensionFilter === extension ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}>
          <span className="font-mono">.{extension}</span>
          <span>{count}</span>
        </button>
      ))}
    </div>
  );
}

function ChangesPanel({ baseFiles, changes, draft, onSelect }: { baseFiles: ViewerFile[]; changes: ChangeRecord[]; draft: ViewerFile[]; onSelect: (path: string) => void }) {
  const baseMap = new Map(baseFiles.map((file) => [file.path, file]));
  const draftMap = new Map(draft.map((file) => [file.path, file]));
  return (
    <div className="p-3">
      {changes.length === 0 ? <p className="text-sm text-muted-foreground">No local changes.</p> : changes.map((change) => {
        const file = draftMap.get(change.path) ?? baseMap.get(change.path);
        return (
          <button key={`${change.path}-${change.status}`} type="button" onClick={() => change.status !== "deleted" && onSelect(change.path)} className="mb-2 w-full rounded-md border border-border p-2 text-left hover:bg-accent/40">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-mono text-xs text-foreground">{change.path}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] ${change.status === "added" ? "bg-emerald-500/10 text-emerald-500" : change.status === "deleted" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`}>{change.status}</span>
            </div>
            {file && <p className="mt-1 text-[11px] text-muted-foreground">{fileSizeLabel(file.code)} · {file.code.split("\n").length} lines</p>}
          </button>
        );
      })}
    </div>
  );
}

function InspectPanel({ selectedFile }: { selectedFile: ViewerFile | null }) {
  if (!selectedFile) return <p className="p-3 text-sm text-muted-foreground">Select a file to inspect.</p>;
  const rows = [
    ["Path", selectedFile.path],
    ["Language", selectedFile.language],
    ["Size", fileSizeLabel(selectedFile.code)],
    ["Lines", String(selectedFile.code.split("\n").length)],
    ["Updated", selectedFile.updatedAt ? new Date(selectedFile.updatedAt).toLocaleString() : "Pending save"],
  ];
  return (
    <div className="space-y-3 p-3">
      {rows.map(([label, value]) => (
        <div key={label} className="border-b border-border pb-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 break-words font-mono text-xs text-foreground">{value}</p>
        </div>
      ))}
      <button type="button" onClick={() => void navigator.clipboard.writeText(selectedFile.path)} className="h-8 w-full rounded-md border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
        Copy path
      </button>
    </div>
  );
}

function PreviewInspectorTab({
  files,
  refresh,
  runnerFiles,
  selectedFile,
  streamText,
  extraDependencies,
  onCreateFile,
  onDeleteFile,
  onMutateFile,
  onPreviewError,
  onPreviewReady,
  onRequestFix,
  onSelect,
}: {
  files: ViewerFile[];
  refresh: number;
  runnerFiles: Array<{ path: string; content: string }>;
  selectedFile: ViewerFile | null;
  streamText: string;
  extraDependencies: Record<string, string>;
  onCreateFile: (path: string, code?: string) => void;
  onDeleteFile: (path: string) => void;
  onMutateFile: (path: string, mutate: (code: string) => string, success: string) => void;
  onPreviewError: (error: string) => void;
  onPreviewReady: () => void;
  onRequestFix?: (error: string) => void;
  onSelect: (path: string) => void;
}) {
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [classToken, setClassToken] = useState("");
  const [removeToken, setRemoveToken] = useState("");
  const [fontClass, setFontClass] = useState("font-sans");
  const [textSizeClass, setTextSizeClass] = useState("text-lg");
  const [textColorClass, setTextColorClass] = useState("text-foreground");
  const [backgroundClass, setBackgroundClass] = useState("bg-background");
  const [stylePreset, setStylePreset] = useState("rounded-2xl border border-border shadow-sm");
  const [imageSource, setImageSource] = useState("");
  const [snippetType, setSnippetType] = useState("button");
  const activeFile = selectedFile ?? files[0] ?? null;

  const mutateActiveFile = (mutate: (code: string) => string, success: string) => {
    if (!activeFile) {
      toast({ title: "Select a file first", variant: "destructive" });
      return;
    }
    onMutateFile(activeFile.path, mutate, success);
  };

  const snippets: Record<string, string> = {
    button: '<button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:scale-[1.02]">New action</button>',
    card: '<div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><h3 className="text-lg font-semibold">New card</h3><p className="mt-2 text-sm text-muted-foreground">Edit this card from the visual inspector.</p></div>',
    image: `<img src="${imageSource.trim() || "https://images.unsplash.com/photo-1498050108023-c5249f4df085"}" alt="New visual" className="w-full rounded-2xl object-cover shadow-sm" />`,
    section: '<section className="rounded-[2rem] bg-muted p-8"><p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">New section</p><h2 className="mt-3 text-3xl font-bold">Editable visual block</h2></section>',
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row" role="tabpanel" aria-label="Live preview with visual inspector">
      <div className="relative min-h-[18rem] min-w-0 flex-1 overflow-hidden">
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-xl border border-border bg-background/90 p-1 shadow-sm backdrop-blur">
          <Tip label={inspectorOpen ? "Hide visual editor inspector" : "Open visual editor inspector"}>
            <button type="button" onClick={() => setInspectorOpen((open) => !open)} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition ${inspectorOpen ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`} aria-pressed={inspectorOpen} aria-label="Toggle visual editor inspector">
              <MousePointer2 className="size-3.5" />
              <span className="hidden sm:inline">Inspector</span>
            </button>
          </Tip>
          <span className="hidden max-w-[12rem] truncate font-mono text-[11px] text-muted-foreground sm:block">{activeFile?.path ?? "No file"}</span>
        </div>
        {runnerFiles.length > 0 ? (
          <CodeRunner
            key={refresh}
            extraDependencies={extraDependencies}
            files={runnerFiles}
            onRequestFix={onRequestFix}
            onPreviewError={onPreviewError}
            onPreviewReady={onPreviewReady}
          />
        ) : (
          <EmptyState isStreaming={Boolean(streamText)} />
        )}
      </div>

      {inspectorOpen && (
        <aside className="flex max-h-[48vh] min-h-0 shrink-0 flex-col border-t border-border bg-card lg:max-h-none lg:w-[22rem] lg:border-l lg:border-t-0" aria-label="Visual editor inspector">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
            <MousePointer2 className="size-4 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visual editor inspector</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{activeFile?.path ?? "Select a file"}</p>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-auto p-3">
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Target file</span>
              <select value={activeFile?.path ?? ""} onChange={(event) => onSelect(event.target.value)} className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {files.map((file) => <option key={file.path} value={file.path}>{file.path}</option>)}
              </select>
            </label>

            <div className="rounded-xl border border-border bg-background/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
                <Type className="size-3.5 text-muted-foreground" />
                Text replace
              </div>
              <input value={findText} onChange={(event) => setFindText(event.target.value)} placeholder="Find visible text or code" className="mb-2 h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <input value={replaceText} onChange={(event) => setReplaceText(event.target.value)} placeholder="Replace with" className="mb-2 h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={!findText || !activeFile} onClick={() => mutateActiveFile((code) => code.split(findText).join(replaceText), "Text replaced")} className="h-8 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
                  Replace
                </button>
                <button type="button" disabled={!findText || !activeFile} onClick={() => mutateActiveFile((code) => code.split(findText).join(""), "Text removed")} className="h-8 rounded-md border border-border px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50">
                  Remove
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
                <PaintBucket className="size-3.5 text-muted-foreground" />
                Style controls
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={fontClass} onChange={(event) => setFontClass(event.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs">
                  {["font-sans", "font-serif", "font-mono", "font-bold", "font-semibold"].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <select value={textSizeClass} onChange={(event) => setTextSizeClass(event.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs">
                  {["text-xs", "text-sm", "text-base", "text-lg", "text-xl", "text-2xl", "text-4xl", "text-6xl"].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <select value={textColorClass} onChange={(event) => setTextColorClass(event.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs">
                  {["text-foreground", "text-muted-foreground", "text-white", "text-black", "text-sky-400", "text-emerald-400", "text-amber-300", "text-rose-400"].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <select value={backgroundClass} onChange={(event) => setBackgroundClass(event.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs">
                  {["bg-background", "bg-card", "bg-muted", "bg-white", "bg-black", "bg-sky-500", "bg-emerald-500", "bg-rose-500"].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" disabled={!activeFile} onClick={() => mutateActiveFile((code) => replaceClassToken(code, fontClass, /^(font-|font:|\[font-family:)/), "Font class applied")} className="h-8 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50">Font</button>
                <button type="button" disabled={!activeFile} onClick={() => mutateActiveFile((code) => replaceClassToken(code, textSizeClass, /^text-(xs|sm|base|lg|xl|[2-9]xl)$/), "Text size applied")} className="h-8 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50">Size</button>
                <button type="button" disabled={!activeFile} onClick={() => mutateActiveFile((code) => replaceClassToken(code, textColorClass, /^text-(slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black|foreground|muted-foreground)(-|$)/), "Text color applied")} className="h-8 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50">Text color</button>
                <button type="button" disabled={!activeFile} onClick={() => mutateActiveFile((code) => replaceClassToken(code, backgroundClass, /^bg-(slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black|background|card|muted)(-|$)/), "Background applied")} className="h-8 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50">Background</button>
              </div>
              <input value={classToken} onChange={(event) => setClassToken(event.target.value)} placeholder="Add any Tailwind class or style token" className="mt-2 h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <button type="button" disabled={!classToken || !activeFile} onClick={() => mutateActiveFile((code) => appendClassToFirstElement(code, classToken), "Class added")} className="mt-2 h-8 w-full rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
                Add class to first component
              </button>
              <input value={removeToken} onChange={(event) => setRemoveToken(event.target.value)} placeholder="Remove exact class token" className="mt-2 h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <button type="button" disabled={!removeToken || !activeFile} onClick={() => mutateActiveFile((code) => removeClassToken(code, removeToken), "Class removed")} className="mt-2 h-8 w-full rounded-md border border-border px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50">
                Remove class
              </button>
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
                <ImageIcon className="size-3.5 text-muted-foreground" />
                Add, replace, delete
              </div>
              <input value={imageSource} onChange={(event) => setImageSource(event.target.value)} placeholder="Image URL" className="mb-2 h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <button type="button" disabled={!imageSource || !activeFile} onClick={() => mutateActiveFile((code) => replaceFirstImageSource(code, imageSource), "Image source replaced")} className="mb-2 h-8 w-full rounded-md border border-border px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50">
                Replace first image source
              </button>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <select value={snippetType} onChange={(event) => setSnippetType(event.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs">
                  {Object.keys(snippets).map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <button type="button" disabled={!activeFile} onClick={() => mutateActiveFile((code) => insertBeforeLastClosingTag(code, snippets[snippetType]), "Component inserted")} className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50">
                  Add
                </button>
              </div>
              <select value={stylePreset} onChange={(event) => setStylePreset(event.target.value)} className="mt-2 h-8 w-full rounded-md border border-border bg-background px-2 text-xs">
                {["rounded-2xl border border-border shadow-sm", "rounded-full shadow-lg", "grid gap-4 md:grid-cols-2", "backdrop-blur bg-background/70", "transition hover:scale-[1.02]"].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <button type="button" disabled={!activeFile} onClick={() => mutateActiveFile((code) => appendClassToFirstElement(code, stylePreset), "Style preset applied")} className="mt-2 h-8 w-full rounded-md border border-border px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50">
                Apply style preset
              </button>
              <button type="button" onClick={() => onCreateFile(window.prompt("Create visual file path", "components/NewVisual.tsx") || "", "export function NewVisual() {\n  return <div className=\"rounded-2xl border border-border p-4\">New visual component</div>;\n}\n")} className="mt-2 h-8 w-full rounded-md border border-border px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
                Create component file
              </button>
              <button type="button" disabled={!activeFile} onClick={() => activeFile && onDeleteFile(activeFile.path)} className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1 rounded-md border border-destructive/40 px-2 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50">
                <Trash2 className="size-3.5" />
                Delete selected file
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

function DatabaseTab({ files, totalFiles }: { files: ViewerFile[]; totalFiles: number }) {
  return <div className="flex min-h-0 flex-1 overflow-hidden" role="tabpanel" aria-label="Database view">
    <div className="w-72 shrink-0 border-r border-border p-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Artifact database</p>
      <Metric label="Schema files" value={String(files.length)} />
      <Metric label="Artifact files" value={String(totalFiles)} />
    </div>
    <div className="min-w-0 flex-1 overflow-auto p-4">
      {files.length > 0 ? files.map((file) => <div key={file.path} className="mb-3 border-b border-border pb-3">
        <p className="font-mono text-xs text-foreground">{file.path}</p>
        <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">{file.code}</pre>
      </div>) : <p className="text-sm text-muted-foreground">No database schema files are present in this artifact yet.</p>}
    </div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="mt-4 border-b border-border pb-2">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 truncate font-mono text-xs text-foreground">{value}</p>
  </div>;
}

function EmptyState({ isStreaming }: { isStreaming: boolean }) {
  return <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
    {isStreaming ? <><Loader2 className="size-5 animate-spin" /><p>Generating your app...</p></> : <p>No files yet. Send a prompt to generate an app.</p>}
  </div>;
}


