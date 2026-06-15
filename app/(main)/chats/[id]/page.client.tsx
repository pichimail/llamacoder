"use client";

import { createMessage } from "@/app/(main)/actions";
import { toast } from "@/hooks/use-toast";
import { extractAllCodeBlocks, extractFirstCodeBlock, parseReplySegments } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { ChatCompletionStream } from "together-ai/lib/ChatCompletionStream.mjs";
import dynamic from "next/dynamic";
import ChatBox from "./chat-box";
import ChatLog from "./chat-log";
import CodeViewer, { downloadFilesAsZip } from "./code-viewer";
import type { Chat, Message, SidebarChat } from "./page";
import { Context } from "../../providers";
import ThemeToggle from "@/components/theme-toggle";
import { Code2, Database, Download, ExternalLink, Eye, GitPullRequest, Layers, Loader2, Menu, MessageSquare, Monitor, MoreHorizontal, Palette, PanelLeftClose, PanelLeftOpen, Share2, Smartphone } from "lucide-react";
import { Tip, TooltipProvider } from "@/components/ui/tooltip";
import { ArtifactActionBar } from "@/components/chats/artifact-action-bar";
import { ChatsContextMenu } from "@/components/chats/chats-context-menu";
import { DesignWorkspace } from "@/components/chats/design-workspace";
import { ModeDatabase } from "@/components/chats/mode-database";
import { Sidebar } from "@/components/chats/sidebar";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import type { ArtifactFile } from "@/lib/artifact-analysis";
import type { PreviewMode } from "@/components/code-runner-react";

const CodeRunner = dynamic(() => import("@/components/code-runner"), { ssr: false });

const MIN_CHAT_WIDTH = 260;
const MAX_CHAT_WIDTH = 720;

type BuilderMode = "preview" | "code" | "design" | "database";
type MobilePanel = "chat" | "code" | "preview";
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

