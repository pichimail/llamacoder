"use client";

import { createMessage } from "@/app/(main)/actions";
import { extractAllCodeBlocks, extractFirstCodeBlock, parseReplySegments } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatCompletionStream } from "together-ai/lib/ChatCompletionStream.mjs";
import dynamic from "next/dynamic";
import ChatBox from "./chat-box";
import ChatLog from "./chat-log";
import CodeViewer, { downloadFilesAsZip } from "./code-viewer";
import type { Chat, Message } from "./page";
import { Context } from "../../providers";
import ThemeToggle from "@/components/theme-toggle";
import { toast } from "@/hooks/use-toast";
import { Code2, Database, Eye, Loader2, MessageSquare, Palette, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Tip, TooltipProvider } from "@/components/ui/tooltip";
import { ArtifactActionBar } from "@/components/chats/artifact-action-bar";
import { DesignWorkspace } from "@/components/chats/design-workspace";
import { ModeDatabase } from "@/components/chats/mode-database";
import type { ArtifactFile } from "@/lib/artifact-analysis";

const CodeRunner = dynamic(() => import("@/components/code-runner"), { ssr: false });

const MIN_CHAT_WIDTH = 260;
const MAX_CHAT_WIDTH = 720;

type BuilderMode = "preview" | "code" | "design" | "database";
type RawGeneratedFile = { path: string; code?: string; content?: string; language?: string; isPartial?: boolean };

function getMessageFiles(message: Message): RawGeneratedFile[] {
  const stored = message.files as RawGeneratedFile[] | null;
  if (stored && Array.isArray(stored) && stored.length > 0) return stored;
  return extractAllCodeBlocks(message.content) as RawGeneratedFile[];
}

function normalizeFile(file: RawGeneratedFile): ArtifactFile {
  const path = (file.path || "App.tsx").replace(/^\/+/, "");
  const code = typeof file.code === "string" ? file.code : file.content || "";
  const language = file.language || path.split(".").pop() || "tsx";
  return { path, code, language };
}

