"use client";

import {
  RefreshCw,
  Wand2,
  CheckCircle2,
  Loader2,
  Eye,
  FileCode2,
  Folder,
  FolderOpen,
  FilePlus2,
  FolderPlus,
  Save,
  Undo2,
  Redo2,
  TerminalSquare,
  ChevronRight,
  ChevronDown,
  Search,
  Copy,
  Download,
  Trash2,
  Pencil,
  PanelRightOpen,
  PanelRightClose,
  MoreHorizontal,
  Columns3,
  LayoutPanelTop,
  Boxes,
  PackagePlus,
  WrapText,
  Map as MapIcon,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { extractAllCodeBlocks, parseReplySegments } from "@/lib/utils";
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Fragment,
} from "react";
import type { Chat, Message } from "./page";
import dynamic from "next/dynamic";
import { Switch } from "@/components/ui/switch";
import { Tip, TooltipProvider } from "@/components/ui/tooltip";
import BuilderTerminal from "@/components/builder-terminal";
import type { PreviewMode } from "@/components/code-runner-react";
import type { SandpackBuildOptions } from "@/lib/sandpack-config";

const CodeRunner = dynamic(() => import("@/components/code-runner"), {
  ssr: false,
});
const CodeEditor = dynamic(() => import("@/components/code-editor"), {
  ssr: false,
});

type ViewerFile = {
  path: string;
  code: string;
  language: string;
  isPartial?: boolean;
};

type ExplorerPanel = "files" | "search" | "extensions";
type CodeLayout = "editor" | "split-preview" | "split-editor";

export type AutoFixStatus =
  | "idle"
  | "watching"
  | "fixing"
  | "fallback"
  | "ready";

export async function downloadFilesAsZip(
  files: Array<{ path: string; code: string }>,
  zipName: string,
) {
  if (files.length === 0) {
    toast({
      title: "Nothing to download",
      description: "No generated files yet.",
      variant: "destructive",
    });
    return;
  }
  try {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const file of files) {
      zip.file(file.path.replace(/^\/+/, "") || "App.tsx", file.code ?? "");
    }
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
  } catch (err) {
    toast({
      title: "Download failed",
      description: err instanceof Error ? err.message : "Could not build zip",
      variant: "destructive",
    });
  }
}

function downloadSingleFile(file: ViewerFile) {
  const blob = new Blob([file.code ?? ""], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.path.split("/").pop() || "file.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

type TreeNode = {
  name: string;
  path: string;
  children?: Map<string, TreeNode>;
  isFile?: boolean;
};

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: new Map() };
  for (const full of paths) {
    const parts = full.split("/").filter(Boolean);
    let node = root;
    let acc = "";
    parts.forEach((part, i) => {
      acc = acc ? `${acc}/${part}` : part;
      if (!node.children) node.children = new Map();
      if (!node.children.has(part)) {
        node.children.set(part, {
          name: part,
          path: acc,
          isFile: i === parts.length - 1,
          children: i === parts.length - 1 ? undefined : new Map(),
        });
      }
      node = node.children.get(part)!;
    });
  }
  return root;
}