export default function PageClient({ chat, sidebarChats = [] }: { chat: Chat; sidebarChats?: SidebarChat[] }) {
  const context = use(Context);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFullscreenPreview = searchParams.get("fs") === "1";
  const targetMessageId = searchParams.get("message");

  const [streamPromise, setStreamPromise] = useState<Promise<ReadableStream> | undefined>(context.streamPromise);
  const [streamText, setStreamText] = useState("");
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [builderMode, setBuilderMode] = useState<BuilderMode>("code");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("code");
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [appSidebarCollapsed, setAppSidebarCollapsed] = useState(true);
  const [mobileAppMenuOpen, setMobileAppMenuOpen] = useState(false);
  const [mobileOptionsOpen, setMobileOptionsOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [designDirty, setDesignDirty] = useState(false);
  const [designSaveRequest, setDesignSaveRequest] = useState(0);
  const [pendingMode, setPendingMode] = useState<BuilderMode | null>(null);
  const [showUnsavedOverlay, setShowUnsavedOverlay] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("web");
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
    if (activeMessage) getMessageFiles(activeMessage).forEach((file) => {
      const normalized = normalizeFile(file);
      byPath.set(normalized.path, normalized);
    });
    parseReplySegments(streamText)
      .filter((segment) => segment.type === "file")
      .forEach((segment) => {
        const normalized = normalizeFile({ path: segment.path, code: segment.code, language: segment.language });
        byPath.set(normalized.path, normalized);
      });
    return Array.from(byPath.values());
  }, [activeMessage, streamText]);

  const applyMode = useCallback((mode: BuilderMode) => {
    setBuilderMode(mode);
    if (mode === "code" || mode === "preview") setActiveTab(mode);
  }, []);

  const setModeSafely = useCallback((mode: BuilderMode) => {
    if (builderMode === "design" && designDirty && mode !== "design") {
      setPendingMode(mode);
      setShowUnsavedOverlay(true);
      return;
    }
    applyMode(mode);
  }, [applyMode, builderMode, designDirty]);

  const switchMobilePanel = useCallback((panel: MobilePanel) => {
    setMobilePanel(panel);
    if (panel === "code") setModeSafely("code");
    if (panel === "preview") setModeSafely("preview");
  }, [setModeSafely]);

  const handleSwitchVersion = useCallback((messageId: string) => {
    const msg = chat.messages.find((m) => m.id === messageId);
    if (!msg) return;
    setActiveMessage(msg);
    setActiveTab("code");
    setBuilderMode("code");
    setMobilePanel("code");
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
    const prefix = auto ? (fallback ? "Rebuild the generated app cleanly. Fix this preview error and return the full working files." : "Apply a minimal patch to fix this preview error and return only changed files.") : "The code is not working. Fix it.";
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
    setMobilePanel("code");
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
        if (showUnsavedOverlay) { e.preventDefault(); setShowUnsavedOverlay(false); }
      }
      if (e.key === "/" && !isInput && !streamPromise) { e.preventDefault(); setShouldFocusInput(true); }
      if (!isInput && e.altKey) {
        const map: Record<string, BuilderMode> = { "1": "preview", "2": "code", "3": "design", "4": "database" };
        if (map[e.key]) { e.preventDefault(); setModeSafely(map[e.key]); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [streamPromise, stopStreaming, setModeSafely, showUnsavedOverlay]);

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

  const onSplitterMouseDown = (e: ReactMouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startChat: chatPanelWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const onSplitterKeyDown = (e: ReactKeyboardEvent) => {
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
              setMobilePanel("code");
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
                setMobilePanel("code");
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

  const handleShareLink = useCallback(async () => {
    if (!activeMessage?.id) return;
    const url = `${window.location.origin}/share/v2/${activeMessage.id}`;
    await navigator.clipboard.writeText(url).catch(() => undefined);
    toast({ title: "Share link copied", description: url });
  }, [activeMessage?.id]);

  const handleCopyCurrentUrl = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href).catch(() => undefined);
    toast({ title: "Chat URL copied" });
  }, []);

  const workspaceRequest = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    const response = await fetch(`/api/workspace/${chat.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok && !data.reason) throw new Error(data.error || "Workspace request failed");
    return data as any;
  }, [chat.id]);

  const handlePublishMobile = useCallback(async () => {
    if (!activeMessage?.id || artifactFiles.length === 0) return;
    try {
      const result = await workspaceRequest("publish", { messageId: activeMessage.id, files: artifactFiles });
      const absoluteUrl = `${window.location.origin}${result.url}`;
      await navigator.clipboard.writeText(absoluteUrl).catch(() => undefined);
      toast({ title: "Published", description: "Live share link copied." });
      window.open(absoluteUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({ title: "Publish failed", description: error instanceof Error ? error.message : "Could not publish.", variant: "destructive" });
    }
  }, [activeMessage?.id, artifactFiles, workspaceRequest]);

  const handleCreatePrMobile = useCallback(async () => {
    try {
      const result = await workspaceRequest("create-pr", { files: artifactFiles });
      if (result.ok === false) {
        toast({ title: "GitHub not ready", description: result.reason || "Connect GitHub first.", variant: "destructive" });
        return;
      }
      toast({ title: "PR request created", description: `${result.fileCount ?? artifactFiles.length} files prepared for GitHub.` });
    } catch (error) {
      toast({ title: "PR failed", description: error instanceof Error ? error.message : "Could not create PR.", variant: "destructive" });
    }
  }, [artifactFiles, workspaceRequest]);

  const handleWorkspaceContextMenu = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < 768) return;
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  }, []);

  const switchModeFromMenu = useCallback((mode: BuilderMode) => {
    setModeSafely(mode);
    if (mode === "preview" || mode === "design" || mode === "database") setMobilePanel("preview");
    if (mode === "code") setMobilePanel("code");
  }, [setModeSafely]);

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
          onSaved={(message) => {
            setDesignDirty(false);
            setShowUnsavedOverlay(false);
            if (message) setActiveMessage(message as Message);
            if (pendingMode) {
              applyMode(pendingMode);
              setPendingMode(null);
            }
            router.refresh();
          }}
          saveRequest={designSaveRequest}
          previewMode={previewMode}
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
        onTabChange={(tab) => {
          setActiveTab(tab);
          setBuilderMode(tab);
          setMobilePanel(tab === "preview" ? "preview" : "code");
        }}
        onRequestFix={(error) => startTransition(async () => requestFix({ error, auto: false, attempt: 1, fallback: false }))}
        onPreviewError={handlePreviewError}
        onPreviewReady={handlePreviewReady}
        onSaveFiles={handleSaveFiles}
        autoFixEnabled={autoFixEnabled}
        onAutoFixEnabledChange={handleAutoFixEnabledChange}
        autoFixAttempt={autoFixAttempt}
        autoFixStatus={autoFixStatus}
        previewMode={previewMode}
        onPreviewModeChange={setPreviewMode}
      />
    );
  };

  if (isFullscreenPreview) {
    const files = activeMessage ? getMessageFiles(activeMessage) : [];
    return <main className="h-dvh w-full bg-background text-foreground" aria-label={`Fullscreen preview of ${chat.title}`}>{files.length > 0 ? <CodeRunner files={files.map((f) => ({ path: f.path, content: f.code ?? f.content ?? "" }))} previewMode={previewMode} showDeviceToggle /> : <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground"><Loader2 className="size-5 animate-spin" /><p>No generated version to preview yet.</p></div>}</main>;
  }

  const nextPreviewMode = previewMode === "web" ? "mobile" : "web";
  const canAct = !!activeMessage?.id && artifactFiles.length > 0;

  return (
    <TooltipProvider>
      <div className="flex h-dvh overflow-hidden bg-background text-foreground" onContextMenu={handleWorkspaceContextMenu}>
        <Sidebar
          currentChatId={chat.id}
          chats={sidebarChats}
          collapsed={mobileAppMenuOpen ? false : appSidebarCollapsed}
          mobileOpen={mobileAppMenuOpen}
          onMobileOpenChange={setMobileAppMenuOpen}
          onToggleCollapse={() => setAppSidebarCollapsed((value) => !value)}
          onNewChat={() => router.push("/")}
          onSelectChat={(chatId) => router.push(`/chats/${chatId}`)}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="grid h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-border/70 bg-transparent px-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <Tip label="Open app menu">
                <button type="button" onClick={() => setMobileAppMenuOpen(true)} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring md:hidden" aria-label="Open app menu"><Menu className="size-4" /></button>
              </Tip>
              <Tip label={chatCollapsed ? "Expand chat rail" : "Collapse chat rail"}>
                <button type="button" onClick={() => setChatCollapsed((value) => !value)} className="hidden size-8 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring md:inline-flex" aria-label={chatCollapsed ? "Expand chat panel" : "Collapse chat panel"} aria-pressed={chatCollapsed}>{chatCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}</button>
              </Tip>
              <div className="hs-version-pill flex min-w-0 items-center gap-1.5 rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground">
                <span className="font-mono">{activeVersion ? activeVersion.label : "—"}</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden max-w-[220px] truncate sm:inline">{chat.title}</span>
              </div>
            </div>

            <div className="hidden items-center rounded-lg border border-border/70 bg-transparent p-0.5 md:flex" role="tablist" aria-label="Artifact mode">
              <BuilderModeButton mode="preview" current={builderMode} label="Preview" icon={<Eye className="size-3.5" />} onClick={() => setModeSafely("preview")} />
              <BuilderModeButton mode="code" current={builderMode} label="Code" icon={<Code2 className="size-3.5" />} onClick={() => setModeSafely("code")} />
              <BuilderModeButton mode="design" current={builderMode} label="Design" icon={<Palette className="size-3.5" />} onClick={() => setModeSafely("design")} />
              <BuilderModeButton mode="database" current={builderMode} label="Database" icon={<Database className="size-3.5" />} onClick={() => setModeSafely("database")} />
            </div>

            <div className="flex items-center justify-end gap-1">
              <div className="flex items-center rounded-lg border border-border/70 bg-transparent p-0.5 md:hidden" role="tablist" aria-label="Mobile panels">
                <MobilePanelButton panel="chat" current={mobilePanel} label="Chat" icon={<MessageSquare className="size-3.5" />} onClick={() => switchMobilePanel("chat")} />
                <MobilePanelButton panel="code" current={mobilePanel} label="Code" icon={<Code2 className="size-3.5" />} onClick={() => switchMobilePanel("code")} />
                <MobilePanelButton panel="preview" current={mobilePanel} label="Preview" icon={<Eye className="size-3.5" />} onClick={() => switchMobilePanel("preview")} />
              </div>
              <button type="button" onClick={() => setMobileOptionsOpen(true)} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring md:hidden" aria-label="Open mobile options"><MoreHorizontal className="size-4" /></button>
              {(builderMode === "preview" || builderMode === "design") && <Tip label={`Switch to ${nextPreviewMode} preview`}><button type="button" onClick={() => setPreviewMode(nextPreviewMode)} className="hidden size-8 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring md:inline-flex" aria-label={`Switch to ${nextPreviewMode} preview`}>{previewMode === "web" ? <Smartphone className="size-4" /> : <Monitor className="size-4" />}</button></Tip>}
              <div className="hidden md:flex"><ArtifactActionBar chatId={chat.id} chatTitle={chat.title} activeMessageId={activeMessage?.id} activeVersionLabel={activeVersion?.label} versions={assistantVersions} files={artifactFiles} onSwitchVersion={handleSwitchVersion} onDownload={handleDownloadZip} /></div>
              <div className="hidden md:block"><ThemeToggle /></div>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <section style={{ ["--chat-w" as any]: chatPanelWidth + "px" }} className={`${mobilePanel === "chat" ? "flex" : "hidden"} h-full w-full flex-col overflow-hidden bg-transparent ${chatCollapsed ? "md:hidden" : "md:flex"} md:h-auto md:w-[var(--chat-w)] md:min-w-[260px] md:max-w-[720px] md:border-r md:border-border/70`} aria-label="Chat panel">
              {activeMessage && activeVersion && <div className="hs-version-strip flex items-center gap-2 border-b border-border/60 px-4 py-2 text-xs"><span className="inline-flex items-center rounded px-2 py-0.5 font-mono text-emerald-600 dark:text-emerald-400">{activeVersion.label}</span><span className="font-medium text-foreground">Version {activeVersion.version}</span><span className="text-muted-foreground">• {activeFileCount} file{activeFileCount === 1 ? "" : "s"}</span></div>}
              <div className="min-h-0 flex-1 overflow-hidden"><ChatLog chat={chat} streamText={streamText} activeMessage={activeMessage} onMessageClick={(message) => { if (message !== activeMessage) { setActiveMessage(message); setActiveTab("code"); setBuilderMode("code"); setMobilePanel("code"); } }} /></div>
              <div className="shrink-0 bg-transparent p-3"><ChatBox chat={chat} onNewStreamPromise={(promise) => { setStreamPromise(promise); setBuilderMode("code"); setMobilePanel("code"); setChatCollapsed(false); }} onAbortController={(c) => { abortControllerRef.current = c; }} isStreaming={!!streamPromise} onStop={stopStreaming} onUndo={handleUndo} versions={assistantVersions} currentVersionId={activeMessage?.id} onSwitchVersion={handleSwitchVersion} shouldFocusInput={shouldFocusInput} onInputFocused={() => setShouldFocusInput(false)} /></div>
            </section>

            <div role="separator" tabIndex={0} aria-orientation="vertical" aria-label="Resize chat panel" aria-valuemin={MIN_CHAT_WIDTH} aria-valuemax={MAX_CHAT_WIDTH} aria-valuenow={chatPanelWidth} onMouseDown={onSplitterMouseDown} onKeyDown={onSplitterKeyDown} className={`${chatCollapsed ? "hidden" : "hidden md:block"} group relative z-10 w-px flex-shrink-0 cursor-col-resize bg-border/70 transition focus-visible:outline-none`} />

            <section className={`${mobilePanel === "chat" ? "hidden" : "flex"} min-h-0 flex-1 flex-col overflow-hidden bg-transparent md:flex md:min-w-[360px]`} aria-label="Artifact builder panel">{renderBuilderSurface()}</section>
          </div>
        </div>

        <ChatsContextMenu
          open={!!contextMenu}
          x={contextMenu?.x ?? 0}
          y={contextMenu?.y ?? 0}
          canAct={canAct}
          fileCount={artifactFiles.length}
          activeVersionLabel={activeVersion?.label}
          autoFixEnabled={autoFixEnabled}
          previewMode={previewMode}
          onClose={() => setContextMenu(null)}
          onNewChat={() => router.push("/")}
          onCopyUrl={handleCopyCurrentUrl}
          onShare={handleShareLink}
          onPublish={handlePublishMobile}
          onDownload={handleDownloadZip}
          onCreatePr={handleCreatePrMobile}
          onPreviousVersion={handleUndo}
          onToggleAutoFix={() => handleAutoFixEnabledChange(!autoFixEnabled)}
          onSwitchMode={switchModeFromMenu}
          onTogglePreviewMode={() => setPreviewMode(nextPreviewMode)}
        />

        <Drawer open={mobileOptionsOpen} onOpenChange={setMobileOptionsOpen} shouldScaleBackground={false} snapPoints={[0.3, 0.5, 0.7, 1]}>
          <DrawerContent showOverlay={false} className="md:hidden h-[70dvh] rounded-t-2xl border-border/70 bg-background/95 px-4 pb-4">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle className="text-sm">Builder options</DrawerTitle>
              <DrawerDescription>No mobile dropdowns. Use this sheet for secondary controls.</DrawerDescription>
            </DrawerHeader>
            <div className="grid gap-3 overflow-y-auto pb-3 text-sm">
              <div className="grid grid-cols-3 gap-2" aria-label="Mobile panel shortcuts">
                <SheetAction icon={<MessageSquare className="size-4" />} label="Chat" onClick={() => { switchMobilePanel("chat"); setMobileOptionsOpen(false); }} />
                <SheetAction icon={<Code2 className="size-4" />} label="Code" onClick={() => { switchMobilePanel("code"); setMobileOptionsOpen(false); }} />
                <SheetAction icon={<Eye className="size-4" />} label="Preview" onClick={() => { switchMobilePanel("preview"); setMobileOptionsOpen(false); }} />
              </div>

              <div className="grid gap-1 border-t border-border/70 pt-3">
                <SheetAction icon={<Palette className="size-4" />} label="Visual editor" onClick={() => { setModeSafely("design"); setMobilePanel("preview"); setMobileOptionsOpen(false); }} />
                <SheetAction icon={previewMode === "web" ? <Smartphone className="size-4" /> : <Monitor className="size-4" />} label={`Switch to ${nextPreviewMode}`} onClick={() => setPreviewMode(nextPreviewMode)} />
                <SheetAction icon={<Database className="size-4" />} label="Database workspace" onClick={() => { setModeSafely("database"); setMobilePanel("preview"); setMobileOptionsOpen(false); }} />
                <SheetAction icon={<PanelLeftOpen className="size-4" />} label="Main app menu" onClick={() => { setMobileOptionsOpen(false); setMobileAppMenuOpen(true); }} />
              </div>

              <div className="grid gap-1 border-t border-border/70 pt-3">
                <SheetAction icon={<Share2 className="size-4" />} label="Share link" disabled={!activeMessage?.id} onClick={handleShareLink} />
                <SheetAction icon={<ExternalLink className="size-4" />} label="Publish site" disabled={!canAct} onClick={handlePublishMobile} />
                <SheetAction icon={<Download className="size-4" />} label="Download zip" disabled={!canAct} onClick={handleDownloadZip} />
                <SheetAction icon={<GitPullRequest className="size-4" />} label="Create PR" disabled={!canAct} onClick={handleCreatePrMobile} />
              </div>

              {assistantVersions.length > 0 && (
                <div className="grid gap-1 border-t border-border/70 pt-3">
                  <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><Layers className="size-3.5" /> Versions</div>
                  {assistantVersions.slice().reverse().map((version) => (
                    <button key={version.id} type="button" onClick={() => { handleSwitchVersion(version.id); setMobileOptionsOpen(false); }} className={`flex items-center justify-between rounded-md px-2 py-2 text-left text-xs ${activeMessage?.id === version.id ? "text-foreground shadow-[inset_0_-1px_0_hsl(var(--foreground)/0.45)]" : "text-muted-foreground"}`}>
                      <span>{version.label}</span>
                      <span>{version.version === activeVersion?.version ? "Current" : "Revert"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>

        {showUnsavedOverlay && (
          <div className="fixed inset-0 z-50 hidden items-center justify-center bg-background/70 p-4 backdrop-blur-sm md:flex" role="alertdialog" aria-modal="true" aria-labelledby="unsaved-design-title">
            <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-2xl shadow-black/30">
              <h2 id="unsaved-design-title" className="text-sm font-semibold text-foreground">Save design changes?</h2>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">You have live visual edits that are not committed as a version yet.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => { setShowUnsavedOverlay(false); setPendingMode(null); }} className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-accent">Cancel</button>
                <button type="button" onClick={() => { setDesignDirty(false); setShowUnsavedOverlay(false); if (pendingMode) applyMode(pendingMode); setPendingMode(null); }} className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-accent">Discard</button>
                <button type="button" onClick={() => setDesignSaveRequest((value) => value + 1)} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500">Save Changes</button>
              </div>
            </div>
          </div>
        )}
        <Drawer open={showUnsavedOverlay} onOpenChange={setShowUnsavedOverlay} shouldScaleBackground={false} snapPoints={[0.3, 0.5]}>
          <DrawerContent showOverlay={false} className="md:hidden h-[42dvh] rounded-t-2xl border-border/70 bg-background/95 px-4 pb-4">
            <DrawerHeader className="px-0 text-left"><DrawerTitle className="text-sm">Save design changes?</DrawerTitle><DrawerDescription>You have live visual edits that are not committed yet.</DrawerDescription></DrawerHeader>
            <div className="grid gap-2">
              <button type="button" onClick={() => setDesignSaveRequest((value) => value + 1)} className="rounded-md border border-border px-3 py-2 text-sm text-foreground">Save Changes</button>
              <button type="button" onClick={() => { setDesignDirty(false); setShowUnsavedOverlay(false); if (pendingMode) applyMode(pendingMode); setPendingMode(null); }} className="rounded-md border border-border px-3 py-2 text-sm text-foreground">Discard Changes</button>
              <button type="button" onClick={() => { setShowUnsavedOverlay(false); setPendingMode(null); }} className="rounded-md px-3 py-2 text-sm text-muted-foreground">Cancel</button>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </TooltipProvider>
  );
}

function BuilderModeButton({ mode, current, label, icon, onClick, compact }: { mode: BuilderMode; current: BuilderMode; label: string; icon: ReactNode; onClick: () => void; compact?: boolean }) {
  const active = current === mode;
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${active ? "text-foreground shadow-[inset_0_-1px_0_hsl(var(--foreground)/0.45)]" : "text-muted-foreground hover:text-foreground"} ${compact ? "w-full" : ""}`} title={label}>{icon}<span className={compact ? "sr-only" : "hidden lg:inline"}>{label}</span></button>;
}

function MobilePanelButton({ panel, current, label, icon, onClick }: { panel: MobilePanel; current: MobilePanel; label: string; icon: ReactNode; onClick: () => void }) {
  const active = current === panel;
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`inline-flex h-8 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${active ? "text-foreground shadow-[inset_0_-1px_0_hsl(var(--foreground)/0.45)]" : "text-muted-foreground hover:text-foreground"}`} aria-label={label}>{icon}<span className="sr-only">{label}</span></button>;
}

function SheetAction({ icon, label, onClick, disabled }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-left text-xs text-foreground disabled:opacity-40">{icon}<span>{label}</span></button>;
}
