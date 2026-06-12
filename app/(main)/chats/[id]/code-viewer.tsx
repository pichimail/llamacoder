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
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { extractAllCodeBlocks } from "@/lib/utils";
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

const CodeRunner = dynamic(() => import("@/components/code-runner"), {
  ssr: false,
});
const CodeEditor = dynamic(() => import("@/components/code-editor"), {
  ssr: false,
});

type ViewerFile = { path: string; code: string; language: string };

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

/* ---------------- file tree ---------------- */

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
  collapsed,
  onToggle,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selected: string | null;
  dirty: Set<string>;
  collapsed: Set<string>;
  onToggle: (p: string) => void;
  onSelect: (p: string) => void;
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
            <button
              key={child.path}
              onClick={() => onSelect(child.path)}
              aria-current={selected === child.path ? "true" : undefined}
              style={{ paddingLeft: 10 + depth * 12 }}
              className={`flex w-full items-center gap-1.5 py-1 pr-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ${
                selected === child.path
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              }`}
            >
              <FileCode2
                className="size-3.5 shrink-0 text-emerald-500"
                aria-hidden="true"
              />
              <span className="truncate font-mono text-[11px]">
                {child.name}
              </span>
              {dirty.has(child.path) && (
                <span
                  className="ml-auto size-1.5 shrink-0 rounded-full bg-amber-400"
                  aria-label="Unsaved changes"
                />
              )}
            </button>
          )
        ) : (
          <Fragment key={child.path}>
            <button
              onClick={() => onToggle(child.path)}
              aria-expanded={!collapsed.has(child.path)}
              style={{ paddingLeft: 10 + depth * 12 }}
              className="flex w-full items-center gap-1.5 py-1 pr-2 text-left text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
            >
              {collapsed.has(child.path) ? (
                <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-3 shrink-0" aria-hidden="true" />
              )}
              {collapsed.has(child.path) ? (
                <Folder className="size-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <FolderOpen className="size-3.5 shrink-0" aria-hidden="true" />
              )}
              <span className="truncate text-[11px] font-medium">
                {child.name}
              </span>
            </button>
            {!collapsed.has(child.path) && (
              <Tree
                node={child}
                depth={depth + 1}
                selected={selected}
                dirty={dirty}
                collapsed={collapsed}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            )}
          </Fragment>
        ),
      )}
    </>
  );
}

