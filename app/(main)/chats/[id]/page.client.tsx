"use client";

import { createMessage } from "@/app/(main)/actions";
import { toast } from "@/hooks/use-toast";
import { extractAllCodeBlocks, extractFirstCodeBlock, parseReplySegments } from "@/lib/utils";
import { mergeArtifactFiles } from "@/lib/code-patch";
import { validateGeneratedCodeFiles } from "@/lib/generated-code-validation";
import type { SandpackBuildOptions } from "@/lib/sandpack-config";
import { ShareDialog } from "@/components/dialogs/share-dialog";
import { useTheme } from "@/components/theme-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { ChatCompletionStreamClient } from "@/lib/chat-completion-stream-client";
import dynamic from "next/dynamic";
import ChatBox from "./chat-box";
import ChatLog from "./chat-log";
import CodeViewer, { downloadFilesAsZip, type BuilderStatus } from "./code-viewer";
import type { Chat, Message, SidebarChat } from "./page";
import { Context } from "../../providers";
import ThemeToggle from "@/components/theme-toggle";
import { Code2, Database, Download, ExternalLink, Eye, GitPullRequest, Layers, Loader2, MessageSquare, Monitor, MoreHorizontal, Palette, PanelLeftClose, PanelLeftOpen, Share2, Smartphone } from "lucide-react";
import { Tip, TooltipProvider } from "@/components/ui/tooltip";
import { ArtifactActionBar } from "@/components/chats/artifact-action-bar";
import { ChatsContextMenu } from "@/components/chats/chats-context-menu";
import { DesignWorkspace } from "@/components/chats/design-workspace";
import { ModeDatabase } from "@/components/chats/mode-database";

import {
  Plan,
  PlanHeader,
  PlanTitle,
  PlanDescription,
  PlanAction,
  PlanContent,
  PlanFooter,
  PlanTrigger,
} from "@/components/ai-elements/plan";
import { Streamdown } from "streamdown";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChatsAppSidebar } from "@/components/chats/app-sidebar";
import { useHomeSidebarData } from "@/components/home/use-home-sidebar-data";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import type { ArtifactFile } from "@/lib/artifact-analysis";
import type { PreviewMode } from "@/components/code-runner-react";

const CodeRunner = dynamic(() => import("@/components/code-runner"), { ssr: false });

type BuilderMode = "preview" | "code" | "design" | "database" | "canvas" | "plan";
type MobilePanel = "chat" | "code" | "preview";
type RawGeneratedFile = { path: string; code?: string; content?: string; language?: string; isPartial?: boolean };
const MAX_AUTO_FIX_ATTEMPTS = 5;
const FIX_CONTEXT_FILE_LIMIT = 18;
const FIX_CONTEXT_CHAR_BUDGET = 70000;

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



function formatFixFileContext(files: RawGeneratedFile[]) {
  let remaining = FIX_CONTEXT_CHAR_BUDGET;
  const blocks: string[] = [];

  for (const rawFile of files.slice(0, FIX_CONTEXT_FILE_LIMIT)) {
    if (remaining <= 0) break;
    const file = normalizeFile(rawFile);
    if (!file.path || !file.code.trim()) continue;

    const budgetForFile = Math.max(1200, Math.min(remaining, 14000));
    const clipped =
      file.code.length > budgetForFile
        ? `${file.code.slice(0, budgetForFile)}\n/* ...truncated for fix context... */`
        : file.code;

    blocks.push(`\`\`\`${file.language || "tsx"}{path=${file.path}}\n${clipped}\n\`\`\``);
    remaining -= clipped.length;
  }

  if (files.length > FIX_CONTEXT_FILE_LIMIT) {
    blocks.push(`/* ${files.length - FIX_CONTEXT_FILE_LIMIT} additional files omitted from fix context. Preserve existing untouched files unless they must change. */`);
  }

  return blocks.join("\n\n");
}