export default function PageClient({ chat }: { chat: Chat }) {
  const context = use(Context);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFullscreenPreview = searchParams.get("fs") === "1";
  const targetMessageId = searchParams.get("message");

  const [streamPromise, setStreamPromise] = useState<Promise<ReadableStream> | undefined>(context.streamPromise);
  const [streamText, setStreamText] = useState("");
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [builderMode, setBuilderMode] = useState<BuilderMode>("code");
  const [mobileView, setMobileView] = useState<"chat" | "builder">("builder");
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [designDirty, setDesignDirty] = useState(false);
  const [autoFixEnabled, setAutoFixEnabled] = useState(false);
  const [autoFixAttempt, setAutoFixAttempt] = useState(0);
  const [autoFixStatus, setAutoFixStatus] = useState<"idle" | "watching" | "fixing" | "fallback" | "ready">("idle");
  const [activeMessage, setActiveMessage] = useState(chat.messages.filter((m) => m.role === "assistant" && extractFirstCodeBlock(m.content)).at(-1));
  const [shouldFocusInput, setShouldFocusInput] = useState(false);
  const [chatPanelWidth, setChatPanelWidth] = useState(420);

  const streamPromiseRef = useRef(streamPromise);
  const streamTextRef = useRef(streamText);
  const isHandlingStreamRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const dragRef = useRef<{ startX: number; startChat: number } | null>(null);
  const autoFixAttemptRef = useRef(0);
  const autoFixPendingRef = useRef(false);
  const lastAutoFixErrorRef = useRef("");
  const lastAutoFixAtRef = useRef(0);

  useEffect(() => { streamPromiseRef.current = streamPromise; }, [streamPromise]);
  useEffect(() => { streamTextRef.current = streamText; }, [streamText]);

  useEffect(() => {
    fetch("/api/public-settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.autoFixDefault) {
          setAutoFixEnabled(true);
          setAutoFixStatus("watching");
        }
      })
      .catch(() => undefined);
  }, []);

  const assistantVersions = useMemo(() => {
    const assistants = chat.messages.filter((m) => m.role === "assistant" && ((m.files as any[])?.length || extractAllCodeBlocks(m.content).length > 0));
    return assistants.map((m, idx) => ({ id: m.id, version: (chat.assistantMessagesCountBefore || 0) + idx + 1, label: `v${(chat.assistantMessagesCountBefore || 0) + idx + 1}` }));
  }, [chat.messages, chat.assistantMessagesCountBefore]);

  const activeVersion = useMemo(() => activeMessage ? assistantVersions.find((v) => v.id === activeMessage.id) : undefined, [activeMessage, assistantVersions]);
  const activeFileCount = useMemo(() => activeMessage ? getMessageFiles(activeMessage).length : 0, [activeMessage]);

  const artifactFiles = useMemo(() => {
    const byPath = new Map<string, ArtifactFile>();
    if (activeMessage) getMessageFiles(activeMessage).forEach((file) => byPath.set(normalizeFile(file).path, normalizeFile(file)));
    parseReplySegments(streamText)
      .filter((segment) => segment.type === "file")
      .forEach((segment) => {
        const normalized = normalizeFile({ path: segment.path, code: segment.code, language: segment.language });
        byPath.set(normalized.path, normalized);
      });
    return Array.from(byPath.values());
  }, [activeMessage, streamText]);

  const setModeSafely = useCallback((mode: BuilderMode) => {
    if (builderMode === "design" && designDirty && mode !== "design") {
      if (!window.confirm("You have unsaved design changes. Leave Design mode without saving?")) return;
      setDesignDirty(false);
    }
    setBuilderMode(mode);
    setMobileView("builder");
    if (mode === "code" || mode === "preview") setActiveTab(mode);
  }, [builderMode, designDirty]);

  const handleSwitchVersion = useCallback((messageId: string) => {
    const msg = chat.messages.find((m) => m.id === messageId);
    if (!msg) return;
    setActiveMessage(msg);
    setActiveTab("code");
    setBuilderMode("code");
  }, [chat.messages]);

  const handleUndo = useCallback(() => {
    if (assistantVersions.length < 2) return;
    const currentIdx = activeMessage ? assistantVersions.findIndex((v) => v.id === activeMessage.id) : assistantVersions.length - 1;
    const targetIdx = currentIdx > 0 ? currentIdx - 1 : currentIdx === -1 ? assistantVersions.length - 2 : -1;
    if (targetIdx < 0) return;
    handleSwitchVersion(assistantVersions[targetIdx].id);
  }, [activeMessage, assistantVersions, handleSwitchVersion]);

  useEffect(() => {
    if (!targetMessageId) return;
    const target = chat.messages.find((m) => m.id === targetMessageId && m.role === "assistant");
    if (target) handleSwitchVersion(target.id);
  }, [targetMessageId, chat.messages, handleSwitchVersion]);

  const stopStreaming = useCallback(() => {
    try { abortControllerRef.current?.abort(); } catch {}
    abortControllerRef.current = null;
    setStreamText("");
    setStreamPromise(undefined);
    isHandlingStreamRef.current = false;
    autoFixPendingRef.current = false;
    setAutoFixStatus(autoFixEnabled ? "watching" : "idle");
  }, [autoFixEnabled]);

  const requestFix = useCallback(async ({ error, auto, attempt, fallback }: { error: string; auto: boolean; attempt: number; fallback: boolean }) => {
    const prefix = auto
      ? fallback
        ? "Rebuild the generated app cleanly. Fix this preview error and return the full working files."
        : "Apply a minimal patch to fix this preview error and return only changed files."
      : "The code is not working. Fix it.";
    const text = `${prefix}\n\nAttempt: ${attempt}\n\n${error.trimStart()}`;
    const message = await createMessage(chat.id, text, "user");
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const nextStreamPromise = fetch("/api/get-next-completion-stream-promise", {
      method: "POST",
      body: JSON.stringify({ messageId: message.id, model: chat.model }),
      signal: controller.signal,
    }).then(async (res) => {
      if (!res.ok) throw new Error((await res.text()) || "Failed to start generation");
      if (!res.body) throw new Error("No body on response");
      return res.body;
    });
    setStreamPromise(nextStreamPromise);
    router.refresh();
  }, [chat.id, chat.model, router]);

  const handleAutoFixEnabledChange = useCallback((enabled: boolean) => {
    setAutoFixEnabled(enabled);
    autoFixAttemptRef.current = 0;
    autoFixPendingRef.current = false;
    lastAutoFixErrorRef.current = "";
    lastAutoFixAtRef.current = 0;
    setAutoFixAttempt(0);
    setAutoFixStatus(enabled ? "watching" : "idle");
  }, []);

  const handlePreviewError = useCallback((error: string) => {
    if (!autoFixEnabled || streamPromiseRef.current || streamTextRef.current || autoFixPendingRef.current) return;
    const normalized = error.trim();
    const now = Date.now();
    const same = normalized === lastAutoFixErrorRef.current;
    if (same && now - lastAutoFixAtRef.current < 4500) return;
    if (!same) autoFixAttemptRef.current = 0;
    const nextAttempt = autoFixAttemptRef.current + 1;
    const fallback = nextAttempt > 3;
    autoFixAttemptRef.current = nextAttempt;
    autoFixPendingRef.current = true;
    lastAutoFixErrorRef.current = normalized;
    lastAutoFixAtRef.current = now;
    setAutoFixAttempt(nextAttempt);
    setAutoFixStatus(fallback ? "fallback" : "fixing");
    startTransition(async () => {
      try { await requestFix({ error, auto: true, attempt: nextAttempt, fallback }); }
      catch { autoFixPendingRef.current = false; setAutoFixStatus("watching"); }
    });
  }, [autoFixEnabled, requestFix]);

  const handlePreviewReady = useCallback(() => {
    if (!autoFixEnabled || streamPromiseRef.current || streamTextRef.current) return;
    autoFixPendingRef.current = false;
    lastAutoFixErrorRef.current = "";
    autoFixAttemptRef.current = 0;
    setAutoFixAttempt(0);
    setAutoFixStatus("ready");
  }, [autoFixEnabled]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const isInput = Boolean(activeElement && ["TEXTAREA", "INPUT", "SELECT"].includes(activeElement.tagName));
      if (((e.metaKey || e.ctrlKey) && e.key === ".") || e.key === "Escape") {
        if (streamPromise) { e.preventDefault(); stopStreaming(); }
      }
      if (e.key === "/" && !isInput && !streamPromise) { e.preventDefault(); setShouldFocusInput(true); }
      if (!isInput && e.altKey) {
        const map: Record<string, BuilderMode> = { "1": "preview", "2": "code", "3": "design", "4": "database" };
        if (map[e.key]) { e.preventDefault(); setModeSafely(map[e.key]); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [streamPromise, stopStreaming, setModeSafely]);

  useEffect(() => {
    setChatPanelWidth((width) => Math.max(MIN_CHAT_WIDTH, Math.min(MAX_CHAT_WIDTH, Math.round(window.innerWidth * 0.3) || width)));
    const move = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { startX, startChat } = dragRef.current;
      setChatPanelWidth(Math.max(MIN_CHAT_WIDTH, Math.min(MAX_CHAT_WIDTH, startChat + e.clientX - startX)));
    };
    const up = () => {
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  const onSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startChat: chatPanelWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const onSplitterKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 48 : 16;
    if (e.key === "ArrowLeft") { e.preventDefault(); setChatPanelWidth((w) => Math.max(MIN_CHAT_WIDTH, w - step)); }
    if (e.key === "ArrowRight") { e.preventDefault(); setChatPanelWidth((w) => Math.min(MAX_CHAT_WIDTH, w + step)); }
  };

  useEffect(() => {
    async function readStream() {
      if (!streamPromise || isHandlingStreamRef.current) return;
      isHandlingStreamRef.current = true;
      context.setStreamPromise(undefined);
      let stream: ReadableStream | null = null;
      try { stream = await streamPromise; }
      catch { isHandlingStreamRef.current = false; abortControllerRef.current = null; setStreamPromise(undefined); return; }
      if (!stream) { isHandlingStreamRef.current = false; setStreamPromise(undefined); return; }
      let didPushToCode = false;
      try {
        ChatCompletionStream.fromReadableStream(stream)
          .on("content", (delta, content) => {
            if (!streamPromiseRef.current) return;
            setStreamText((text) => text + delta);
            if (!didPushToCode && parseReplySegments(content).some((seg) => seg.type === "file")) {
              didPushToCode = true;
              setActiveTab("code");
              setBuilderMode("code");
              setMobileView("builder");
            }
          })
          .on("finalContent", async (finalText) => {
            abortControllerRef.current = null;
            startTransition(async () => {
              const previousFiles = chat.messages.filter((m) => m.role === "assistant" && extractAllCodeBlocks(m.content).length > 0).flatMap((m) => getMessageFiles(m));
              const currentFiles = extractAllCodeBlocks(finalText) as RawGeneratedFile[];
              const fileMap = new Map<string, RawGeneratedFile>();
              previousFiles.forEach((file) => fileMap.set(file.path, file));
              currentFiles.forEach((file) => fileMap.set(file.path, file));
              const message = await createMessage(chat.id, finalText, "assistant", Array.from(fileMap.values()));
              startTransition(() => {
                isHandlingStreamRef.current = false;
                setStreamText("");
                setStreamPromise(undefined);
                autoFixPendingRef.current = false;
                if (autoFixEnabled) setAutoFixStatus("watching");
                setActiveMessage(message);
                setActiveTab("code");
                setBuilderMode("code");
                setMobileView("builder");
                setChatCollapsed(false);
                router.refresh();
              });
            });
          });
      } catch (error) {
        console.error(error);
        isHandlingStreamRef.current = false;
        setStreamPromise(undefined);
      }
    }
    readStream();
  }, [chat.id, chat.messages, router, streamPromise, context, autoFixEnabled]);

  const handleSaveFiles = useCallback((files: { path: string; code: string; language: string }[]) => {
    startTransition(async () => {
      const content = "Manual edit saved from the code editor.\n\n" + files.map((f) => "```" + f.language + "{path=" + f.path + "}\n" + f.code + "\n```").join("\n\n");
      const newMessage = await createMessage(chat.id, content, "assistant", files);
      setActiveMessage(newMessage);
      router.refresh();
    });
  }, [chat.id, router]);

  const handleDownloadZip = useCallback(() => {
    const files = activeMessage ? getMessageFiles(activeMessage).map(normalizeFile) : [];
    void downloadFilesAsZip(files, chat.title || "app");
  }, [activeMessage, chat.title]);

  const renderBuilderSurface = () => {
    if (builderMode === "design") {
      return (
        <DesignWorkspace
          chatId={chat.id}
          files={artifactFiles}
          isStreaming={!!streamPromise}
          onRequestFix={(error) => startTransition(async () => requestFix({ error, auto: false, attempt: 1, fallback: false }))}
          onPreviewError={handlePreviewError}
          onPreviewReady={handlePreviewReady}
          onDirtyChange={setDesignDirty}
          onSaved={(message) => { setDesignDirty(false); if (message) setActiveMessage(message as Message); router.refresh(); }}
        />
      );
    }
    if (builderMode === "database") return <ModeDatabase chatId={chat.id} files={artifactFiles} />;
    return (
      <CodeViewer
        streamText={streamText}
        chat={chat}
        message={activeMessage}
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setBuilderMode(tab); setMobileView("builder"); }}
        onRequestFix={(error) => startTransition(async () => requestFix({ error, auto: false, attempt: 1, fallback: false }))}
        onPreviewError={handlePreviewError}
        onPreviewReady={handlePreviewReady}
        onSaveFiles={handleSaveFiles}
        autoFixEnabled={autoFixEnabled}
        onAutoFixEnabledChange={handleAutoFixEnabledChange}
        autoFixAttempt={autoFixAttempt}
        autoFixStatus={autoFixStatus}
      />
    );
  };

  if (isFullscreenPreview) {
    const files = activeMessage ? getMessageFiles(activeMessage) : [];
    return (
      <main className="h-dvh w-full bg-background text-foreground" aria-label={`Fullscreen preview of ${chat.title}`}>
        {files.length > 0 ? <CodeRunner files={files.map((f) => ({ path: f.path, content: f.code ?? f.content ?? "" }))} /> : <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground"><Loader2 className="size-5 animate-spin" /><p>No generated version to preview yet.</p></div>}
      </main>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
        <header className="grid h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-border bg-card px-3 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <Tip label={chatCollapsed ? "Expand chat rail" : "Collapse chat rail"}>
              <button type="button" onClick={() => setChatCollapsed((value) => !value)} className="hidden size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring md:inline-flex" aria-label={chatCollapsed ? "Expand chat panel" : "Collapse chat panel"} aria-pressed={chatCollapsed}>
                {chatCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
              </button>
            </Tip>
            <div className="flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground">
              <span className="font-mono">{activeVersion ? activeVersion.label : "—"}</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden max-w-[220px] truncate sm:inline">{chat.title}</span>
            </div>
          </div>

          <div className="hidden items-center rounded-lg border border-border bg-background p-0.5 md:flex" role="tablist" aria-label="Artifact mode">
            <BuilderModeButton mode="preview" current={builderMode} label="Preview" icon={<Eye className="size-3.5" />} onClick={() => setModeSafely("preview")} />
            <BuilderModeButton mode="code" current={builderMode} label="Code" icon={<Code2 className="size-3.5" />} onClick={() => setModeSafely("code")} />
            <BuilderModeButton mode="design" current={builderMode} label="Design" icon={<Palette className="size-3.5" />} onClick={() => setModeSafely("design")} />
            <BuilderModeButton mode="database" current={builderMode} label="Database" icon={<Database className="size-3.5" />} onClick={() => setModeSafely("database")} />
          </div>

          <div className="flex items-center justify-end gap-1">
            <div className="mr-1 flex items-center rounded-lg border border-border p-0.5 md:hidden" role="tablist" aria-label="Mobile view">
              <button role="tab" aria-selected={mobileView === "chat"} onClick={() => setMobileView("chat")} className={`inline-flex size-7 items-center justify-center rounded-md ${mobileView === "chat" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`} aria-label="Chat view"><MessageSquare className="size-3.5" /></button>
              <button role="tab" aria-selected={mobileView === "builder"} onClick={() => setMobileView("builder")} className={`inline-flex size-7 items-center justify-center rounded-md ${mobileView === "builder" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`} aria-label="Builder view">{builderMode === "preview" ? <Eye className="size-3.5" /> : builderMode === "design" ? <Palette className="size-3.5" /> : builderMode === "database" ? <Database className="size-3.5" /> : <Code2 className="size-3.5" />}</button>
            </div>
            <ArtifactActionBar chatId={chat.id} chatTitle={chat.title} activeMessageId={activeMessage?.id} activeVersionLabel={activeVersion?.label} versions={assistantVersions} files={artifactFiles} onSwitchVersion={handleSwitchVersion} onDownload={handleDownloadZip} />
            <ThemeToggle />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <section style={{ ["--chat-w" as any]: chatPanelWidth + "px" }} className={`${mobileView === "chat" ? "flex" : "hidden"} h-full w-full flex-col overflow-hidden bg-card ${chatCollapsed ? "md:hidden" : "md:flex"} md:h-auto md:w-[var(--chat-w)] md:min-w-[260px] md:max-w-[720px] md:border-r md:border-border`} aria-label="Chat panel">
            {activeMessage && activeVersion && <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2 text-xs"><span className="inline-flex items-center rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-emerald-600 dark:text-emerald-400">{activeVersion.label}</span><span className="font-medium text-foreground">Version {activeVersion.version}</span><span className="text-muted-foreground">• {activeFileCount} file{activeFileCount === 1 ? "" : "s"}</span></div>}
            <div className="min-h-0 flex-1 overflow-hidden"><ChatLog chat={chat} streamText={streamText} activeMessage={activeMessage} onMessageClick={(message) => { if (message !== activeMessage) { setActiveMessage(message); setActiveTab("code"); setBuilderMode("code"); } }} /></div>
            <div className="shrink-0 border-t border-border bg-card p-3"><ChatBox chat={chat} onNewStreamPromise={(promise) => { setStreamPromise(promise); setBuilderMode("code"); setMobileView("builder"); setChatCollapsed(false); }} onAbortController={(c) => { abortControllerRef.current = c; }} isStreaming={!!streamPromise} onStop={stopStreaming} onUndo={handleUndo} versions={assistantVersions} currentVersionId={activeMessage?.id} onSwitchVersion={handleSwitchVersion} shouldFocusInput={shouldFocusInput} onInputFocused={() => setShouldFocusInput(false)} /></div>
          </section>

          <div role="separator" tabIndex={0} aria-orientation="vertical" aria-label="Resize chat panel" aria-valuemin={MIN_CHAT_WIDTH} aria-valuemax={MAX_CHAT_WIDTH} aria-valuenow={chatPanelWidth} onMouseDown={onSplitterMouseDown} onKeyDown={onSplitterKeyDown} className={`${chatCollapsed ? "hidden" : "hidden md:block"} group relative z-10 w-[7px] flex-shrink-0 cursor-col-resize bg-transparent transition focus-visible:outline-none`}><div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition group-hover:bg-primary/50 group-focus-visible:bg-primary/60" /><div className="absolute left-1/2 top-1/2 h-10 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/0 transition group-hover:bg-primary/30 group-focus-visible:bg-primary/40" /></div>

          <section className={`${mobileView === "builder" ? "flex" : "hidden"} min-h-0 flex-1 flex-col overflow-hidden bg-background md:flex md:min-w-[360px]`} aria-label="Artifact builder panel">
            <div className="border-b border-border bg-card px-2 py-1 md:hidden"><div className="grid grid-cols-4 gap-1" role="tablist" aria-label="Artifact mode"><BuilderModeButton mode="preview" current={builderMode} label="Preview" icon={<Eye className="size-3.5" />} onClick={() => setModeSafely("preview")} compact /><BuilderModeButton mode="code" current={builderMode} label="Code" icon={<Code2 className="size-3.5" />} onClick={() => setModeSafely("code")} compact /><BuilderModeButton mode="design" current={builderMode} label="Design" icon={<Palette className="size-3.5" />} onClick={() => setModeSafely("design")} compact /><BuilderModeButton mode="database" current={builderMode} label="DB" icon={<Database className="size-3.5" />} onClick={() => setModeSafely("database")} compact /></div></div>
            {renderBuilderSurface()}
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}

function BuilderModeButton({ mode, current, label, icon, onClick, compact }: { mode: BuilderMode; current: BuilderMode; label: string; icon: React.ReactNode; onClick: () => void; compact?: boolean }) {
  const active = current === mode;
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"} ${compact ? "w-full" : ""}`} title={label}>{icon}<span className={compact ? "sr-only" : "hidden lg:inline"}>{label}</span></button>;
}