function Tree({
  node,
  depth,
  selected,
  dirty,
  streamingPath,
  collapsed,
  onToggle,
  onSelect,
  onMenu,
}: {
  node: TreeNode;
  depth: number;
  selected: string | null;
  dirty: Set<string>;
  streamingPath?: string | null;
  collapsed: Set<string>;
  onToggle: (p: string) => void;
  onSelect: (p: string) => void;
  onMenu: (path: string) => void;
}) {
  const entries = node.children
    ? Array.from(node.children.values()).sort((a, b) =>
        a.isFile === b.isFile ? a.name.localeCompare(b.name) : a.isFile ? 1 : -1,
      )
    : [];
  return (
    <>
      {entries.map((child) =>
        child.isFile ? (
          child.name === ".gitkeep" ? null : (
            <div
              key={child.path}
              className={`group flex items-center pr-1 transition ${
                selected === child.path
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              }`}
              onContextMenu={(event) => {
                event.preventDefault();
                onMenu(child.path);
              }}
            >
              <button
                type="button"
                onClick={() => onSelect(child.path)}
                aria-current={selected === child.path ? "true" : undefined}
                style={{ paddingLeft: 10 + depth * 12 }}
                className="flex min-w-0 flex-1 items-center gap-1.5 py-1 pr-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <FileCode2 className="size-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                <span className="truncate font-mono text-[11px]">{child.name}</span>
                {dirty.has(child.path) && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-amber-400" aria-label="Unsaved changes" />}
                {streamingPath === child.path && <Loader2 className="ml-auto size-3 shrink-0 animate-spin text-amber-500" aria-label="Writing file" />}
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onMenu(child.path);
                }}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition hover:bg-background/70 hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                aria-label={`Open actions for ${child.path}`}
              >
                <MoreHorizontal className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          )
        ) : (
          <Fragment key={child.path}>
            <button
              type="button"
              onClick={() => onToggle(child.path)}
              aria-expanded={!collapsed.has(child.path)}
              style={{ paddingLeft: 10 + depth * 12 }}
              className="flex w-full items-center gap-1.5 py-1 pr-2 text-left text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
            >
              {collapsed.has(child.path) ? <ChevronRight className="size-3 shrink-0" aria-hidden="true" /> : <ChevronDown className="size-3 shrink-0" aria-hidden="true" />}
              {collapsed.has(child.path) ? <Folder className="size-3.5 shrink-0" aria-hidden="true" /> : <FolderOpen className="size-3.5 shrink-0" aria-hidden="true" />}
              <span className="truncate text-[11px] font-medium">{child.name}</span>
            </button>
            {!collapsed.has(child.path) && (
              <Tree
                node={child}
                depth={depth + 1}
                selected={selected}
                dirty={dirty}
                streamingPath={streamingPath}
                collapsed={collapsed}
                onToggle={onToggle}
                onSelect={onSelect}
                onMenu={onMenu}
              />
            )}
          </Fragment>
        ),
      )}
    </>
  );
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
  autoFixEnabled,
  onAutoFixEnabledChange,
  autoFixAttempt,
  autoFixStatus,
  previewMode,
  onPreviewModeChange,
  sandpackOptions,
}: {
  chat: Chat;
  streamText: string;
  message?: Message;
  activeTab: string;
  onTabChange: (v: "code" | "preview") => void;
  onRequestFix: (e: string) => void;
  onPreviewError: (e: string) => void;
  onPreviewReady: () => void;
  onSaveFiles: (files: ViewerFile[]) => void;
  autoFixEnabled: boolean;
  onAutoFixEnabledChange: (enabled: boolean) => void;
  autoFixAttempt: number;
  autoFixStatus: AutoFixStatus;
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
    const existing =
      stored && Array.isArray(stored) && stored.length > 0
        ? stored
        : extractAllCodeBlocks(message.content);

    if (streamed.length === 0) return existing;

    const byPath = new Map<string, ViewerFile>();
    existing.forEach((file) => byPath.set(file.path, file));
    streamed.forEach((file) => byPath.set(file.path, file));
    return Array.from(byPath.values());
  }, [message, streamAllFiles]);

  const [draft, setDraft] = useState<ViewerFile[]>(baseFiles);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [extraDeps, setExtraDeps] = useState<Record<string, string>>({});
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [refresh, setRefresh] = useState(0);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(180);
  const [treeWidth, setTreeWidth] = useState(220);
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
  const editorApiRef = useRef<{ undo: () => void; redo: () => void } | null>(null);
  const baseKey = useMemo(() => {
    const fileKey = baseFiles
      .map((f) => `${f.path}:${streamText ? f.code.length : 0}:${f.isPartial ? 1 : 0}`)
      .join("|");
    return `${message?.id ?? "stream"}:${fileKey}`;
  }, [baseFiles, message?.id, streamText]);

  useEffect(() => {
    setDraft(baseFiles);
    setDirty(new Set());
    setFileMenuPath(null);
    setSidePath(null);
    setSelectedPath((prev) => {
      const writingPath =
        streamText && baseFiles.length > 0
          ? (baseFiles.find((f) => f.isPartial)?.path ?? baseFiles.at(-1)?.path)
          : null;
      if (writingPath) return writingPath;
      return prev && baseFiles.some((f) => f.path === prev)
        ? prev
        : (baseFiles[0]?.path ?? null);
    });
  }, [baseKey]);

  const selectedFile = draft.find((f) => f.path === selectedPath) || draft[0] || null;
  const sideFile = sidePath ? draft.find((f) => f.path === sidePath) : null;

  const runnerFiles = useMemo(
    () => draft.map((f) => ({ path: f.path, content: f.code ?? "" })),
    [draft],
  );

  const updateFile = useCallback((path: string, code: string) => {
    setDraft((d) => d.map((f) => (f.path === path ? { ...f, code } : f)));
    setDirty((s) => new Set(s).add(path));
  }, []);

  const createFile = useCallback((path: string, code = "") => {
    const clean = path.replace(/^\/+/, "");
    if (!clean) return;
    setDraft((d) =>
      d.some((f) => f.path === clean)
        ? d.map((f) => (f.path === clean ? { ...f, code } : f))
        : [
            ...d,
            {
              path: clean,
              code,
              language: clean.split(".").pop() || "tsx",
            },
          ],
    );
    setDirty((s) => new Set(s).add(clean));
    if (!clean.endsWith(".gitkeep")) setSelectedPath(clean);
  }, []);

  const deleteFile = useCallback((path: string) => {
    setDraft((d) => d.filter((f) => f.path !== path));
    setDirty((s) => new Set(s).add(path));
    setSelectedPath((p) => (p === path ? null : p));
    setSidePath((p) => (p === path ? null : p));
    setFileMenuPath(null);
  }, []);

  const renameFile = useCallback((path: string) => {
    const next = window.prompt("Rename file", path)?.trim().replace(/^\/+/, "");
    if (!next || next === path) return;
    if (draft.some((file) => file.path === next)) {
      toast({ title: "File already exists", variant: "destructive" });
      return;
    }
    setDraft((files) => files.map((file) => (file.path === path ? { ...file, path: next, language: next.split(".").pop() || file.language } : file)));
    setDirty((s) => {
      const n = new Set(s);
      n.add(path);
      n.add(next);
      return n;
    });
    setSelectedPath((p) => (p === path ? next : p));
    setSidePath((p) => (p === path ? next : p));
    setFileMenuPath(null);
  }, [draft]);

  const hasUnsaved = dirty.size > 0;

  const saveAll = useCallback(() => {
    if (!hasUnsaved) return;
    onSaveFiles(draft.filter((f) => !f.path.endsWith(".gitkeep")));
    setDirty(new Set());
    toast({ title: "Saved", description: "Changes stored as a new version." });
  }, [draft, hasUnsaved, onSaveFiles]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveAll();
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setExplorerPanel("search");
      }
      if (mod && e.key.toLowerCase() === "`") {
        e.preventDefault();
        setShowTerminal((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveAll]);

  const dragState = useRef<
    | { type: "tree"; startX: number; start: number }
    | { type: "term"; startY: number; start: number }
    | null
  >(null);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      const d = dragState.current;
      if (!d) return;
      if (d.type === "tree") {
        setTreeWidth(Math.max(150, Math.min(380, d.start + (e.clientX - d.startX))));
      } else {
        setTerminalHeight(Math.max(90, Math.min(420, d.start - (e.clientY - d.startY))));
      }
    };
    const up = () => {
      dragState.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  const tree = useMemo(() => buildTree(draft.map((f) => f.path)), [draft]);

  const isStreaming = !!streamText;
  const streamingPath =
    draft.find((file) => file.isPartial)?.path ?? streamAllFiles.at(-1)?.path;

  const searchResults = useMemo(() => {
    const query = matchCase ? searchQuery : searchQuery.toLowerCase();
    if (!query) return [];
    return draft.flatMap((file) => {
      const lines = file.code.split("\n");
      return lines.flatMap((line, index) => {
        const haystack = matchCase ? line : line.toLowerCase();
        return haystack.includes(query)
          ? [{ path: file.path, line: index + 1, preview: line.trim().slice(0, 120) }]
          : [];
      });
    }).slice(0, 100);
  }, [draft, matchCase, searchQuery]);

  const replaceInFile = useCallback((path: string, allFiles = false) => {
    if (!searchQuery) return;
    const flags = matchCase ? "g" : "gi";
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, flags);
    setDraft((files) =>
      files.map((file) => {
        if (!allFiles && file.path !== path) return file;
        const nextCode = file.code.replace(regex, replaceValue);
        return nextCode === file.code ? file : { ...file, code: nextCode };
      }),
    );
    setDirty((s) => {
      const n = new Set(s);
      if (allFiles) draft.forEach((file) => n.add(file.path));
      else n.add(path);
      return n;
    });
    toast({ title: allFiles ? "Replaced across files" : "Replaced in file" });
  }, [draft, matchCase, replaceValue, searchQuery]);

  const installDependency = (name: string, version = "latest") => {
    setExtraDeps((deps) => ({ ...deps, [name]: version }));
    toast({ title: "Dependency added", description: `${name}@${version} will be used in preview.` });
  };

  const openFileMenu = (path: string) => {
    setFileMenuPath((current) => (current === path ? null : path));
  };

  const iconBtn =
    "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40";
  const panelIconBtn =
    "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-background hover:text-foreground data-[active=true]:bg-background data-[active=true]:text-foreground";
  const menuButton =
    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground transition hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring";

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-2 text-sm">
          <div className="flex items-center gap-0.5" role="tablist" aria-label="Output view">
            {(["code", "preview"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => onTabChange(tab)}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
                  activeTab === tab ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <AutoFixStatusBadge status={autoFixStatus} attempt={autoFixAttempt} />
            <Tip label="Auto-fix preview errors">
              <span className="inline-flex items-center gap-1.5 px-1.5">
                <Wand2 className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <Switch checked={autoFixEnabled} onCheckedChange={onAutoFixEnabledChange} aria-label="Toggle automatic error fixing" />
              </span>
            </Tip>

            <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

            {activeTab === "code" && (
              <>
                <Tip label={codeLayout === "editor" ? "Split with preview" : "Single editor"}>
                  <button
                    className={`${iconBtn} ${codeLayout === "split-preview" ? "bg-accent text-foreground" : ""}`}
                    onClick={() => setCodeLayout((layout) => (layout === "split-preview" ? "editor" : "split-preview"))}
                    aria-pressed={codeLayout === "split-preview"}
                    aria-label="Toggle side by side editor and preview"
                  >
                    <Columns3 className="size-3.5" aria-hidden="true" />
                  </button>
                </Tip>
                <Tip label={codeLayout === "split-editor" ? "Close side editor" : "Open side editor"}>
                  <button
                    className={`${iconBtn} ${codeLayout === "split-editor" ? "bg-accent text-foreground" : ""}`}
                    onClick={() => {
                      setSidePath((path) => path || selectedFile?.path || null);
                      setCodeLayout((layout) => (layout === "split-editor" ? "editor" : "split-editor"));
                    }}
                    disabled={!selectedFile}
                    aria-pressed={codeLayout === "split-editor"}
                    aria-label="Toggle side editor"
                  >
                    {codeLayout === "split-editor" ? <PanelRightClose className="size-3.5" aria-hidden="true" /> : <PanelRightOpen className="size-3.5" aria-hidden="true" />}
                  </button>
                </Tip>
                <Tip label="Toggle minimap">
                  <button className={`${iconBtn} ${showMinimap ? "bg-accent text-foreground" : ""}`} onClick={() => setShowMinimap((v) => !v)} aria-pressed={showMinimap} aria-label="Toggle minimap">
                    <MapIcon className="size-3.5" aria-hidden="true" />
                  </button>
                </Tip>
                <Tip label="Toggle word wrap">
                  <button className={`${iconBtn} ${wordWrap ? "bg-accent text-foreground" : ""}`} onClick={() => setWordWrap((v) => !v)} aria-pressed={wordWrap} aria-label="Toggle word wrap">
                    <WrapText className="size-3.5" aria-hidden="true" />
                  </button>
                </Tip>
                {hasUnsaved && (
                  <Tip label="Save changes as new version (⌘S)">
                    <button onClick={saveAll} className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-600 px-2 text-xs font-medium text-white transition hover:bg-emerald-500" aria-label="Save changes">
                      <Save className="size-3.5" aria-hidden="true" /> Save
                    </button>
                  </Tip>
                )}
                <Tip label="Undo (⌘Z)">
                  <button className={iconBtn} onClick={() => editorApiRef.current?.undo()} aria-label="Undo">
                    <Undo2 className="size-3.5" aria-hidden="true" />
                  </button>
                </Tip>
                <Tip label="Redo (⇧⌘Z)">
                  <button className={iconBtn} onClick={() => editorApiRef.current?.redo()} aria-label="Redo">
                    <Redo2 className="size-3.5" aria-hidden="true" />
                  </button>
                </Tip>
                <Tip label="Toggle terminal (⌘`)">
                  <button className={`${iconBtn} ${showTerminal ? "bg-accent text-foreground" : ""}`} onClick={() => setShowTerminal((v) => !v)} aria-pressed={showTerminal} aria-label="Toggle terminal">
                    <TerminalSquare className="size-3.5" aria-hidden="true" />
                  </button>
                </Tip>
              </>
            )}
            <Tip label="Refresh preview">
              <button className={iconBtn} onClick={() => setRefresh((r) => r + 1)} aria-label="Refresh preview">
                <RefreshCw className="size-3.5" aria-hidden="true" />
              </button>
            </Tip>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {activeTab === "code" && (
            <>
              <nav style={{ width: treeWidth }} className="hidden shrink-0 flex-col overflow-hidden border-r border-border bg-card sm:flex" aria-label="Project workspace">
                <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border px-2">
                  <Tip label="Files">
                    <button data-active={explorerPanel === "files"} className={panelIconBtn} onClick={() => setExplorerPanel("files")} aria-label="Files">
                      <FileCode2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </Tip>
                  <Tip label="Search and replace">
                    <button data-active={explorerPanel === "search"} className={panelIconBtn} onClick={() => setExplorerPanel("search")} aria-label="Search and replace">
                      <Search className="size-3.5" aria-hidden="true" />
                    </button>
                  </Tip>
                  <Tip label="Extensions and components">
                    <button data-active={explorerPanel === "extensions"} className={panelIconBtn} onClick={() => setExplorerPanel("extensions")} aria-label="Extensions and components">
                      <Boxes className="size-3.5" aria-hidden="true" />
                    </button>
                  </Tip>
                  <div className="ml-auto flex items-center">
                    <Tip label="New file">
                      <button className={iconBtn} onClick={() => { setExplorerPanel("files"); setCreating("file"); setNewName(""); }} aria-label="New file">
                        <FilePlus2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </Tip>
                    <Tip label="New folder">
                      <button className={iconBtn} onClick={() => { setExplorerPanel("files"); setCreating("folder"); setNewName(""); }} aria-label="New folder">
                        <FolderPlus className="size-3.5" aria-hidden="true" />
                      </button>
                    </Tip>
                  </div>
                </div>

                {explorerPanel === "files" && (
                  <>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Files ({draft.filter((f) => !f.path.endsWith(".gitkeep")).length})
                      </span>
                    </div>
                    {creating && (
                      <form
                        className="px-2 pb-1"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const n = newName.trim();
                          if (!n) return setCreating(null);
                          if (creating === "file") createFile(n, "");
                          else createFile(`${n.replace(/\/+$/, "")}/.gitkeep`, "");
                          setCreating(null);
                        }}
                      >
                        <input
                          autoFocus
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onBlur={() => setCreating(null)}
                          onKeyDown={(e) => e.key === "Escape" && setCreating(null)}
                          placeholder={creating === "file" ? "path/name.tsx" : "folder/name"}
                          aria-label={`New ${creating} name`}
                          className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-[11px] focus:border-foreground/20 focus:outline-none focus-visible:ring-0"
                        />
                      </form>
                    )}
                    <div className="min-h-0 flex-1 overflow-y-auto pb-2 text-xs">
                      <Tree
                        node={tree}
                        depth={0}
                        selected={selectedPath}
                        dirty={dirty}
                        streamingPath={streamingPath}
                        collapsed={collapsed}
                        onToggle={(p) =>
                          setCollapsed((s) => {
                            const n = new Set(s);
                            n.has(p) ? n.delete(p) : n.add(p);
                            return n;
                          })
                        }
                        onSelect={setSelectedPath}
                        onMenu={openFileMenu}
                      />
                    </div>

                    {fileMenuPath && (
                      <div className="shrink-0 border-t border-border p-2">
                        <div className="mb-1 truncate font-mono text-[11px] text-muted-foreground">{fileMenuPath}</div>
                        <button className={menuButton} onClick={() => { setSidePath(fileMenuPath); setCodeLayout("split-editor"); setFileMenuPath(null); }}>
                          <PanelRightOpen className="size-3.5" aria-hidden="true" /> Open to side
                        </button>
                        <button className={menuButton} onClick={async () => { await navigator.clipboard.writeText(fileMenuPath).catch(() => undefined); toast({ title: "Path copied" }); setFileMenuPath(null); }}>
                          <Copy className="size-3.5" aria-hidden="true" /> Copy path
                        </button>
                        <button className={menuButton} onClick={() => renameFile(fileMenuPath)}>
                          <Pencil className="size-3.5" aria-hidden="true" /> Rename
                        </button>
                        <button className={menuButton} onClick={() => { const file = draft.find((f) => f.path === fileMenuPath); if (file) downloadSingleFile(file); setFileMenuPath(null); }}>
                          <Download className="size-3.5" aria-hidden="true" /> Download file
                        </button>
                        <button className={`${menuButton} text-red-500 hover:text-red-400`} onClick={() => window.confirm(`Delete ${fileMenuPath}?`) && deleteFile(fileMenuPath)}>
                          <Trash2 className="size-3.5" aria-hidden="true" /> Delete
                        </button>
                      </div>
                    )}
                  </>
                )}

                {explorerPanel === "search" && (
                  <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
                    <div className="space-y-1">
                      <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search" className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none transition-colors focus:border-foreground/20 focus-visible:ring-0" aria-label="Search files" />
                      <input value={replaceValue} onChange={(e) => setReplaceValue(e.target.value)} placeholder="Replace" className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none transition-colors focus:border-foreground/20 focus-visible:ring-0" aria-label="Replace value" />
                      <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} />
                        Match case
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        <button className="h-7 rounded-md border border-border text-[11px] hover:bg-accent" onClick={() => selectedFile && replaceInFile(selectedFile.path)} disabled={!searchQuery || !selectedFile}>
                          Replace file
                        </button>
                        <button className="h-7 rounded-md border border-border text-[11px] hover:bg-accent" onClick={() => replaceInFile("", true)} disabled={!searchQuery}>
                          Replace all
                        </button>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto border-t border-border pt-2">
                      {searchResults.length ? searchResults.map((result, index) => (
                        <button key={`${result.path}-${result.line}-${index}`} className="mb-1 w-full rounded-md px-2 py-1.5 text-left hover:bg-accent" onClick={() => { setSelectedPath(result.path); setExplorerPanel("files"); }}>
                          <p className="truncate font-mono text-[11px] text-foreground">{result.path}:{result.line}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{result.preview}</p>
                        </button>
                      )) : <p className="px-2 py-4 text-center text-xs text-muted-foreground">{searchQuery ? "No matches" : "Search across generated files"}</p>}
                    </div>
                  </div>
                )}

                {explorerPanel === "extensions" && (
                  <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2 text-xs">
                    <div>
                      <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Component library</p>
                      <div className="space-y-1">
                        {["button", "input", "card", "dialog", "sheet", "dropdown-menu"].map((name) => (
                          <button key={name} className="flex w-full items-center justify-between rounded-md border border-border px-2 py-1.5 text-left hover:bg-background" onClick={() => navigator.clipboard.writeText(`components/ui/${name}`).catch(() => undefined)}>
                            <span className="font-mono">{name}</span>
                            <Copy className="size-3 text-muted-foreground" aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Add preview dependency</p>
                      <div className="space-y-1">
                        {["framer-motion", "lucide-react", "recharts", "date-fns", "clsx"].map((pkg) => (
                          <button key={pkg} className="flex w-full items-center gap-2 rounded-md border border-border px-2 py-1.5 text-left hover:bg-background" onClick={() => installDependency(pkg)}>
                            <PackagePlus className="size-3.5 text-muted-foreground" aria-hidden="true" />
                            <span className="font-mono">{pkg}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-border pt-2">
                      <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Installed in preview</p>
                      {Object.keys(extraDeps).length ? Object.entries(extraDeps).map(([name, version]) => <p key={name} className="truncate font-mono text-[11px] text-foreground">{name}@{version}</p>) : <p className="text-[11px] text-muted-foreground">No extra dependencies added.</p>}
                    </div>
                  </div>
                )}
              </nav>

              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize file tree"
                tabIndex={0}
                onMouseDown={(e) => {
                  e.preventDefault();
                  dragState.current = { type: "tree", startX: e.clientX, start: treeWidth };
                  document.body.style.cursor = "col-resize";
                  document.body.style.userSelect = "none";
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") setTreeWidth((w) => Math.max(150, w - 12));
                  if (e.key === "ArrowRight") setTreeWidth((w) => Math.min(380, w + 12));
                }}
                className="group relative hidden w-[7px] shrink-0 cursor-col-resize bg-transparent transition focus-visible:outline-none sm:block"
              >
                <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition group-hover:bg-primary/50 group-focus-visible:bg-primary/60" aria-hidden="true" />
                <div className="absolute left-1/2 top-1/2 h-10 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/0 transition group-hover:bg-primary/30 group-focus-visible:bg-primary/40" aria-hidden="true" />
              </div>
            </>
          )}

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {activeTab === "preview" ? (
              <div role="tabpanel" aria-label="Live preview" className="min-h-0 flex-1 overflow-hidden">
                {runnerFiles.length > 0 ? (
                  <CodeRunner
                    key={`${refresh}-${previewMode}`}
                    files={runnerFiles}
                    extraDependencies={extraDeps}
                    onRequestFix={onRequestFix}
                    onPreviewError={onPreviewError}
                    onPreviewReady={onPreviewReady}
                    previewMode={previewMode}
                    onPreviewModeChange={onPreviewModeChange}
                    showDeviceToggle={false}
                    sandpackOptions={sandpackOptions}
                  />
                ) : (
                  <EmptyState isStreaming={isStreaming} />
                )}
              </div>
            ) : (
              <div role="tabpanel" aria-label="Code editor" className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex min-h-0 flex-1 overflow-hidden">
                  {selectedFile ? (
                    <>
                      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                        <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border px-3 text-xs">
                          <span className="truncate font-mono text-muted-foreground">{selectedFile.path}</span>
                          {dirty.has(selectedFile.path) && <span className="text-amber-500">●</span>}
                        </div>
                        <CodeEditor path={selectedFile.path} value={selectedFile.code} onChange={(v) => updateFile(selectedFile.path, v)} onEditorReady={(api) => (editorApiRef.current = api)} showMinimap={showMinimap} wordWrap={wordWrap} />
                      </div>

                      {codeLayout === "split-preview" && (
                        <div className="hidden min-w-0 flex-1 flex-col overflow-hidden border-l border-border lg:flex">
                          <div className="flex h-8 shrink-0 items-center border-b border-border px-3 text-xs text-muted-foreground">
                            <LayoutPanelTop className="mr-2 size-3.5" aria-hidden="true" />
                            Live preview
                          </div>
                          <CodeRunner key={`${refresh}-${previewMode}-split`} files={runnerFiles} extraDependencies={extraDeps} onRequestFix={onRequestFix} onPreviewError={onPreviewError} onPreviewReady={onPreviewReady} previewMode={previewMode} onPreviewModeChange={onPreviewModeChange} showDeviceToggle={false} sandpackOptions={sandpackOptions} />
                        </div>
                      )}

                      {codeLayout === "split-editor" && sideFile && (
                        <div className="hidden min-w-0 flex-1 flex-col overflow-hidden border-l border-border lg:flex">
                          <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border px-3 text-xs">
                            <span className="truncate font-mono text-muted-foreground">{sideFile.path}</span>
                            <button type="button" className="ml-auto rounded p-1 text-muted-foreground hover:text-foreground" onClick={() => setCodeLayout("editor")} aria-label="Close side editor">
                              <PanelRightClose className="size-3.5" aria-hidden="true" />
                            </button>
                          </div>
                          <CodeEditor path={`side-${sideFile.path}`} value={sideFile.code} onChange={(v) => updateFile(sideFile.path, v)} showMinimap={showMinimap} wordWrap={wordWrap} />
                        </div>
                      )}
                    </>
                  ) : (
                    <EmptyState isStreaming={isStreaming} />
                  )}
                </div>

                {showTerminal && (
                  <>
                    <div
                      role="separator"
                      aria-orientation="horizontal"
                      aria-label="Resize terminal"
                      tabIndex={0}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        dragState.current = { type: "term", startY: e.clientY, start: terminalHeight };
                        document.body.style.cursor = "row-resize";
                        document.body.style.userSelect = "none";
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp") setTerminalHeight((h) => Math.min(420, h + 16));
                        if (e.key === "ArrowDown") setTerminalHeight((h) => Math.max(90, h - 16));
                      }}
                      className="group relative h-[7px] shrink-0 cursor-row-resize bg-transparent transition focus-visible:outline-none"
                    >
                      <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-border transition group-hover:bg-primary/50 group-focus-visible:bg-primary/60" aria-hidden="true" />
                      <div className="absolute left-1/2 top-1/2 h-[3px] w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/0 transition group-hover:bg-primary/30 group-focus-visible:bg-primary/40" aria-hidden="true" />
                    </div>
                    <div style={{ height: terminalHeight }} className="shrink-0">
                      <BuilderTerminal
                        files={draft}
                        deps={extraDeps}
                        onCreateFile={createFile}
                        onDeleteFile={deleteFile}
                        onInstall={(pkg, ver) => setExtraDeps((d) => ({ ...d, [pkg]: ver || "latest" }))}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex h-7 shrink-0 items-center gap-3 border-t border-border px-3 text-[11px] text-muted-foreground">
          <span>{draft.filter((f) => !f.path.endsWith(".gitkeep")).length} files</span>
          {isStreaming && streamingPath && <span className="truncate font-mono text-amber-500">writing {streamingPath}</span>}
          {hasUnsaved && <span className="text-amber-500">● unsaved</span>}
          {Object.keys(extraDeps).length > 0 && <span>+{Object.keys(extraDeps).length} deps</span>}
          <div className="flex-1" />
          <span className={isStreaming ? "text-amber-500" : "text-emerald-500"} aria-live="polite">
            ● {isStreaming ? "Generating" : "Live"}
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}

function EmptyState({ isStreaming }: { isStreaming: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      {isStreaming ? (
        <>
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          <p aria-live="polite">Generating your app…</p>
        </>
      ) : (
        <p>No files yet. Send a prompt to generate an app.</p>
      )}
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
  const c = map[status];
  return (
    <span className={`hidden items-center gap-1 text-[11px] font-medium md:inline-flex ${c.cls}`} role="status" aria-live="polite">
      {c.icon}
      {c.label}
    </span>
  );
}