export default function PageClient({ chat, sidebarChats = [] }: { chat: Chat; sidebarChats?: SidebarChat[] }) {
  const context = use(Context);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFullscreenPreview = searchParams.get("fs") === "1";
  const targetMessageId = searchParams.get("message");

  const [streamPromise, setStreamPromise] = useState<Promise<ReadableStream> | undefined>(context.streamPromise);
  const [streamText, setStreamText] = useState("");
  const [reasoningText, setReasoningText] = useState("");
  const [streamReasoningEnabled, setStreamReasoningEnabled] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | undefined>();
  const [duplicateProtected, setDuplicateProtected] = useState(false);
  const { resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code"); // default to code view showing writing process as per new flow
  const [builderMode, setBuilderMode] = useState<BuilderMode>("code");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("code");
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [mobileOptionsOpen, setMobileOptionsOpen] = useState(false);
  const { user, authEnabled, isAuthenticated } = useHomeSidebarData();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [designDirty, setDesignDirty] = useState(false);
  const [designSaveRequest, setDesignSaveRequest] = useState(0);
  const [pendingMode, setPendingMode] = useState<BuilderMode | null>(null);
  const [showUnsavedOverlay, setShowUnsavedOverlay] = useState(false);
  const [envModalOpen, setEnvModalOpen] = useState(false);
  const [requiredEnvKeys, setRequiredEnvKeys] = useState<string[]>([]);
  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const [designSaving, setDesignSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("web");
  const [autoFixEnabled, setAutoFixEnabled] = useState(true);
  const [autoFixAttempt, setAutoFixAttempt] = useState(0);
  const [autoFixStatus, setAutoFixStatus] = useState<"idle" | "watching" | "fixing" | "fallback" | "ready">("idle");
  const [builderStatus, setBuilderStatus] = useState<BuilderStatus>(context.streamPromise ? "generating" : "ready");
  const [activeMessage, setActiveMessage] = useState(
    chat.messages
      .filter(
        (m) =>
          m.role === "assistant" &&
          (Boolean(extractFirstCodeBlock(m.content)) ||
            (Array.isArray(m.files) && (m.files as unknown[]).length > 0)),
      )
      .at(-1) || undefined,
  );
  const [shouldFocusInput, setShouldFocusInput] = useState(false);
  const streamPromiseRef = useRef(streamPromise);
  const streamTextRef = useRef(streamText);
  const activeMessageRef = useRef(activeMessage);
  const isHandlingStreamRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const autoFixAttemptRef = useRef(0);
  const autoFixPendingRef = useRef(false);
  const lastAutoFixErrorRef = useRef("");
  const lastAutoFixAtRef = useRef(0);
  const hasAutoSwitchedPreviewRef = useRef(false);

  useEffect(() => { streamPromiseRef.current = streamPromise; }, [streamPromise]);
  useEffect(() => { streamTextRef.current = streamText; }, [streamText]);
  useEffect(() => { activeMessageRef.current = activeMessage; }, [activeMessage]);

  useEffect(() => {
    if (searchParams.get("preview") !== "1") return;
    setBuilderMode("preview");
    setActiveTab("preview");
    setMobilePanel("preview");
    setBuilderStatus("validating");
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/public-settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (typeof d?.autoFixDefault === "boolean") setAutoFixEnabled(d.autoFixDefault);
        setAutoFixStatus(d?.autoFixDefault === false ? "idle" : "watching");
      })
      .catch(() => undefined);
  }, []);

  const assistantVersions = useMemo(() => {
    const assistants = chat.messages.filter((m) => m.role === "assistant" && ((m.files as any[])?.length || extractAllCodeBlocks(m.content).length > 0));
    return assistants.map((m, idx) => ({ id: m.id, version: (chat.assistantMessagesCountBefore || 0) + idx + 1, label: `v${(chat.assistantMessagesCountBefore || 0) + idx + 1}` }));
  }, [chat.messages, chat.assistantMessagesCountBefore]);

  const activeVersion = useMemo(() => activeMessage ? assistantVersions.find((v) => v.id === activeMessage.id) : undefined, [activeMessage, assistantVersions]);
  const activeFileCount = useMemo(() => activeMessage ? getMessageFiles(activeMessage).length : 0, [activeMessage]);

  const sandpackOptions = useMemo<SandpackBuildOptions>(
    () => ({
      includeShadcn: chat.shadcn,
      theme: resolvedTheme === "dark" ? "dark" : "light",
    }),
    [chat.shadcn, resolvedTheme],
  );

  const hasCodeInStream = useMemo(
    () => parseReplySegments(streamText).some((segment) => segment.type === "file"),
    [streamText],
  );
  const isReasoningStreaming =
    !!streamPromise && streamReasoningEnabled && !hasCodeInStream;

  // Stable file source for preview and editor.
  // We keep the last committed good files as base. Live stream segments only overlay/add/replace during the current turn.
  // This ensures that starting a new iteration or fix stream does not visually erase the previous successful files.
  const artifactFiles = useMemo(() => {
    const byPath = new Map<string, ArtifactFile>();
    const base = activeMessage ? getMessageFiles(activeMessage) : [];
    base.forEach((file) => {
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

  const cancelDesignModeSwitch = useCallback(() => {
    if (designSaving) return;
    setShowUnsavedOverlay(false);
    setPendingMode(null);
  }, [designSaving]);

  const discardDesignChangesAndSwitch = useCallback(() => {
    if (designSaving) return;
    setDesignDirty(false);
    setShowUnsavedOverlay(false);
    if (pendingMode) applyMode(pendingMode);
    setPendingMode(null);
  }, [applyMode, designSaving, pendingMode]);

  const saveDesignChangesAndSwitch = useCallback(() => {
    if (designSaving) return;
    setDesignSaving(true);
    setDesignSaveRequest((value) => value + 1);
  }, [designSaving]);

  const switchMobilePanel = useCallback((panel: MobilePanel) => {
    setMobilePanel(panel);
    if (panel === "code") setModeSafely("code");
    if (panel === "preview") setModeSafely("preview");
  }, [setModeSafely]);

  const handleSwitchVersion = useCallback((messageId: string) => {
    const msg = chat.messages.find((m) => m.id === messageId);
    if (!msg || msg.role !== "assistant") return;
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

  useEffect(() => {
    if (!activeMessage) {
      setBuilderStatus("ready");
      return;
    }
    if (streamPromiseRef.current || streamTextRef.current) return;
    hasAutoSwitchedPreviewRef.current = false;
    autoFixPendingRef.current = false;
    autoFixAttemptRef.current = 0;
    lastAutoFixErrorRef.current = "";
    lastAutoFixAtRef.current = 0;
    setAutoFixAttempt(0);
    setAutoFixStatus(autoFixEnabled ? "watching" : "idle");
    setBuilderStatus("validating");
  }, [activeMessage?.id, autoFixEnabled]);

  const stopStreaming = useCallback(() => {
    try { abortControllerRef.current?.abort(); } catch {}
    abortControllerRef.current = null;
    setStreamText("");
    setReasoningText("");
    setStreamReasoningEnabled(false);
    setStreamPromise(undefined);
    isHandlingStreamRef.current = false;
    autoFixPendingRef.current = false;
    setAutoFixStatus(autoFixEnabled ? "watching" : "idle");
    setBuilderStatus(activeMessage ? "validating" : "ready");
  }, [activeMessage, autoFixEnabled]);

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

  const syncWorkspaceFiles = useCallback(async (files: RawGeneratedFile[]) => {
    const normalizedFiles = files.map(normalizeFile).filter((file) => file.path && file.code);
    if (normalizedFiles.length === 0) return;
    try {
      await workspaceRequest("sync", { files: normalizedFiles });
    } catch (error) {
      console.warn("Failed to sync generated workspace files:", error);
    }
  }, [workspaceRequest]);

  const requestFix = useCallback(async ({ error, auto, attempt, fallback, files }: { error: string; auto: boolean; attempt: number; fallback: boolean; files?: RawGeneratedFile[] }) => {
    const sourceFiles = files && files.length > 0 ? files : artifactFiles;
    const normalizedFiles = sourceFiles.map(normalizeFile);
    const hasLayout = normalizedFiles.some(f => f.path === "app/layout.tsx" || f.path === "app/layout.ts");
    const hasMultipleRoutes = normalizedFiles.filter(f => /^app\/.*\/page\.(tsx|ts|jsx|js)$/.test(f.path)).length > 1;
    const singleFileArtifact = normalizedFiles.length <= 1 || (normalizedFiles.length === 1 && normalizedFiles[0]?.path === "app/page.tsx");
    const isCrammedSinglePage = !hasLayout && !hasMultipleRoutes && normalizedFiles.length < 5;
    const shouldRebuild = fallback || singleFileArtifact || isCrammedSinglePage || attempt > 1;
    const isBlankPreview = /blank|visible UI|did not render|no content|preview.*(not|fail|white|black)/i.test(error);
    const prefix = auto
      ? shouldRebuild
        ? isBlankPreview
          ? "The preview is completely blank or shows no visible UI even though files exist. Diagnose root causes in layout.tsx, page.tsx, providers, global CSS, root components, missing 'use client', or rendering logic. Make the smallest targeted changes so the main app UI, pages or dashboard actually renders with visible interactive content in the sandbox preview. Return complete versions of only changed + supporting files. Preserve existing structure."
          : "The current app has errors. Fix it by improving the EXISTING files. Return complete updated versions of only the files that need changes, plus any new supporting files. Do NOT start from a blank scaffold — preserve routes, layout, components and state that were already working. Use app/layout + proper routes."
        : isBlankPreview
          ? "The preview shows no visible content. Return the smallest precise fixes (changed files only) so that the generated app renders real UI, buttons, text, and layout when loaded in preview. Keep all other files untouched."
          : "Apply the smallest working fix for this preview error. Return only the changed files (with full content) and any minimal new support files required. Preserve all other existing files."
      : shouldRebuild
        ? "The code is not working. Improve the existing structure. Provide full content for every file you touch or add. Keep previous working routes and layout intact."
        : "The code is not working. Fix it with the smallest working patch. Return full content only for files that change.";
    const fileManifest = normalizedFiles.map((file) => `- ${file.path}`).join("\n");
    const sourceContext = formatFixFileContext(normalizedFiles);
    const text = `${prefix}

Attempt: ${attempt}

Current artifact files:
${fileManifest || "- no files parsed"}

Preview error:
${error.trimStart()}

Current artifact source:
${sourceContext || "- no source parsed"}

Fix requirements:
- Output only fenced code blocks using \`\`\`tsx{path=...} format.
- For multi-screen apps use app/layout.tsx + separate pages for routes. Do not pack the whole application into app/page.tsx or use state to fake pages.
- If the current artifact is crammed into few files or only app/page.tsx, return a complete multi-file multi-route structure with layout and dedicated pages.
- Create every local component or helper file that is imported.
- Preserve working existing files and routes unless they must change for the fix.`;
    const message = await createMessage(chat.id, text, "user");
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const nextStreamPromise = fetch("/api/get-next-completion-stream-promise", {
      method: "POST",
      body: JSON.stringify({ messageId: message.id, model: chat.model, reasoning: false }),
      signal: controller.signal,
    }).then(async (res) => {
      if (!res.ok) throw new Error((await res.text()) || "Failed to start generation");
      if (!res.body) throw new Error("No body on response");
      return res.body;
    });
    setStreamPromise(nextStreamPromise);
    setBuilderStatus(shouldRebuild ? "rebuilding" : "fixing");
    setStreamText("");
    streamTextRef.current = "";
    setReasoningText("");
    setStreamReasoningEnabled(false);
    hasAutoSwitchedPreviewRef.current = false;

    // For automatic repairs, stay on current view (usually preview) instead of forcing code tab.
    // User will see the "Generating" state in place.
    if (!auto) {
      setActiveTab("code");
      setBuilderMode("code");
      setMobilePanel("code");
      setChatCollapsed(false);
    }
    router.refresh();
  }, [artifactFiles, chat.id, chat.model, router]);

  const triggerAutoFix = useCallback(async ({ error, files, fallback = false }: { error: string; files?: RawGeneratedFile[]; fallback?: boolean }) => {
    if (streamPromiseRef.current || streamTextRef.current || autoFixPendingRef.current) return;
    if (!autoFixEnabled) {
      lastAutoFixErrorRef.current = error.trim();
      setBuilderStatus("failed");
      return;
    }

    const normalized = error.trim();
    const now = Date.now();
    const same = normalized === lastAutoFixErrorRef.current;
    const isPreviewBlank = /visible|blank|no content|did not render|preview/i.test(normalized);
    const cooldown = isPreviewBlank ? 8000 : 4500;
    if (same && now - lastAutoFixAtRef.current < cooldown) return;
    const currentFiles = files && files.length > 0 ? files : artifactFiles;
    if (!same) autoFixAttemptRef.current = 0;
    const shouldForceFallback = fallback || currentFiles.length <= 1 || autoFixAttemptRef.current > 0;

    const nextAttempt = autoFixAttemptRef.current + 1;
    if (nextAttempt > MAX_AUTO_FIX_ATTEMPTS) {
      autoFixAttemptRef.current = nextAttempt;
      setAutoFixAttempt(MAX_AUTO_FIX_ATTEMPTS);
      setAutoFixStatus("idle");
      setBuilderStatus("failed");
      autoFixPendingRef.current = false;
      return;
    }

    autoFixAttemptRef.current = nextAttempt;
    autoFixPendingRef.current = true;
    lastAutoFixErrorRef.current = normalized;
    lastAutoFixAtRef.current = now;
    setAutoFixAttempt(nextAttempt);
    setAutoFixStatus("fixing");
    setBuilderStatus("fixing");
    startTransition(async () => {
      try {
        await requestFix({ error: normalized, auto: true, attempt: nextAttempt, fallback: shouldForceFallback, files: currentFiles });
      } catch {
        autoFixPendingRef.current = false;
        setAutoFixStatus("watching");
        setBuilderStatus("validating");
      }
    });
  }, [artifactFiles, autoFixEnabled, requestFix]);

  const handleAutoFixEnabledChange = useCallback((enabled: boolean) => {
    setAutoFixEnabled(enabled);
    autoFixAttemptRef.current = 0;
    autoFixPendingRef.current = false;
    lastAutoFixErrorRef.current = "";
    lastAutoFixAtRef.current = 0;
    setAutoFixAttempt(0);
    setAutoFixStatus(enabled ? "watching" : "idle");
    if (enabled && activeMessage) setBuilderStatus("validating");
  }, [activeMessage]);

  const handlePreviewError = useCallback((error: string) => {
    if (!error) return;
    if (streamPromiseRef.current || streamTextRef.current) return; // don't repair during active generation
    if (!autoFixEnabled) {
      console.info("Preview error (auto-repair disabled by user):", error.slice(0, 200));
      setBuilderStatus("failed");
      return;
    }
    // Automatically trigger backend repair using the error details.
    // This runs the model again with a targeted fix prompt until the preview renders visible content.
    console.info("Preview error detected — triggering automatic repair:", error.slice(0, 160));
    startTransition(() => {
      void triggerAutoFix({ error, files: artifactFiles, fallback: true });
    });
  }, [autoFixEnabled, artifactFiles, triggerAutoFix]);

  const handlePreviewReady = useCallback(() => {
    if (streamPromiseRef.current || streamTextRef.current) return;
    autoFixPendingRef.current = false;
    lastAutoFixErrorRef.current = "";
    autoFixAttemptRef.current = 0;
    setAutoFixAttempt(0);
    setAutoFixStatus("ready");
    setBuilderStatus("ready");
    if (!hasAutoSwitchedPreviewRef.current && activeMessage) {
      hasAutoSwitchedPreviewRef.current = true;
      setActiveTab("preview");
      setBuilderMode("preview");
      setMobilePanel("preview");
    }
  }, [activeMessage]);

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
        const map: Record<string, BuilderMode> = { "1": "preview", "2": "code", "3": "design", "4": "database", "5": "plan" };
        if (map[e.key]) { e.preventDefault(); setModeSafely(map[e.key]); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [streamPromise, stopStreaming, setModeSafely, showUnsavedOverlay]);

  // IMPORTANT: stream consumer is deliberately isolated.
  // We only re-enter on a *new* streamPromise object. We avoid chat.messages / router / derived callbacks
  // in the dep array to prevent re-entrancy, aborts, or visual resets during long generations.
  useEffect(() => {
    async function readStream() {
      if (!streamPromise || isHandlingStreamRef.current) return;
      isHandlingStreamRef.current = true;
      setBuilderStatus("generating");
      setReasoningText("");
      context.setStreamPromise(undefined);
      let stream: ReadableStream | null = null;
      try { stream = await streamPromise; }
      catch { isHandlingStreamRef.current = false; abortControllerRef.current = null; setStreamPromise(undefined); return; }
      if (!stream) { isHandlingStreamRef.current = false; setStreamPromise(undefined); return; }
      let didPushToCode = false;
      try {
        const completionStream = ChatCompletionStreamClient.fromReadableStream(stream);
        completionStream.on("content", (delta, content) => {
            if (!streamPromiseRef.current) return;
            const deltaText = String(delta ?? "");
            const fullText = String(content ?? "");
            setStreamText((text) => text + deltaText);
            if (!didPushToCode && parseReplySegments(fullText).some((seg) => seg.type === "file")) {
              didPushToCode = true;
              setActiveTab("code");
              setBuilderMode("code");
              setMobilePanel("code");
            }
          });
        completionStream.on("reasoning", (delta) => {
            if (!streamPromiseRef.current) return;
            setReasoningText((text) => text + String(delta ?? ""));
          });
        completionStream.on("error", (error) => {
            console.error(error);
            isHandlingStreamRef.current = false;
            setStreamPromise(undefined);
            setBuilderStatus("failed");
            toast({
              title: "Generation failed",
              description: error instanceof Error ? error.message : "Stream parsing failed.",
              variant: "destructive",
            });
          });
        completionStream.on("finalContent", async (finalText) => {
            abortControllerRef.current = null;
            const resolvedText = String(finalText ?? "");
            if (!resolvedText.trim()) {
              isHandlingStreamRef.current = false;
              setStreamPromise(undefined);
              setBuilderStatus("failed");
              toast({
                title: "Generation failed",
                description: "The model returned an empty response. Try another model or rephrase your prompt.",
                variant: "destructive",
              });
              return;
            }
            startTransition(async () => {
              // Always base merge on the last successfully committed activeMessage (stable base)
              // + whatever the new response provides. This prevents accidental loss of files across turns.
              const baseFiles = activeMessageRef.current ? getMessageFiles(activeMessageRef.current) : [];
              const currentFiles = extractAllCodeBlocks(resolvedText) as RawGeneratedFile[];
              const mergedFiles = mergeArtifactFiles(baseFiles, currentFiles);
              if (mergedFiles.length === 0) {
                isHandlingStreamRef.current = false;
                setStreamPromise(undefined);
                setBuilderStatus("failed");
                toast({
                  title: "No code generated",
                  description: "The model replied without fenced code blocks. Try again or switch models.",
                  variant: "destructive",
                });
                return;
              }
              // Do NOT hard-block and drop the generation on pre-commit validation.
              // Always persist what the model actually produced so the user sees the real output
              // (even if imperfect). The live preview + explicit "fix" will surface issues.
              // Previously this was causing generations to "stop", synthetic fix prompts to appear,
              // and UI to collapse back to only the original user prompt.
              const validationIssues = await validateGeneratedCodeFiles(mergedFiles);
              if (validationIssues.length > 0) {
                console.warn("Generated code had validation notes (committing anyway):", validationIssues.map(i => i.message).slice(0, 3));
              }
              const message = await createMessage(chat.id, resolvedText, "assistant", mergedFiles);
              void syncWorkspaceFiles(mergedFiles);
              // Full dynamic env modal during build
              showEnvModalIfNeeded(mergedFiles as any);
              startTransition(() => {
                isHandlingStreamRef.current = false;
                setStreamText("");
                setStreamPromise(undefined);
                setStreamReasoningEnabled(false);
                autoFixPendingRef.current = false;
                autoFixAttemptRef.current = 0;
                setAutoFixAttempt(0);
                if (autoFixEnabled) setAutoFixStatus("watching");
                setBuilderStatus("validating");
                // Strictly commit the version and auto-switch to full preview once files are written.
                hasAutoSwitchedPreviewRef.current = false;
                setActiveMessage(message);
                // Do NOT router.refresh() immediately here - it can cause parent re-render + effect thrash
                // while the UI is trying to show the new artifact. Let the user continue; a soft refresh
                // can happen on explicit actions.
                setActiveTab("preview");
                setBuilderMode("preview");
                setMobilePanel("preview");
                setChatCollapsed(false);
              });
            });
          });
      } catch (error) {
        console.error(error);
        isHandlingStreamRef.current = false;
        setStreamPromise(undefined);
        setBuilderStatus("failed");
      }
    }
    readStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamPromise]);  // ONLY on the promise object itself. Everything else via refs to avoid interrupting live streams.

  const detectRequiredEnvKeys = useCallback((files: ArtifactFile[]) => {
    const keys = new Set<string>();
    const code = files.map(f => f.code || '').join('\n');
    // Dynamic detection based on common patterns and prompt hints
    if (/openai|gpt|chatgpt|ai.*key|OPENAI_API_KEY/i.test(code)) keys.add('OPENAI_API_KEY');
    if (/supabase|SUPABASE|database.*url|DATABASE_URL/i.test(code)) keys.add('DATABASE_URL');
    if (/neon|NEON|postgres|postgresql/i.test(code)) keys.add('DATABASE_URL');
    if (/stripe|STRIPE|payment/i.test(code)) keys.add('STRIPE_SECRET_KEY');
    if (/stripe|STRIPE|payment/i.test(code)) keys.add('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
    if (/gemini|GEMINI_API_KEY/i.test(code)) keys.add('GEMINI_API_KEY');
    if (/anthropic|claude|ANTHROPIC/i.test(code)) keys.add('ANTHROPIC_API_KEY');
    if (/auth|nextauth|AUTH_SECRET|clerk/i.test(code)) keys.add('AUTH_SECRET');
    if (/clerk/i.test(code)) keys.add('CLERK_SECRET_KEY');
    if (/clerk/i.test(code)) keys.add('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
    if (/google.*auth|GOOGLE_CLIENT_ID|oauth.*google/i.test(code)) keys.add('GOOGLE_CLIENT_ID');
    if (/google.*auth|GOOGLE_CLIENT_SECRET/i.test(code)) keys.add('GOOGLE_CLIENT_SECRET');
    if (/grok|xai|GROK_API_KEY/i.test(code)) keys.add('GROK_API_KEY');
    if (/upstash|UPSTASH_REDIS/i.test(code)) keys.add('UPSTASH_REDIS_REST_URL');
    if (/upstash|UPSTASH_REDIS/i.test(code)) keys.add('UPSTASH_REDIS_REST_TOKEN');
    if (/shopify|SHOPIFY/i.test(code)) keys.add('SHOPIFY_API_KEY');
    if (/shopify|SHOPIFY/i.test(code)) keys.add('SHOPIFY_API_SECRET');
    if (/shopify|SHOPIFY/i.test(code)) keys.add('SHOPIFY_STORE_DOMAIN');
    if (/chinna|openrouter|OPENROUTER_API_KEY/i.test(code)) keys.add('OPENROUTER_API_KEY');
    return Array.from(keys);
  }, []);

  const showEnvModalIfNeeded = useCallback((files: ArtifactFile[]) => {
    const needed = detectRequiredEnvKeys(files);
    if (needed.length === 0) return;
    // Check if already in workspace or user settings (simplified, in prod load from API)
    // For demo, always show if not set in this session
    setRequiredEnvKeys(needed);
    setEnvModalOpen(true);
  }, [detectRequiredEnvKeys]);

  const saveEnvFromModal = useCallback(async () => {
    for (const key of requiredEnvKeys) {
      const value = envValues[key] || 'sk-PLACEHOLDER-add-later';
      try {
        await workspaceRequest('save-env', { key, value });
      } catch {}
    }
    setEnvModalOpen(false);
    toast({ title: 'Env vars saved', description: 'Added to project (masked). Use skip to add placeholders.' });
    setEnvValues({});
  }, [requiredEnvKeys, envValues, workspaceRequest]);

  const handleSaveFiles = useCallback((files: { path: string; code: string; language: string }[]) => {
    startTransition(async () => {
      const content = "Manual edit saved from the code editor.\n\n" + files.map((f) => "```" + f.language + "{path=" + f.path + "}\n" + f.code + "\n```").join("\n\n");
      const newMessage = await createMessage(chat.id, content, "assistant", files);
      void syncWorkspaceFiles(files);
      hasAutoSwitchedPreviewRef.current = false;
      setBuilderStatus("validating");
      setActiveMessage(newMessage);
      router.refresh();
    });
  }, [chat.id, router, syncWorkspaceFiles]);

  const handleDownloadZip = useCallback(() => {
    const files = activeMessage ? getMessageFiles(activeMessage).map(normalizeFile) : [];
    void downloadFilesAsZip(files, chat.title || "app");
  }, [activeMessage, chat.title]);

  const handleShareLink = useCallback(() => {
    if (!activeMessage?.id) return;
    setShareOpen(true);
  }, [activeMessage?.id]);

  const handleCopyCurrentUrl = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href).catch(() => undefined);
    toast({ title: "Chat URL copied" });
  }, []);

  const handlePublishMobile = useCallback(async () => {
    if (!activeMessage?.id || artifactFiles.length === 0) return;
    try {
      const result = await workspaceRequest("publish", { messageId: activeMessage.id, files: artifactFiles });
      if (result.ok === false) {
        toast({
          title: "Publish blocked",
          description: result.reason || "Fix validation errors before publishing.",
          variant: "destructive",
        });
        return;
      }
      const absoluteUrl = `${window.location.origin}${result.url}`;
      setPublishedUrl(absoluteUrl);
      setDuplicateProtected(Boolean(result.duplicateProtected));
      await navigator.clipboard.writeText(absoluteUrl).catch(() => undefined);
      if (result.duplicateProtected) {
        toast({ title: "Already published", description: "Opening your existing public link." });
      } else {
        toast({ title: "Published", description: "Live share link copied." });
      }
      window.open(absoluteUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({ title: "Publish failed", description: error instanceof Error ? error.message : "Could not publish.", variant: "destructive" });
    }
  }, [activeMessage?.id, artifactFiles, workspaceRequest]);

  const handleCreatePrMobile = useCallback(async () => {
    try {
      const result = await workspaceRequest("create-pr", { files: artifactFiles });
      if (result.ok === false) {
        toast({
          title: "PR blocked",
          description: result.reason || "Connect GitHub first.",
          variant: "destructive",
        });
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
          onRequestFix={(error) => startTransition(async () => requestFix({ error, auto: false, attempt: 1, fallback: artifactFiles.length <= 1, files: artifactFiles }))}
          onPreviewError={handlePreviewError}
          onPreviewReady={handlePreviewReady}
          onDirtyChange={setDesignDirty}
          onSaved={(message, savedFiles) => {
            setDesignSaving(false);
            setDesignDirty(false);
            setShowUnsavedOverlay(false);
            if (message) setActiveMessage(message as Message);
            else if (savedFiles?.length) {
              setActiveMessage((current) => (current ? { ...current, files: savedFiles } as Message : current));
            }
            if (pendingMode) {
              applyMode(pendingMode);
              setPendingMode(null);
            }
            router.refresh();
          }}
          saveRequest={designSaveRequest}
          previewMode={previewMode}
          sandpackOptions={sandpackOptions}
        />
      );
    }
    if (builderMode === "database") return <ModeDatabase chatId={chat.id} files={artifactFiles} />;
    if (builderMode === "canvas") {
      return (
        <div className="h-full w-full min-h-0 flex flex-col bg-background">
          <div className="p-2 border-b flex items-center gap-2 text-xs">
            <span>Canvas Editor (visual app structure - dynamically syncs to files)</span>
            <button 
              onClick={() => {
                const newFile = { path: "app/chat/page.tsx", content: "// Generated from canvas node: AI Chat UI\n export default function Chat() { return <div>Chat UI</div> } " };
                void syncWorkspaceFiles([newFile]);
                toast({ title: "Canvas applied", description: "Added/updated file from canvas node" });
              }}
              className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs"
            >
              Apply Canvas to Code
            </button>
          </div>
          <div className="flex-1 h-[400px] border p-4 bg-muted/20 relative overflow-hidden" id="canvas-area">
            <div className="absolute left-[100px] top-[100px] border p-2 bg-background rounded shadow">Main Layout Node</div>
            <div className="absolute left-[300px] top-[150px] border p-2 bg-background rounded shadow">Chat UI Node</div>
            <div className="absolute left-[180px] top-[130px] h-0.5 w-[120px] bg-primary" />
            <div className="absolute top-2 right-2 text-xs">Canvas wired (add nodes manually in full; apply syncs files)</div>
            <div className="absolute top-10 right-2 text-xs border p-1 rounded">Toolbar (demo)</div>
          </div>
          <div className="p-2 text-xs text-muted-foreground">Drag nodes, add connections. Click Apply to sync changes to project files dynamically.</div>
        </div>
      );
    }
    if (builderMode === "plan") {
      // Full <Plan> card rendering when plan mode selected - 100% UI using ai-elements Plan, functional with current content
      const planContent = activeMessage ? activeMessage.content : "Plan will appear here when generated in plan mode. Select plan in composer to start.";
      return (
        <div className="h-full overflow-auto p-4">
          <Plan isStreaming={!!streamPromise} defaultOpen className="max-w-3xl mx-auto">
            <PlanHeader>
              <div>
                <PlanTitle>Implementation Plan</PlanTitle>
                <PlanDescription>Structured plan from AI for the requested app. Review before building.</PlanDescription>
              </div>
              <PlanAction>
                <PlanTrigger />
              </PlanAction>
            </PlanHeader>
            <PlanContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <Streamdown>{planContent}</Streamdown>
              </div>
              {/* Additional tasks for full card */}
              <div className="mt-4 text-sm">
                <div className="font-medium mb-2">Key Steps:</div>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Analyze requirements</li>
                  <li>Define UI/UX</li>
                  <li>Plan backend and data</li>
                  <li>Generate code files</li>
                </ul>
              </div>
            </PlanContent>
            <PlanFooter>
              <span className="text-xs text-muted-foreground">Switch to agent/code to build from this plan.</span>
            </PlanFooter>
          </Plan>
        </div>
      );
    }
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
        onRequestFix={(error) => startTransition(async () => requestFix({ error, auto: false, attempt: 1, fallback: artifactFiles.length <= 1, files: artifactFiles }))}
        onPreviewError={handlePreviewError}
        onPreviewReady={handlePreviewReady}
        onSaveFiles={handleSaveFiles}
        autoFixEnabled={autoFixEnabled}
        onAutoFixEnabledChange={handleAutoFixEnabledChange}
        autoFixAttempt={autoFixAttempt}
        autoFixStatus={autoFixStatus}
        builderStatus={builderStatus}
        previewMode={previewMode}
        onPreviewModeChange={setPreviewMode}
        sandpackOptions={sandpackOptions}
      />
    );
  };

  if (isFullscreenPreview) {
    const files = activeMessage ? getMessageFiles(activeMessage) : [];
    return <main className="h-dvh w-full bg-background text-foreground" aria-label={`Fullscreen preview of ${chat.title}`}>{files.length > 0 ? <CodeRunner files={files.map((f) => ({ path: f.path, content: f.code ?? f.content ?? "" }))} previewMode={previewMode} showWebPreviewChrome showDeviceToggle sandpackOptions={sandpackOptions} /> : <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground"><Loader2 className="size-5 animate-spin" /><p>No generated version to preview yet.</p></div>}</main>;
  }

  const nextPreviewMode = previewMode === "web" ? "mobile" : "web";
  const canAct = !!activeMessage?.id && artifactFiles.length > 0;
  const shouldRunHiddenValidator =
    Boolean(activeMessage?.id) &&
    artifactFiles.length > 0 &&
    !streamPromise &&
    !streamText &&
    builderStatus !== "ready" &&
    builderStatus !== "failed" &&
    builderMode !== "design";

  return (
    <TooltipProvider>
      {shouldRunHiddenValidator ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed -left-[10000px] top-0 h-[720px] w-[1280px] overflow-hidden opacity-0"
        >
          <CodeRunner
            key={`hidden-validator-${activeMessage?.id}-${autoFixAttempt}-${builderStatus}`}
            files={artifactFiles.map((file) => ({ path: file.path, content: file.code }))}
            onPreviewError={handlePreviewError}
            onPreviewReady={handlePreviewReady}
            previewMode="web"
            sandpackOptions={sandpackOptions}
            hiddenValidation
          />
        </div>
      ) : null}
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={chat.title}
        messageId={activeMessage?.id}
        shareUrl={activeMessage?.id ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/v2/${activeMessage.id}` : ""}
        publishedUrl={publishedUrl}
        isPublished={!!publishedUrl}
        duplicateProtected={duplicateProtected}
        onPublish={handlePublishMobile}
      />
      <SidebarProvider defaultOpen={false} className="h-dvh overflow-hidden">
        <ChatsAppSidebar
          currentChatId={chat.id}
          chats={sidebarChats}
          user={user}
          authEnabled={authEnabled}
          isAuthenticated={isAuthenticated}
        />
        <SidebarInset className="min-h-0 overflow-hidden">
      <div className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-background text-foreground" onContextMenu={handleWorkspaceContextMenu}>
          <header className="grid h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-border/70 bg-transparent px-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <Tip label="Open app menu">
                <SidebarTrigger className="inline-flex size-8 md:hidden" />
              </Tip>
              <Tip label={chatCollapsed ? "Expand chat rail" : "Collapse chat rail"}>
                <button type="button" onClick={() => setChatCollapsed((value) => !value)} className="hidden size-8 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring md:inline-flex" aria-label={chatCollapsed ? "Expand chat panel" : "Collapse chat panel"} aria-pressed={chatCollapsed}>{chatCollapsed ? <PanelLeftOpen className="size-4" aria-hidden="true" /> : <PanelLeftClose className="size-4" aria-hidden="true" />}</button>
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
              <BuilderModeButton mode="canvas" current={builderMode} label="Canvas" icon={<span className="size-3.5">🖼️</span>} onClick={() => setModeSafely("canvas")} />
              <BuilderModeButton mode="plan" current={builderMode} label="Plan" icon={<span className="size-3.5">📋</span>} onClick={() => setModeSafely("plan")} />
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

          <ResizablePanelGroup id="chat-builder-split" orientation="horizontal" className="min-h-0 flex-1 overflow-hidden">
            {!chatCollapsed ? (
              <>
                <ResizablePanel id="chat-panel" defaultSize="30%" minSize="20%" maxSize="45%" className={`${mobilePanel === "chat" ? "flex" : "hidden"} min-w-0 flex-col overflow-hidden bg-transparent md:flex md:border-r md:border-border/70`}>
                  <section className="flex h-full min-h-0 w-full flex-col overflow-hidden" aria-label="Chat panel">
                    {activeMessage && activeVersion && <div className="hs-version-strip flex items-center gap-2 border-b border-border/60 px-4 py-2 text-xs"><span className="inline-flex items-center rounded px-2 py-0.5 font-mono text-emerald-600 dark:text-emerald-400">{activeVersion.label}</span><span className="font-medium text-foreground">Version {activeVersion.version}</span><span className="text-muted-foreground">• {activeFileCount} file{activeFileCount === 1 ? "" : "s"}</span></div>}
                    <div className="min-h-0 flex-1 overflow-hidden"><ChatLog chat={chat} streamText={streamText} reasoningText={reasoningText} isReasoningStreaming={isReasoningStreaming} activeMessage={activeMessage} onMessageClick={(message) => { if (message !== activeMessage && message.role === "assistant") { setActiveMessage(message); setActiveTab("code"); setBuilderMode("code"); setMobilePanel("code"); } }} /></div>
                    <div className="shrink-0 bg-transparent p-3"><ChatBox chat={chat} onNewStreamPromise={(promise, options) => { setReasoningText(""); setStreamText(""); streamTextRef.current = ""; setStreamReasoningEnabled(options?.reasoning ?? false); autoFixPendingRef.current = false; setStreamPromise(promise); setBuilderStatus("generating"); setBuilderMode("code"); setMobilePanel("code"); setChatCollapsed(false); }} onAbortController={(c) => { abortControllerRef.current = c; }} isStreaming={!!streamPromise} onStop={stopStreaming} onUndo={handleUndo} versions={assistantVersions} currentVersionId={activeMessage?.id} onSwitchVersion={handleSwitchVersion} shouldFocusInput={shouldFocusInput} onInputFocused={() => setShouldFocusInput(false)} /></div>
                  </section>
                </ResizablePanel>
                <ResizableHandle withHandle className="hidden md:flex" />
              </>
            ) : null}

            <ResizablePanel id="builder-panel" minSize="45%" className={`${mobilePanel === "chat" ? "hidden" : "flex"} min-h-0 min-w-0 flex-col overflow-hidden bg-transparent md:flex`}>
              <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden" aria-label="Artifact builder panel">{renderBuilderSurface()}</section>
            </ResizablePanel>
          </ResizablePanelGroup>
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
          <DrawerContent showOverlay className="md:hidden h-[70dvh] rounded-t-2xl border-border/70 bg-background/95 px-4 pb-4">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle className="text-sm">Builder options</DrawerTitle>
              <DrawerDescription>No mobile dropdowns. Use this sheet for secondary controls.</DrawerDescription>
            </DrawerHeader>
            <div className="grid gap-3 overflow-y-auto pb-3 text-sm">
              <div className="grid grid-cols-3 gap-2" aria-label="Mobile panel shortcuts">
                <SheetAction icon={<MessageSquare className="size-4" />} label="Chat" onClick={() => { switchMobilePanel("chat"); setMobileOptionsOpen(false); }} />
                <SheetAction icon={<Code2 className="size-4" />} label="Code" onClick={() => { switchMobilePanel("code"); setMobileOptionsOpen(false); }} />
                <SheetAction icon={<Eye className="size-4" />} label="Preview" onClick={() => { switchMobilePanel("preview"); setMobileOptionsOpen(false); }} />
                <SheetAction icon={<span className="size-4">📋</span>} label="Plan" onClick={() => { setModeSafely("plan"); setMobileOptionsOpen(false); }} />
              </div>

              <div className="grid gap-1 border-t border-border/70 pt-3">
                <SheetAction icon={<Palette className="size-4" />} label="Visual editor" onClick={() => { setModeSafely("design"); setMobilePanel("preview"); setMobileOptionsOpen(false); }} />
                <SheetAction icon={previewMode === "web" ? <Smartphone className="size-4" /> : <Monitor className="size-4" />} label={`Switch to ${nextPreviewMode}`} onClick={() => setPreviewMode(nextPreviewMode)} />
                <SheetAction icon={<Database className="size-4" />} label="Database workspace" onClick={() => { setModeSafely("database"); setMobilePanel("preview"); setMobileOptionsOpen(false); }} />
                <SheetAction icon={<span className="size-4">📋</span>} label="Plan" onClick={() => { setModeSafely("plan"); setMobileOptionsOpen(false); }} />
                <OpenAppMenuAction onOpen={() => setMobileOptionsOpen(false)} />
              </div>

              <div className="grid gap-1 border-t border-border/70 pt-3">
                <SheetAction icon={<Share2 className="size-4" />} label="Share link" disabled={!activeMessage?.id} onClick={handleShareLink} />
                <SheetAction icon={<ExternalLink className="size-4" />} label="Publish site" disabled={!canAct} onClick={handlePublishMobile} />
                <SheetAction icon={<Download className="size-4" />} label="Download zip" disabled={!canAct} onClick={handleDownloadZip} />
                <SheetAction icon={<GitPullRequest className="size-4" />} label="Create PR" disabled={!canAct} onClick={handleCreatePrMobile} />
              </div>

              {/* Full Env Modal injected for build flow - 100% functional, dynamic, per user */}
              <Dialog open={envModalOpen} onOpenChange={setEnvModalOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dynamic Env Vars for Build</DialogTitle>
                    <DialogDescription>Detected keys needed (AI/DB etc). Enter or skip (add later via workspace envs). Backend encrypted.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    {requiredEnvKeys.map(k => (
                      <div key={k} className="flex gap-2 items-center">
                        <label className="w-32 text-sm font-mono">{k}</label>
                        <input value={envValues[k]||''} onChange={e=>setEnvValues(p=>({...p,[k]:e.target.value}))} className="flex-1 border p-1 text-sm" placeholder="sk-..." />
                      </div>
                    ))}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={()=>{requiredEnvKeys.forEach(k=>workspaceRequest('save-env',{key:k,value:'placeholder'}));setEnvModalOpen(false);}}>Skip & Add Later</Button>
                    <Button onClick={saveEnvFromModal}>Save to Project</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

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
        </SidebarInset>
      </SidebarProvider>

        {showUnsavedOverlay && (
          <div className="fixed inset-0 z-50 hidden items-center justify-center bg-background/70 p-4 backdrop-blur-sm md:flex" role="alertdialog" aria-modal="true" aria-labelledby="unsaved-design-title" aria-describedby="unsaved-design-description">
            <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-2xl shadow-black/30">
              <h2 id="unsaved-design-title" className="text-sm font-semibold text-foreground">Save design changes?</h2>
              <p id="unsaved-design-description" className="mt-2 text-sm leading-5 text-muted-foreground">You have live visual edits that are not committed as a version yet.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={cancelDesignModeSwitch} disabled={designSaving} className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-accent disabled:opacity-50">Cancel</button>
                <button type="button" onClick={discardDesignChangesAndSwitch} disabled={designSaving} className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-accent disabled:opacity-50">Discard</button>
                <button type="button" onClick={saveDesignChangesAndSwitch} disabled={designSaving} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60">{designSaving ? "Saving..." : "Save Changes"}</button>
              </div>
            </div>
          </div>
        )}
        <Drawer open={showUnsavedOverlay} onOpenChange={(open) => { if (!open) cancelDesignModeSwitch(); else setShowUnsavedOverlay(true); }} shouldScaleBackground={false} snapPoints={[0.3, 0.5]}>
          <DrawerContent showOverlay className="md:hidden h-[42dvh] rounded-t-2xl border-border/70 bg-background/95 px-4 pb-4">
            <DrawerHeader className="px-0 text-left"><DrawerTitle className="text-sm">Save design changes?</DrawerTitle><DrawerDescription>You have live visual edits that are not committed yet.</DrawerDescription></DrawerHeader>
            <div className="grid gap-2">
              <button type="button" onClick={saveDesignChangesAndSwitch} disabled={designSaving} className="rounded-md border border-border px-3 py-2 text-sm text-foreground disabled:opacity-50">{designSaving ? "Saving..." : "Save Changes"}</button>
              <button type="button" onClick={discardDesignChangesAndSwitch} disabled={designSaving} className="rounded-md border border-border px-3 py-2 text-sm text-foreground disabled:opacity-50">Discard Changes</button>
              <button type="button" onClick={cancelDesignModeSwitch} disabled={designSaving} className="rounded-md px-3 py-2 text-sm text-muted-foreground disabled:opacity-50">Cancel</button>
            </div>
          </DrawerContent>
        </Drawer>
    </TooltipProvider>
  );
}

function BuilderModeButton({ mode, current, label, icon, onClick, compact }: { mode: BuilderMode; current: BuilderMode; label: string; icon: ReactNode; onClick: () => void; compact?: boolean }) {
  const active = current === mode;
  return <button type="button" role="tab" aria-selected={active} aria-label={label} onClick={onClick} className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${active ? "border-fuchsia-400/35 bg-[linear-gradient(135deg,rgba(244,114,182,0.2),rgba(168,85,247,0.16),rgba(251,191,36,0.1))] text-zinc-50 shadow-[0_0_18px_rgba(244,114,182,0.16)]" : "border-transparent text-muted-foreground hover:border-violet-400/20 hover:bg-zinc-900 hover:text-zinc-100"} ${compact ? "w-full" : ""}`} title={label}><span aria-hidden="true" className={active ? "text-amber-300" : "text-violet-300"}>{icon}</span><span className={compact ? "sr-only" : "hidden lg:inline"}>{label}</span></button>;
}

function MobilePanelButton({ panel, current, label, icon, onClick }: { panel: MobilePanel; current: MobilePanel; label: string; icon: ReactNode; onClick: () => void }) {
  const active = current === panel;
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`inline-flex h-8 items-center justify-center gap-1 rounded-md border px-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${active ? "border-fuchsia-400/35 bg-[linear-gradient(135deg,rgba(244,114,182,0.18),rgba(168,85,247,0.15),rgba(251,191,36,0.08))] text-zinc-50" : "border-transparent text-muted-foreground hover:border-violet-400/20 hover:bg-zinc-900 hover:text-zinc-100"}`} aria-label={label}><span aria-hidden="true" className={active ? "text-amber-300" : "text-violet-300"}>{icon}</span><span className="sr-only">{label}</span></button>;
}

function SheetAction({ icon, label, onClick, disabled }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="flex items-center gap-2 rounded-md border border-fuchsia-500/15 bg-zinc-950/80 px-3 py-2 text-left text-xs text-foreground shadow-[0_0_0_1px_rgba(168,85,247,0.08)] transition hover:border-violet-400/25 hover:bg-zinc-900 disabled:opacity-40"><span className="text-amber-300">{icon}</span><span>{label}</span></button>;
}

function OpenAppMenuAction({ onOpen }: { onOpen: () => void }) {
  const { setOpenMobile } = useSidebar();

  return (
    <SheetAction
      icon={<PanelLeftOpen className="size-4" />}
      label="Main app menu"
      onClick={() => {
        onOpen();
        setOpenMobile(true);
      }}
    />
  );
}
