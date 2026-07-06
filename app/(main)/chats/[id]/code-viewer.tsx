"use client";

import { DotFlow } from "@/components/ui/dot-flow";
import {
  Boxes,
  CheckCircle2,
  Columns3,
  Copy,
  Download,
  Eye,
  FileCode2,
  FilePlus2,
  FolderPlus,
  LayoutPanelTop,
  Loader2,
  Map as MapIcon,
  MoreHorizontal,
  PackagePlus,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Redo2,
  RefreshCw,
  Save,
  Search,
  Terminal as TerminalIconLucide,
  Trash2,
  Undo2,
  Wand2,
  WrapText,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import BuilderTerminal from "@/components/builder-terminal";
import { Terminal, TerminalHeader, TerminalTitle } from "@/components/ai-elements/terminal";
import { extractPreviewDependencies } from "@/lib/package-deps";
import {
  FileTree,
  FileTreeActions,
  FileTreeFile,
  FileTreeFolder,
  FileTreeIcon,
  FileTreeName,
} from "@/components/ai-elements/file-tree";
import {
  Snippet,
  SnippetAddon,
  SnippetCopyButton,
  SnippetInput,
  SnippetText,
} from "@/components/ai-elements/snippet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Switch } from "@/components/ui/switch";
import { Tip, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import type { PreviewMode } from "@/components/code-runner-react";
import type { SandpackBuildOptions } from "@/lib/sandpack-config";
import { extractAllCodeBlocks, parseReplySegments } from "@/lib/utils";
import type { Chat, Message } from "./page";

const CodeRunner = dynamic(() => import("@/components/code-runner"), { ssr: false });
const CodeEditor = dynamic(() => import("@/components/code-editor"), { ssr: false });

type ViewerFile = {
  path: string;
  code: string;
  language: string;
  isPartial?: boolean;
};

type TreeNode = {
  name: string;
  path: string;
  isFile?: boolean;
  children?: Map<string, TreeNode>;
};

type ExplorerPanel = "files" | "search" | "extensions";
type CodeLayout = "editor" | "split-preview" | "split-editor";

export type AutoFixStatus = "idle" | "watching" | "fixing" | "fallback" | "ready";
export type BuilderStatus = "generating" | "validating" | "fixing" | "rebuilding" | "ready" | "failed";

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
    const link = document.createElement("a");
    link.href = url;
    link.download = `${zipName.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "app"}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast({ title: "Download started" });
  } catch (error) {
    toast({
      title: "Download failed",
      description: error instanceof Error ? error.message : "Could not build zip",
      variant: "destructive",
    });
  }
}

function downloadSingleFile(file: ViewerFile) {
  const blob = new Blob([file.code ?? ""], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.path.split("/").pop() || "file.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function cleanPath(path: string) {
  return path.replace(/^\/+/, "").trim();
}

function languageFromPath(path: string) {
  return path.split(".").pop() || "tsx";
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: new Map() };
  for (const fullPath of paths) {
    const parts = fullPath.split("/").filter(Boolean);
    let node = root;
    let current = "";
    parts.forEach((part, index) => {
      current = current ? `${current}/${part}` : part;
      if (!node.children) node.children = new Map();
      if (!node.children.has(part)) {
        node.children.set(part, {
          name: part,
          path: current,
          isFile: index === parts.length - 1,
          children: index === parts.length - 1 ? undefined : new Map(),
        });
      }
      node = node.children.get(part)!;
    });
  }
  return root;
}

function sortedTreeNodes(node: TreeNode) {
  return Array.from(node.children?.values() ?? []).sort((a, b) =>
    a.isFile === b.isFile ? a.name.localeCompare(b.name) : a.isFile ? 1 : -1,
  );
}

function expandedFromFiles(files: ViewerFile[]) {
  const paths = new Set<string>();
  files.forEach((file) => {
    const parts = file.path.split("/").filter(Boolean);
    let current = "";
    parts.slice(0, -1).forEach((part) => {
      current = current ? `${current}/${part}` : part;
      paths.add(current);
    });
  });
  return paths;
}

function renderFileTree(
  node: TreeNode,
  options: {
    dirty: Set<string>;
    streamingPath?: string | null;
    onMenu: (path: string) => void;
  },
): ReactNode {
  return sortedTreeNodes(node).map((child) => {
    if (child.isFile) {
      if (child.name === ".gitkeep") return null;
      return (
        <FileTreeFile
          key={child.path}
          path={child.path}
          name={child.name}
          className="group pr-1"
          onContextMenu={(event) => {
            event.preventDefault();
            options.onMenu(child.path);
          }}
        >
          <span className="size-4 shrink-0" aria-hidden="true" />
          <FileTreeIcon>
            <FileCode2 className="size-3.5 text-fuchsia-300 drop-shadow-[0_0_10px_rgba(244,114,182,0.4)]" aria-hidden="true" />
          </FileTreeIcon>
          <FileTreeName className="font-mono text-[11px]">{child.name}</FileTreeName>
          {options.dirty.has(child.path) ? <span className="ml-1 size-1.5 shrink-0 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(253,224,71,0.5)]" aria-label="Unsaved changes" /> : null}
          {options.streamingPath === child.path ? <Loader2 className="ml-1 size-3 shrink-0 animate-spin text-violet-300 drop-shadow-[0_0_10px_rgba(196,181,253,0.45)]" aria-label="Writing file" /> : null}
          <FileTreeActions className="opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                options.onMenu(child.path);
              }}
              className="inline-flex size-6 items-center justify-center rounded-md border border-transparent bg-zinc-950/70 text-amber-300 shadow-[0_0_0_1px_rgba(251,191,36,0.08)] transition hover:border-fuchsia-400/25 hover:text-fuchsia-200"
              aria-label={`Open actions for ${child.path}`}
            >
              <MoreHorizontal className="size-3.5 drop-shadow-[0_0_8px_rgba(251,191,36,0.35)]" aria-hidden="true" />
            </button>
          </FileTreeActions>
        </FileTreeFile>
      );
    }
    return (
      <FileTreeFolder key={child.path} path={child.path} name={child.name}>
        {renderFileTree(child, options)}
      </FileTreeFolder>
    );
  });
}

export default function CodeViewer({
  chat: _chat,
  streamText,
  message,
  activeTab,
  onRequestFix,
  onPreviewError,
  onPreviewReady,
  onSaveFiles,
  autoFixEnabled,
  onAutoFixEnabledChange,
  autoFixAttempt,
  autoFixStatus,
  builderStatus,
  previewMode,
  onPreviewModeChange,
  sandpackOptions,
}: {
  chat: Chat;
  streamText: string;
  message?: Message;
  activeTab: string;
  onRequestFix: (e: string) => void;
  onPreviewError: (e: string) => void;
  onPreviewReady: () => void;
  onSaveFiles: (files: ViewerFile[]) => void;
  autoFixEnabled: boolean;
  onAutoFixEnabledChange: (enabled: boolean) => void;
  autoFixAttempt: number;
  autoFixStatus: AutoFixStatus;
  builderStatus: BuilderStatus;
  previewMode: PreviewMode;
  onPreviewModeChange: (mode: PreviewMode) => void;
  sandpackOptions?: SandpackBuildOptions;
}) {
  const streamAllFiles: ViewerFile[] = useMemo(
    () =>
      parseReplySegments(streamText)
        .filter((segment) => segment.type === "file")
        .map((segment) => ({
          path: segment.path,
          code: segment.code,
          language: segment.language,
          isPartial: segment.isPartial,
        })),
    [streamText],
  );

  const baseFiles: ViewerFile[] = useMemo(() => {
    const streamed = streamAllFiles;
    if (!message) return streamed;
    const stored = message.files as ViewerFile[] | null;
    const existing = stored && Array.isArray(stored) && stored.length > 0 ? stored : extractAllCodeBlocks(message.content);
    if (streamed.length === 0) return existing;
    const byPath = new Map<string, ViewerFile>();
    existing.forEach((file) => byPath.set(file.path, file));
    streamed.forEach((file) => byPath.set(file.path, file));
    return Array.from(byPath.values());
  }, [message, streamAllFiles]);

  const previewFiles: ViewerFile[] = useMemo(() => {
    const completeStreamFiles = streamAllFiles.filter((file) => !file.isPartial);
    if (!message) return completeStreamFiles;

    const stored = message.files as ViewerFile[] | null;
    const existing = stored && Array.isArray(stored) && stored.length > 0 ? stored : extractAllCodeBlocks(message.content);
    if (completeStreamFiles.length === 0) return existing;

    const byPath = new Map<string, ViewerFile>();
    existing.forEach((file) => byPath.set(file.path, file));
    completeStreamFiles.forEach((file) => byPath.set(file.path, file));
    return Array.from(byPath.values());
  }, [message, streamAllFiles]);

  const [draft, setDraft] = useState<ViewerFile[]>(baseFiles);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [extraDeps, setExtraDeps] = useState<Record<string, string>>({});
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(["app", "components", "lib"])); // start with common roots expanded; effect will expand all for default expanded mode
  const [refresh, setRefresh] = useState(0);
  const [showTerminal, setShowTerminal] = useState(false);

  // Default expanded mode for FileTree: expand all paths when files change
  useEffect(() => {
    const all = new Set<string>();
    draft.forEach(f => {
      const parts = f.path.split('/');
      let cur = '';
      parts.forEach((p, i) => {
        cur = i === 0 ? p : cur + '/' + p;
        if (i < parts.length - 1) all.add(cur); // folders
      });
    });
    if (all.size) setExpandedPaths(all);
  }, [draft.length]); // when file count changes during generation
  const [creating, setCreating] = useState<null | "file" | "folder">(null);
  const [newName, setNewName] = useState("");
  const [explorerPanel, setExplorerPanel] = useState<ExplorerPanel>("files");
  const [fileMenuPath, setFileMenuPath] = useState<string | null>(null);
  const [sidePath, setSidePath] = useState<string | null>(null);
  const [codeLayout, setCodeLayout] = useState<CodeLayout>("editor");
  const [showMinimap, setShowMinimap] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceValue, setReplaceValue] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [renamePath, setRenamePath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletePath, setDeletePath] = useState<string | null>(null);
  const editorApiRef = useRef<{ undo: () => void; redo: () => void } | null>(null);

  const baseKey = useMemo(() => {
    const fileKey = baseFiles.map((f) => `${f.path}:${streamText ? f.code.length : 0}:${f.isPartial ? 1 : 0}`).join("|");
    return `${message?.id ?? "stream"}:${fileKey}`;
  }, [baseFiles, message?.id, streamText]);

  useEffect(() => {
    setDraft(baseFiles);
    setDirty(new Set());
    setFileMenuPath(null);
    setSidePath(null);
    setExpandedPaths(expandedFromFiles(baseFiles));
    setSelectedPath((previous) => {
      const writingPath = streamText && baseFiles.length > 0 ? baseFiles.find((f) => f.isPartial)?.path ?? baseFiles.at(-1)?.path : null;
      if (writingPath) return writingPath;
      return previous && baseFiles.some((f) => f.path === previous) ? previous : baseFiles[0]?.path ?? null;
    });
  }, [baseKey]);

  useEffect(() => {
    const packageFile = baseFiles.find((file) => file.path === "package.json");
    if (!packageFile?.code) {
      setExtraDeps({});
      return;
    }
    setExtraDeps(extractPreviewDependencies(packageFile.code));
  }, [baseKey, baseFiles]);

  const selectedFile = draft.find((file) => file.path === selectedPath) || draft[0] || null;
  const sideFile = sidePath ? draft.find((file) => file.path === sidePath) : null;
  const tree = useMemo(() => buildTree(draft.map((file) => file.path)), [draft]);
  const isStreaming = Boolean(streamText);
  const streamingPath = draft.find((file) => file.isPartial)?.path ?? streamAllFiles.at(-1)?.path;
  const hasUnsaved = dirty.size > 0;
  const runnerFiles = useMemo(
    () =>
      (isStreaming ? previewFiles : draft).map((file) => ({
        path: file.path,
        content: file.code ?? "",
      })),
    [draft, isStreaming, previewFiles],
  );

  const updateFile = useCallback((path: string, code: string) => {
    setDraft((files) => files.map((file) => (file.path === path ? { ...file, code } : file)));
    setDirty((paths) => new Set(paths).add(path));
  }, []);

  const createFile = useCallback((path: string, code = "") => {
    const clean = cleanPath(path);
    if (!clean) return;
    setDraft((files) =>
      files.some((file) => file.path === clean)
        ? files.map((file) => (file.path === clean ? { ...file, code } : file))
        : [...files, { path: clean, code, language: languageFromPath(clean) }],
    );
    setDirty((paths) => new Set(paths).add(clean));
    if (!clean.endsWith(".gitkeep")) setSelectedPath(clean);
  }, []);

  const deleteFile = useCallback((path: string) => {
    setDraft((files) => files.filter((file) => file.path !== path));
    setDirty((paths) => new Set(paths).add(path));
    setSelectedPath((current) => (current === path ? null : current));
    setSidePath((current) => (current === path ? null : current));
    setFileMenuPath(null);
  }, []);

  const applyRename = useCallback(() => {
    if (!renamePath) return;
    const nextPath = cleanPath(renameValue);
    if (!nextPath || nextPath === renamePath) {
      setRenamePath(null);
      return;
    }
    if (draft.some((file) => file.path === nextPath)) {
      toast({ title: "File already exists", description: nextPath, variant: "destructive" });
      return;
    }
    setDraft((files) => files.map((file) => (file.path === renamePath ? { ...file, path: nextPath, language: languageFromPath(nextPath) } : file)));
    setDirty((paths) => {
      const next = new Set(paths);
      next.add(renamePath);
      next.add(nextPath);
      return next;
    });
    setSelectedPath((current) => (current === renamePath ? nextPath : current));
    setSidePath((current) => (current === renamePath ? nextPath : current));
    setFileMenuPath(null);
    setRenamePath(null);
    toast({ title: "File renamed", description: nextPath });
  }, [draft, renamePath, renameValue]);

  const openRenameDialog = (path: string) => {
    setRenamePath(path);
    setRenameValue(path);
    setFileMenuPath(null);
  };

  const openDeleteDialog = (path: string) => {
    setDeletePath(path);
    setFileMenuPath(null);
  };

  const saveAll = useCallback(() => {
    if (!hasUnsaved) return;
    onSaveFiles(draft.filter((file) => !file.path.endsWith(".gitkeep")));
    setDirty(new Set());
    toast({ title: "Saved", description: "Changes stored as a new version." });
  }, [draft, hasUnsaved, onSaveFiles]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveAll();
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setExplorerPanel("search");
      }
      if (mod && event.key.toLowerCase() === "`") {
        event.preventDefault();
        setShowTerminal((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveAll]);

  const searchResults = useMemo(() => {
    const query = matchCase ? searchQuery : searchQuery.toLowerCase();
    if (!query) return [];
    return draft
      .flatMap((file) =>
        file.code.split("\n").flatMap((line, index) => {
          const haystack = matchCase ? line : line.toLowerCase();
          return haystack.includes(query) ? [{ path: file.path, line: index + 1, preview: line.trim().slice(0, 120) }] : [];
        }),
      )
      .slice(0, 100);
  }, [draft, matchCase, searchQuery]);

  const replaceInFile = useCallback((path: string, allFiles = false) => {
    if (!searchQuery) return;
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, matchCase ? "g" : "gi");
    setDraft((files) =>
      files.map((file) => {
        if (!allFiles && file.path !== path) return file;
        const nextCode = file.code.replace(regex, replaceValue);
        return nextCode === file.code ? file : { ...file, code: nextCode };
      }),
    );
    setDirty((paths) => {
      const next = new Set(paths);
      if (allFiles) draft.forEach((file) => next.add(file.path));
      else next.add(path);
      return next;
    });
    toast({ title: allFiles ? "Replaced across files" : "Replaced in file" });
  }, [draft, matchCase, replaceValue, searchQuery]);

  const installDependency = (name: string, version = "latest") => {
    setExtraDeps((dependencies) => ({ ...dependencies, [name]: version }));
    toast({ title: "Dependency added", description: `${name}@${version} will be used in preview.` });
  };

  const iconBtn = "inline-flex size-7 items-center justify-center rounded-md border border-transparent bg-zinc-950/55 text-violet-300 shadow-[0_0_0_1px_rgba(168,85,247,0.06)] transition hover:border-violet-400/20 hover:bg-zinc-900 hover:text-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40 [&_svg]:drop-shadow-[0_0_8px_rgba(168,85,247,0.25)]";
  const panelIconBtn = "inline-flex size-7 items-center justify-center rounded-md border border-transparent bg-zinc-950/55 text-violet-300 shadow-[0_0_0_1px_rgba(168,85,247,0.06)] transition hover:border-violet-400/20 hover:bg-zinc-900 hover:text-amber-300 data-[active=true]:border-fuchsia-400/30 data-[active=true]:bg-[linear-gradient(135deg,rgba(244,114,182,0.16),rgba(168,85,247,0.14),rgba(251,191,36,0.08))] data-[active=true]:text-amber-300 [&_svg]:drop-shadow-[0_0_8px_rgba(168,85,247,0.25)]";
  const menuButton = "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring";

  const renderPrimaryEditor = () => {
    if (!selectedFile) return <EmptyState isStreaming={isStreaming} />;
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border/70 px-3 text-xs">
          <Snippet code={selectedFile.path} className="min-w-0 flex-1 border-0 bg-transparent shadow-none">
            <SnippetInput className="truncate text-xs text-muted-foreground" aria-label="Active file path" />
            <SnippetAddon align="inline-end">
              <SnippetCopyButton onCopy={() => toast({ title: "Path copied" })} />
            </SnippetAddon>
          </Snippet>
          {dirty.has(selectedFile.path) ? <span className="shrink-0 text-amber-500">●</span> : null}
        </div>
        <CodeEditor path={selectedFile.path} value={selectedFile.code} onChange={(value) => updateFile(selectedFile.path, value)} onEditorReady={(api) => (editorApiRef.current = api)} showMinimap={showMinimap} wordWrap={wordWrap} />
      </div>
    );
  };

  const renderSplitCompanion = () => {
    if (codeLayout === "split-preview") {
      return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex h-8 shrink-0 items-center border-b border-border/70 px-3 text-xs text-muted-foreground"><LayoutPanelTop className="mr-2 size-3.5" aria-hidden="true" />Live preview</div>
          {isStreaming ? (
            <BuildProgressLoader compact />
          ) : (
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <CodeRunner key={`${refresh}-${previewMode}-split`} files={runnerFiles} extraDependencies={extraDeps} onRequestFix={onRequestFix} onPreviewError={onPreviewError} onPreviewReady={onPreviewReady} previewMode={previewMode} onPreviewModeChange={onPreviewModeChange} showDeviceToggle={false} sandpackOptions={sandpackOptions} />
              {builderStatus !== "ready" && builderStatus !== "failed" && (
                <div className="absolute inset-0 z-10 bg-background"><BuildProgressLoader compact /></div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (codeLayout === "split-editor" && sideFile) {
      return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border/70 px-3 text-xs">
            <span className="truncate font-mono text-muted-foreground">{sideFile.path}</span>
            <button type="button" className="ml-auto rounded p-1 text-muted-foreground hover:text-foreground" onClick={() => setCodeLayout("editor")} aria-label="Close side editor"><PanelRightClose className="size-3.5" aria-hidden="true" /></button>
          </div>
          <CodeEditor path={`side-${sideFile.path}`} value={sideFile.code} onChange={(value) => updateFile(sideFile.path, value)} showMinimap={showMinimap} wordWrap={wordWrap} />
        </div>
      );
    }

    return null;
  };

  const renderEditorWorkspace = () => {
    const splitCompanion = renderSplitCompanion();

    if (!selectedFile || !splitCompanion) {
      return renderPrimaryEditor();
    }

    return (
      <>
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden lg:hidden">
          {renderPrimaryEditor()}
        </div>
        <ResizablePanelGroup id="code-viewer-editor-split" orientation="horizontal" className="hidden min-h-0 flex-1 overflow-hidden lg:flex">
          <ResizablePanel id="primary-editor" defaultSize="54%" minSize="30%" className="min-w-0 overflow-hidden">
            {renderPrimaryEditor()}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel id="secondary-editor" defaultSize="46%" minSize="30%" className="min-w-0 overflow-hidden">
            {splitCompanion}
          </ResizablePanel>
        </ResizablePanelGroup>
      </>
    );
  };

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.08),transparent_20%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.08),transparent_18%),transparent] text-foreground">
        {/* Mode switching lives in the shared outer header (Preview/Code/Design/…)
            — this inner toolbar only carries code-view-specific tools, so it
            follows the same chrome as preview/design mode instead of showing a
            second, redundant tab switcher. */}
        <div className="flex h-10 shrink-0 items-center justify-end border-b border-fuchsia-500/15 bg-zinc-950/65 px-2 text-sm backdrop-blur">
          <div className="flex items-center gap-1">
            <AutoFixStatusBadge status={autoFixStatus} attempt={autoFixAttempt} />
            {autoFixEnabled && autoFixStatus === "fixing" ? (
              <span className="hidden text-[11px] text-muted-foreground md:inline" aria-live="polite">
                Fixing error automatically...
              </span>
            ) : null}
            <Tip label="Auto-fix preview errors">
              <span className="inline-flex items-center gap-1.5 px-1.5">
                <Wand2 className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <Switch checked={autoFixEnabled} onCheckedChange={onAutoFixEnabledChange} aria-label="Toggle automatic error fixing" />
              </span>
            </Tip>
            <div className="mx-1 h-4 w-px bg-border/70" aria-hidden="true" />
            {activeTab === "code" ? (
              <>
                <Tip label={codeLayout === "split-preview" ? "Single editor" : "Split with preview"}>
                  <button className={`${iconBtn} ${codeLayout === "split-preview" ? "text-foreground" : ""}`} onClick={() => setCodeLayout((layout) => (layout === "split-preview" ? "editor" : "split-preview"))} aria-label="Toggle side by side editor and preview">
                    <Columns3 className="size-3.5" aria-hidden="true" />
                  </button>
                </Tip>
                <Tip label={codeLayout === "split-editor" ? "Close side editor" : "Open side editor"}>
                  <button className={`${iconBtn} ${codeLayout === "split-editor" ? "text-foreground" : ""}`} onClick={() => { setSidePath((path) => path || selectedFile?.path || null); setCodeLayout((layout) => (layout === "split-editor" ? "editor" : "split-editor")); }} disabled={!selectedFile} aria-label="Toggle side editor">
                    {codeLayout === "split-editor" ? <PanelRightClose className="size-3.5" aria-hidden="true" /> : <PanelRightOpen className="size-3.5" aria-hidden="true" />}
                  </button>
                </Tip>
                <Tip label="Toggle minimap"><button className={`${iconBtn} ${showMinimap ? "border-fuchsia-400/30 bg-[linear-gradient(135deg,rgba(244,114,182,0.18),rgba(168,85,247,0.14),rgba(251,191,36,0.08))] text-amber-300" : ""}`} onClick={() => setShowMinimap((value) => !value)} aria-label="Toggle minimap"><MapIcon className="size-3.5" aria-hidden="true" /></button></Tip>
                <Tip label="Toggle word wrap"><button className={`${iconBtn} ${wordWrap ? "border-fuchsia-400/30 bg-[linear-gradient(135deg,rgba(244,114,182,0.18),rgba(168,85,247,0.14),rgba(251,191,36,0.08))] text-amber-300" : ""}`} onClick={() => setWordWrap((value) => !value)} aria-label="Toggle word wrap"><WrapText className="size-3.5" aria-hidden="true" /></button></Tip>
                {hasUnsaved ? <Tip label="Save changes as new version (⌘S)"><button onClick={saveAll} className="inline-flex h-7 items-center gap-1 rounded-md border border-fuchsia-400/30 bg-[linear-gradient(135deg,rgba(244,114,182,0.18),rgba(168,85,247,0.16),rgba(251,191,36,0.1))] px-2 text-xs font-medium text-zinc-50 shadow-[0_0_16px_rgba(244,114,182,0.14)] transition hover:border-fuchsia-300/40" aria-label="Save changes"><Save className="size-3.5 text-amber-300" aria-hidden="true" /> Save</button></Tip> : null}
                <Tip label="Undo (⌘Z)"><button className={iconBtn} onClick={() => editorApiRef.current?.undo()} aria-label="Undo"><Undo2 className="size-3.5" aria-hidden="true" /></button></Tip>
                <Tip label="Redo (⇧⌘Z)"><button className={iconBtn} onClick={() => editorApiRef.current?.redo()} aria-label="Redo"><Redo2 className="size-3.5" aria-hidden="true" /></button></Tip>
                <Tip label="Toggle terminal (⌘`)"><button className={`${iconBtn} ${showTerminal ? "border-fuchsia-400/30 bg-[linear-gradient(135deg,rgba(244,114,182,0.18),rgba(168,85,247,0.14),rgba(251,191,36,0.08))] text-amber-300" : ""}`} onClick={() => setShowTerminal((value) => !value)} aria-label="Toggle terminal"><TerminalIconLucide className="size-3.5" aria-hidden="true" /></button></Tip>
              </>
            ) : null}
            {activeTab === "code" ? (
              <Tip label="Refresh preview"><button className={iconBtn} onClick={() => setRefresh((value) => value + 1)} aria-label="Refresh preview"><RefreshCw className="size-3.5" aria-hidden="true" /></button></Tip>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {activeTab === "code" ? (
            <ResizablePanelGroup id="code-viewer-workspace-split" orientation="horizontal" className="min-h-0">
              <ResizablePanel id="file-explorer" defaultSize="22%" minSize="14%" maxSize="34%" className="hidden min-w-0 flex-col overflow-hidden bg-transparent sm:flex">
                <nav className="flex h-full min-h-0 flex-col overflow-hidden border-r border-border/70 bg-transparent" aria-label="Project workspace">
                <div className="flex h-9 shrink-0 items-center gap-1 border-b border-fuchsia-500/15 bg-zinc-950/55 px-2">
                  <Tip label="Files"><button data-active={explorerPanel === "files"} className={panelIconBtn} onClick={() => setExplorerPanel("files")} aria-label="Files"><FileCode2 className="size-3.5" aria-hidden="true" /></button></Tip>
                  <Tip label="Search and replace"><button data-active={explorerPanel === "search"} className={panelIconBtn} onClick={() => setExplorerPanel("search")} aria-label="Search and replace"><Search className="size-3.5" aria-hidden="true" /></button></Tip>
                  <Tip label="Extensions and components"><button data-active={explorerPanel === "extensions"} className={panelIconBtn} onClick={() => setExplorerPanel("extensions")} aria-label="Extensions and components"><Boxes className="size-3.5" aria-hidden="true" /></button></Tip>
                  <div className="ml-auto flex items-center">
                    <Tip label="New file"><button className={iconBtn} onClick={() => { setExplorerPanel("files"); setCreating("file"); setNewName(""); }} aria-label="New file"><FilePlus2 className="size-3.5" aria-hidden="true" /></button></Tip>
                    <Tip label="New folder"><button className={iconBtn} onClick={() => { setExplorerPanel("files"); setCreating("folder"); setNewName(""); }} aria-label="New folder"><FolderPlus className="size-3.5" aria-hidden="true" /></button></Tip>
                  </div>
                </div>

                {explorerPanel === "files" ? (
                  <>
                    <div className="flex items-center justify-between px-3 py-2"><span className="text-[10px] uppercase tracking-widest text-muted-foreground">Files ({draft.filter((file) => !file.path.endsWith(".gitkeep")).length})</span></div>
                    {creating ? (
                      <form className="px-2 pb-1" onSubmit={(event) => { event.preventDefault(); const value = newName.trim(); if (!value) return setCreating(null); if (creating === "file") createFile(value, ""); else createFile(`${value.replace(/\/+$/, "")}/.gitkeep`, ""); setCreating(null); }}>
                        <input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} onBlur={() => setCreating(null)} onKeyDown={(event) => event.key === "Escape" && setCreating(null)} placeholder={creating === "file" ? "path/name.tsx" : "folder/name"} aria-label={`New ${creating} name`} className="w-full rounded border border-border/70 bg-transparent px-2 py-1 font-mono text-[11px] focus:border-foreground/20 focus:outline-none focus-visible:ring-0" />
                      </form>
                    ) : null}
                    <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2 text-xs">
                      <FileTree className="h-full rounded-none border-0 bg-transparent text-xs" selectedPath={selectedPath ?? undefined} onSelect={(path) => { if (draft.some((file) => file.path === path)) setSelectedPath(path); }} expanded={expandedPaths} onExpandedChange={setExpandedPaths}>
                        {renderFileTree(tree, { dirty, streamingPath, onMenu: (path) => setFileMenuPath((current) => (current === path ? null : path)) })}
                      </FileTree>
                    </div>
                    {fileMenuPath ? (
                      <div className="shrink-0 border-t border-border/70 p-2">
                        <div className="mb-1 truncate font-mono text-[11px] text-muted-foreground">{fileMenuPath}</div>
                        <button className={menuButton} onClick={() => { setSidePath(fileMenuPath); setCodeLayout("split-editor"); setFileMenuPath(null); }}><PanelRightOpen className="size-3.5" aria-hidden="true" /> Open to side</button>
                        <button className={menuButton} onClick={async () => { await navigator.clipboard.writeText(fileMenuPath).catch(() => undefined); toast({ title: "Path copied" }); setFileMenuPath(null); }}><Copy className="size-3.5" aria-hidden="true" /> Copy path</button>
                        <button className={menuButton} onClick={() => openRenameDialog(fileMenuPath)}><Pencil className="size-3.5" aria-hidden="true" /> Rename</button>
                        <button className={menuButton} onClick={() => { const file = draft.find((item) => item.path === fileMenuPath); if (file) downloadSingleFile(file); setFileMenuPath(null); }}><Download className="size-3.5" aria-hidden="true" /> Download file</button>
                        <button className={`${menuButton} text-orange-300 hover:text-yellow-200`} onClick={() => openDeleteDialog(fileMenuPath)}><Trash2 className="size-3.5" aria-hidden="true" /> Delete</button>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {explorerPanel === "search" ? (
                  <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
                    <div className="space-y-1">
                      <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search" className="h-8 w-full rounded-md border border-border/70 bg-transparent px-2 text-xs outline-none transition-colors focus:border-foreground/20 focus-visible:ring-0" aria-label="Search files" />
                      <input value={replaceValue} onChange={(event) => setReplaceValue(event.target.value)} placeholder="Replace" className="h-8 w-full rounded-md border border-border/70 bg-transparent px-2 text-xs outline-none transition-colors focus:border-foreground/20 focus-visible:ring-0" aria-label="Replace value" />
                      <label className="flex items-center gap-2 text-[11px] text-muted-foreground"><input type="checkbox" checked={matchCase} onChange={(event) => setMatchCase(event.target.checked)} /> Match case</label>
                      <div className="grid grid-cols-2 gap-1">
                        <button className="h-7 rounded-md border border-border/70 text-[11px] hover:border-foreground/30" onClick={() => selectedFile && replaceInFile(selectedFile.path)} disabled={!searchQuery || !selectedFile}>Replace file</button>
                        <button className="h-7 rounded-md border border-border/70 text-[11px] hover:border-foreground/30" onClick={() => replaceInFile("", true)} disabled={!searchQuery}>Replace all</button>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto border-t border-border/70 pt-2">
                      {searchResults.length ? searchResults.map((result, index) => (
                        <button key={`${result.path}-${result.line}-${index}`} className="mb-1 w-full rounded-md px-2 py-1.5 text-left hover:text-foreground" onClick={() => { setSelectedPath(result.path); setExplorerPanel("files"); }}>
                          <p className="truncate font-mono text-[11px] text-foreground">{result.path}:{result.line}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{result.preview}</p>
                        </button>
                      )) : <p className="px-2 py-4 text-center text-xs text-muted-foreground">{searchQuery ? "No matches" : "Search across generated files"}</p>}
                    </div>
                  </div>
                ) : null}

                {explorerPanel === "extensions" ? (
                  <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2 text-xs">
                    <div><p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Component library</p><div className="space-y-1.5">{["button", "input", "card", "dialog", "sheet", "dropdown-menu"].map((name) => { const importPath = `components/ui/${name}`; return <Snippet key={name} code={importPath} className="h-8 text-[11px]"><SnippetText className="pl-1.5 text-[10px]">@/</SnippetText><SnippetInput className="text-[11px]" aria-label={`Import path for ${name}`} /><SnippetAddon align="inline-end"><SnippetCopyButton onCopy={() => toast({ title: "Path copied" })} /></SnippetAddon></Snippet>; })}</div></div>
                    <div><p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Add preview dependency</p><div className="space-y-1">{["framer-motion", "gsap", "animejs", "three", "lucide-react", "recharts", "date-fns", "clsx"].map((pkg) => <button key={pkg} className="flex w-full items-center gap-2 rounded-md border border-border/70 px-2 py-1.5 text-left hover:border-foreground/30" onClick={() => installDependency(pkg)}><PackagePlus className="size-3.5 text-muted-foreground" aria-hidden="true" /><span className="font-mono">{pkg}</span></button>)}</div></div>
                    <div className="border-t border-border/70 pt-2"><p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Installed in preview</p>{Object.keys(extraDeps).length ? Object.entries(extraDeps).map(([name, version]) => <p key={name} className="truncate font-mono text-[11px] text-foreground">{name}@{version}</p>) : <p className="text-[11px] text-muted-foreground">No extra dependencies added.</p>}</div>
                  </div>
                ) : null}
                </nav>
              </ResizablePanel>
              <ResizableHandle withHandle className="hidden sm:flex" />
              <ResizablePanel id="code-workspace" minSize="45%" className="min-w-0 overflow-hidden">
                <div role="tabpanel" aria-label="Code editor" className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
                  {showTerminal ? (
                    <ResizablePanelGroup id="code-viewer-terminal-split" orientation="vertical" className="min-h-0 flex-1 overflow-hidden">
                      <ResizablePanel id="editor-stack" defaultSize="72%" minSize="35%" className="min-h-0 overflow-hidden">
                        {renderEditorWorkspace()}
                      </ResizablePanel>
                      <ResizableHandle withHandle />
                      <ResizablePanel id="terminal" defaultSize="28%" minSize="16%" maxSize="45%" className="min-h-0 overflow-hidden">
                        <Terminal output={draft.map((f) => `> ${f.path} ${f.isPartial ? '(writing...)' : 'written'}`).join('\n') || 'No files yet. Generating...'} isStreaming={!!streamText}>
                          <TerminalHeader>
                            <TerminalTitle>Terminal • file ops</TerminalTitle>
                          </TerminalHeader>
                          {/* legacy full terminal hidden */}
                          <div className="hidden"><BuilderTerminal files={draft} deps={extraDeps} onCreateFile={createFile} onDeleteFile={deleteFile} onInstall={(pkg, version) => setExtraDeps((dependencies) => ({ ...dependencies, [pkg]: version || "latest" }))} /></div>
                        </Terminal>
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  ) : (
                    renderEditorWorkspace()
                  )}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div role="tabpanel" aria-label="Live preview" className="relative min-h-0 flex-1 overflow-hidden">
              {isStreaming ? (
                <BuildProgressLoader />
              ) : runnerFiles.length > 0 ? (
                <>
                  <CodeRunner
                    key={`${refresh}-${previewMode}`}
                    files={runnerFiles}
                    extraDependencies={extraDeps}
                    onRequestFix={onRequestFix}
                    onPreviewError={onPreviewError}
                    onPreviewReady={onPreviewReady}
                    previewMode={previewMode}
                    onPreviewModeChange={onPreviewModeChange}
                    showWebPreviewChrome
                    showDeviceToggle
                    onRefresh={() => setRefresh((value) => value + 1)}
                    sandpackOptions={sandpackOptions}
                  />
                  {builderStatus !== "ready" && builderStatus !== "failed" && (
                    <div className="absolute inset-0 z-10 bg-background"><BuildProgressLoader /></div>
                  )}
                </>
              ) : (
                <EmptyState isStreaming={isStreaming} />
              )}
            </div>
          )}
        </div>

        <div className="flex h-7 shrink-0 items-center gap-3 border-t border-fuchsia-500/15 bg-zinc-950/65 px-3 text-[11px] text-muted-foreground">
          <span>{draft.filter((file) => !file.path.endsWith(".gitkeep")).length} files</span>
          {isStreaming && streamingPath ? <span className="truncate font-mono text-amber-500">writing {streamingPath}</span> : null}
          {hasUnsaved ? <span className="text-amber-500">● unsaved</span> : null}
          {Object.keys(extraDeps).length > 0 ? <span>+{Object.keys(extraDeps).length} deps</span> : null}
          <div className="flex-1" />
          <BuilderStatusText status={isStreaming ? "generating" : builderStatus} />
        </div>

        <AlertDialog open={Boolean(renamePath)} onOpenChange={(open) => { if (!open) setRenamePath(null); }}>
          <AlertDialogContent className="border-border/70 bg-background/95">
            <AlertDialogHeader>
              <AlertDialogTitle>Rename file</AlertDialogTitle>
              <AlertDialogDescription>Update the generated artifact path. This change stays local until you save as a new version.</AlertDialogDescription>
            </AlertDialogHeader>
            <input autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") applyRename(); }} className="h-9 w-full rounded-md border border-border/70 bg-transparent px-3 font-mono text-xs text-foreground outline-none focus:border-foreground/30" aria-label="New file path" />
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-transparent">Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-transparent text-foreground hover:bg-transparent" onClick={applyRename}>Rename</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={Boolean(deletePath)} onOpenChange={(open) => { if (!open) setDeletePath(null); }}>
          <AlertDialogContent className="border-border/70 bg-background/95">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete file?</AlertDialogTitle>
              <AlertDialogDescription>{deletePath ? `Remove ${deletePath} from this artifact version draft. Save creates the new version.` : "Remove this file from the draft."}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-transparent">Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-transparent text-red-500 hover:bg-transparent" onClick={() => { if (deletePath) deleteFile(deletePath); setDeletePath(null); }}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

function EmptyState({ isStreaming }: { isStreaming: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      {isStreaming ? <BuildProgressLoader compact /> : <p>No files yet. Send a prompt to generate an app.</p>}
    </div>
  );
}

/** Rotating, plain-language status lines shown while an app is being built —
 * cycles every 3-5s so a long build doesn't feel stuck on one static message. */
const BUILD_STATUS_MESSAGES = [
  "Reading your prompt and planning the app...",
  "Sketching out the pages and layout...",
  "Wiring up components and interactions...",
  "Connecting state so everything works together...",
  "Styling things to look sharp...",
  "Double-checking imports and structure...",
  "Compiling your app for preview...",
  "Almost there — polishing the final details...",
];

function BuildProgressLoader({ compact = false }: { compact?: boolean }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setMessageIndex((current) => (current + 1) % BUILD_STATUS_MESSAGES.length),
      3000 + Math.random() * 2000,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-4 bg-background px-6 text-center ${compact ? "gap-3" : "gap-4"}`}
      aria-live="polite"
      aria-label="Building your app"
    >
      <DotFlow size={compact ? 8 : 10} count={4} className="text-primary" label="Building" />
      <div className="h-1 w-40 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="hs-build-progress-bar h-full w-1/3 rounded-full bg-primary" />
      </div>
      <p key={messageIndex} className="hs-composer-swap max-w-sm text-sm text-muted-foreground">
        {BUILD_STATUS_MESSAGES[messageIndex]}
      </p>
    </div>
  );
}

function AutoFixStatusBadge({ status, attempt }: { status: AutoFixStatus; attempt: number }) {
  if (status === "idle") return null;
  const map = {
    watching: { label: "Watching", cls: "text-muted-foreground", icon: <Eye className="size-3" aria-hidden="true" /> },
    fixing: { label: `Fixing ${Math.min(attempt, 3)}/3`, cls: "text-amber-500", icon: <Loader2 className="size-3 animate-spin" aria-hidden="true" /> },
    fallback: { label: "Rebuilding", cls: "text-orange-500", icon: <Loader2 className="size-3 animate-spin" aria-hidden="true" /> },
    ready: { label: "Healthy", cls: "text-emerald-500", icon: <CheckCircle2 className="size-3" aria-hidden="true" /> },
  } as const;
  const config = map[status];
  return <span className={`hidden items-center gap-1 text-[11px] font-medium md:inline-flex ${config.cls}`} role="status" aria-live="polite">{config.icon}{config.label}</span>;
}

function BuilderStatusText({ status }: { status: BuilderStatus }) {
  const labels: Record<BuilderStatus, { label: string; cls: string }> = {
    generating: { label: "Generating", cls: "text-amber-500" },
    validating: { label: "Validating preview", cls: "text-sky-500" },
    fixing: { label: "Auto-fixing", cls: "text-amber-500" },
    rebuilding: { label: "Rebuilding", cls: "text-orange-500" },
    ready: { label: "Preview ready", cls: "text-emerald-500" },
    failed: { label: "Needs review", cls: "text-red-500" },
  };
  const config = labels[status];
  return (
    <span className={config.cls} aria-live="polite">
      ● {config.label}
    </span>
  );
}