/* ---------------- main viewer ---------------- */

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
}) {
  const streamAllFiles = useMemo(
    () => extractAllCodeBlocks(streamText),
    [streamText],
  );

  const baseFiles: ViewerFile[] = useMemo(() => {
    if (!message) return streamAllFiles;
    const stored = message.files as ViewerFile[] | null;
    if (stored && Array.isArray(stored) && stored.length > 0) return stored;
    return extractAllCodeBlocks(message.content);
  }, [message, streamAllFiles]);

  // Draft workspace: edits, terminal file-ops and installs apply here live.
  const [draft, setDraft] = useState<ViewerFile[]>(baseFiles);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [extraDeps, setExtraDeps] = useState<Record<string, string>>({});
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [refresh, setRefresh] = useState(0);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(180);
  const [treeWidth, setTreeWidth] = useState(190);
  const [creating, setCreating] = useState<null | "file" | "folder">(null);
  const [newName, setNewName] = useState("");
  const editorApiRef = useRef<{ undo: () => void; redo: () => void } | null>(
    null,
  );
  const baseKey = useMemo(
    () => baseFiles.map((f) => f.path).join("|") + (message?.id ?? "stream"),
    [baseFiles, message?.id],
  );

  // Reset draft whenever the active version changes
  useEffect(() => {
    setDraft(baseFiles);
    setDirty(new Set());
    setSelectedPath((prev) =>
      prev && baseFiles.some((f) => f.path === prev)
        ? prev
        : (baseFiles[0]?.path ?? null),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseKey]);

  const selectedFile =
    draft.find((f) => f.path === selectedPath) || draft[0] || null;

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
  }, []);

  const hasUnsaved = dirty.size > 0;

  const saveAll = useCallback(() => {
    if (!hasUnsaved) return;
    onSaveFiles(draft.filter((f) => !f.path.endsWith(".gitkeep")));
    setDirty(new Set());
    toast({ title: "Saved", description: "Changes stored as a new version." });
  }, [draft, hasUnsaved, onSaveFiles]);

  // Keyboard: Cmd/Ctrl+S save (undo/redo are native in Monaco)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveAll]);

  // Splitter drags
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
        setTreeWidth(
          Math.max(130, Math.min(340, d.start + (e.clientX - d.startX))),
        );
      } else {
        setTerminalHeight(
          Math.max(90, Math.min(420, d.start - (e.clientY - d.startY))),
        );
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

  const tree = useMemo(
    () => buildTree(draft.map((f) => f.path)),
    [draft],
  );

  const isStreaming = !!streamText;

  const iconBtn =
    "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40";

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
        {/* Toolbar — icon-only, deduplicated (Download/Share live in the page header) */}
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-2 text-sm">
          <div
            className="flex items-center gap-0.5"
            role="tablist"
            aria-label="Output view"
          >
            {(["code", "preview"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => onTabChange(tab)}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
                  activeTab === tab
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <AutoFixStatusBadge
              status={autoFixStatus}
              attempt={autoFixAttempt}
            />
            <Tip label="Auto-fix preview errors">
              <span className="inline-flex items-center gap-1.5 px-1.5">
                <Wand2
                  className="size-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
                <Switch
                  checked={autoFixEnabled}
                  onCheckedChange={onAutoFixEnabledChange}
                  aria-label="Toggle automatic error fixing"
                />
              </span>
            </Tip>

            <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

            {activeTab === "code" && (
              <>
                {hasUnsaved && (
                  <Tip label="Save changes as new version (⌘S)">
                    <button
                      onClick={saveAll}
                      className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-600 px-2 text-xs font-medium text-white transition hover:bg-emerald-500"
                      aria-label="Save changes"
                    >
                      <Save className="size-3.5" aria-hidden="true" /> Save
                    </button>
                  </Tip>
                )}
                <Tip label="Undo (⌘Z)">
                  <button
                    className={iconBtn}
                    onClick={() => editorApiRef.current?.undo()}
                    aria-label="Undo"
                  >
                    <Undo2 className="size-3.5" aria-hidden="true" />
                  </button>
                </Tip>
                <Tip label="Redo (⇧⌘Z)">
                  <button
                    className={iconBtn}
                    onClick={() => editorApiRef.current?.redo()}
                    aria-label="Redo"
                  >
                    <Redo2 className="size-3.5" aria-hidden="true" />
                  </button>
                </Tip>
                <Tip label="Toggle terminal">
                  <button
                    className={`${iconBtn} ${showTerminal ? "bg-accent text-foreground" : ""}`}
                    onClick={() => setShowTerminal((v) => !v)}
                    aria-pressed={showTerminal}
                    aria-label="Toggle terminal"
                  >
                    <TerminalSquare className="size-3.5" aria-hidden="true" />
                  </button>
                </Tip>
              </>
            )}
            <Tip label="Refresh preview">
              <button
                className={iconBtn}
                onClick={() => setRefresh((r) => r + 1)}
                aria-label="Refresh preview"
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
              </button>
            </Tip>
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {activeTab === "code" && (
            <>
              {/* Single file tree explorer */}
              <nav
                style={{ width: treeWidth }}
                className="hidden shrink-0 flex-col overflow-hidden border-r border-border sm:flex"
                aria-label="Project files"
              >
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Files ({draft.filter((f) => !f.path.endsWith(".gitkeep")).length})
                  </span>
                  <span className="flex items-center">
                    <Tip label="New file">
                      <button
                        className={iconBtn}
                        onClick={() => {
                          setCreating("file");
                          setNewName("");
                        }}
                        aria-label="New file"
                      >
                        <FilePlus2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </Tip>
                    <Tip label="New folder">
                      <button
                        className={iconBtn}
                        onClick={() => {
                          setCreating("folder");
                          setNewName("");
                        }}
                        aria-label="New folder"
                      >
                        <FolderPlus className="size-3.5" aria-hidden="true" />
                      </button>
                    </Tip>
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
                      placeholder={
                        creating === "file" ? "path/name.tsx" : "folder/name"
                      }
                      aria-label={`New ${creating} name`}
                      className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-[11px] focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </form>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto pb-2 text-xs">
                  <Tree
                    node={tree}
                    depth={0}
                    selected={selectedPath}
                    dirty={dirty}
                    collapsed={collapsed}
                    onToggle={(p) =>
                      setCollapsed((s) => {
                        const n = new Set(s);
                        n.has(p) ? n.delete(p) : n.add(p);
                        return n;
                      })
                    }
                    onSelect={setSelectedPath}
                  />
                </div>
              </nav>

              {/* Tree <-> editor splitter */}
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize file tree"
                tabIndex={0}
                onMouseDown={(e) => {
                  e.preventDefault();
                  dragState.current = {
                    type: "tree",
                    startX: e.clientX,
                    start: treeWidth,
                  };
                  document.body.style.cursor = "col-resize";
                  document.body.style.userSelect = "none";
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft")
                    setTreeWidth((w) => Math.max(130, w - 12));
                  if (e.key === "ArrowRight")
                    setTreeWidth((w) => Math.min(340, w + 12));
                }}
                className="hidden w-[3px] shrink-0 cursor-col-resize bg-transparent transition hover:bg-primary/40 focus-visible:bg-primary/50 focus-visible:outline-none sm:block"
              />
            </>
          )}

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {activeTab === "preview" ? (
              <div
                role="tabpanel"
                aria-label="Live preview"
                className="min-h-0 flex-1 overflow-hidden"
              >
                {runnerFiles.length > 0 ? (
                  <CodeRunner
                    key={refresh}
                    files={runnerFiles}
                    extraDependencies={extraDeps}
                    onRequestFix={onRequestFix}
                    onPreviewError={onPreviewError}
                    onPreviewReady={onPreviewReady}
                    previewMode="web"
                  />
                ) : (
                  <EmptyState isStreaming={isStreaming} />
                )}
              </div>
            ) : (
              <div
                role="tabpanel"
                aria-label="Code editor"
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                {selectedFile ? (
                  <CodeEditor
                    path={selectedFile.path}
                    value={selectedFile.code}
                    onChange={(v) => updateFile(selectedFile.path, v)}
                    onEditorReady={(api) => (editorApiRef.current = api)}
                  />
                ) : (
                  <EmptyState isStreaming={isStreaming} />
                )}

                {showTerminal && (
                  <>
                    <div
                      role="separator"
                      aria-orientation="horizontal"
                      aria-label="Resize terminal"
                      tabIndex={0}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        dragState.current = {
                          type: "term",
                          startY: e.clientY,
                          start: terminalHeight,
                        };
                        document.body.style.cursor = "row-resize";
                        document.body.style.userSelect = "none";
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp")
                          setTerminalHeight((h) => Math.min(420, h + 16));
                        if (e.key === "ArrowDown")
                          setTerminalHeight((h) => Math.max(90, h - 16));
                      }}
                      className="h-[3px] shrink-0 cursor-row-resize border-t border-border bg-transparent transition hover:bg-primary/40 focus-visible:bg-primary/50 focus-visible:outline-none"
                    />
                    <div style={{ height: terminalHeight }} className="shrink-0">
                      <BuilderTerminal
                        files={draft}
                        deps={extraDeps}
                        onCreateFile={createFile}
                        onDeleteFile={deleteFile}
                        onInstall={(pkg, ver) =>
                          setExtraDeps((d) => ({ ...d, [pkg]: ver || "latest" }))
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex h-7 shrink-0 items-center gap-3 border-t border-border px-3 text-[11px] text-muted-foreground">
          <span>
            {draft.filter((f) => !f.path.endsWith(".gitkeep")).length} files
          </span>
          {hasUnsaved && <span className="text-amber-500">● unsaved</span>}
          {Object.keys(extraDeps).length > 0 && (
            <span>+{Object.keys(extraDeps).length} deps</span>
          )}
          <div className="flex-1" />
          <span
            className={
              isStreaming ? "text-amber-500" : "text-emerald-500"
            }
            aria-live="polite"
          >
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

function AutoFixStatusBadge({
  status,
  attempt,
}: {
  status: AutoFixStatus;
  attempt: number;
}) {
  if (status === "idle") return null;
  const map = {
    watching: {
      label: "Watching",
      cls: "text-muted-foreground",
      icon: <Eye className="size-3" aria-hidden="true" />,
    },
    fixing: {
      label: `Fixing ${Math.min(attempt, 3)}/3`,
      cls: "text-amber-500",
      icon: <Loader2 className="size-3 animate-spin" aria-hidden="true" />,
    },
    fallback: {
      label: "Rebuilding",
      cls: "text-orange-500",
      icon: <Loader2 className="size-3 animate-spin" aria-hidden="true" />,
    },
    ready: {
      label: "Healthy",
      cls: "text-emerald-500",
      icon: <CheckCircle2 className="size-3" aria-hidden="true" />,
    },
  } as const;
  const c = map[status];
  return (
    <span
      className={`hidden items-center gap-1 text-[11px] font-medium md:inline-flex ${c.cls}`}
      role="status"
      aria-live="polite"
    >
      {c.icon}
      {c.label}
    </span>
  );
}
