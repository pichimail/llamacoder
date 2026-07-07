"use client";

import { createMessage } from "@/app/(main)/actions";
import { DotFlow } from "@/components/ui/dot-flow";
import { toast } from "@/hooks/use-toast";
import { extractAllCodeBlocks, extractFirstCodeBlock, parseReplySegments } from "@/lib/utils";
import { mergeArtifactFiles } from "@/lib/code-patch";
import { repairMissingLocalComponentFiles } from "@/lib/artifact-auto-repair";
import { formatGeneratedCodeIssues, rewriteUnambiguousVisualTokens, validateGeneratedCodeFiles } from "@/lib/generated-code-validation";
import type { SandpackBuildOptions } from "@/lib/sandpack-config";
import { ShareDialog } from "@/components/dialogs/share-dialog";
import { useTheme } from "@/components/theme-provider";
import { startTransition, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { ChatCompletionStreamClient } from "@/lib/chat-completion-stream-client";
import dynamic from "next/dynamic";
import ChatBox from "./chat-box";
import { ChatPanel } from "./chat-panel";
import { CanvasMode } from "./canvas-mode";
import CodeViewer, { downloadFilesAsZip, type BuilderStatus } from "./code-viewer";
import type { Chat, Message, SidebarChat } from "./page";
import { Context } from "../../providers";
import ThemeToggle from "@/components/theme-toggle";
import { AlertCircle, Archive, ChevronDown, Code2, Copy, Database, Download, ExternalLink, Eye, GitPullRequest, Github, Image as ImageIcon, Layers, Loader2, Maximize2, MessageSquare, Monitor, MoreHorizontal, Palette, PanelLeftClose, PanelLeftOpen, PenLine, Settings, Share2, Smartphone, Sparkles, Star, Trash2, X } from "lucide-react";
import { Tip, TooltipProvider } from "@/components/ui/tooltip";
import { ChatsContextMenu } from "@/components/chats/chats-context-menu";
import { DesignWorkspace } from "@/components/chats/design-workspace";
import { ModeDatabase } from "@/components/chats/mode-database";
import { AIIntegrationChooser } from "@/components/chats/ai-integration-chooser";
import { McpChooser } from "@/components/chats/mcp-chooser";
import { CreditIndicator } from "@/components/chats/credit-indicator";
import { requiresAI, requiresMcpTools, type AICapability } from "@/lib/ai-detection";
import { useFeatureFlags } from "@/hooks/use-feature-flags";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ChatsAppSidebar } from "@/components/chats/app-sidebar";
import { useHomeSidebarData } from "@/components/home/use-home-sidebar-data";
import { getStackFromFiles } from "@/lib/artifact-runtime";
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

type BuilderMode = "preview" | "code" | "design" | "database" | "canvas";
type MobilePanel = "chat" | "code" | "preview";
type RawGeneratedFile = { path: string; code?: string; content?: string; language?: string; isPartial?: boolean };
const MAX_AUTO_FIX_ATTEMPTS = 1;
const FIX_CONTEXT_FILE_LIMIT = 18;
const FIX_CONTEXT_CHAR_BUDGET = 70000;
const SANDBOX_BUNDLER_TIMEOUT_RE = /Sandbox bundler did not respond in time/i;
/** Max automatic "continue where you left off" rounds fired when a response
 * is cut off at the provider's token limit. This is a distinct, faster-firing
 * loop from the general autofix loop above — truncation is a known, mechanical
 * failure mode (not a code-quality issue), so it gets its own generous budget
 * and doesn't count against MAX_AUTO_FIX_ATTEMPTS. */
const MAX_CONTINUATION_ROUNDS = 3;
/** How many trailing characters of a truncated response to send back to the
 * model as continuation context. Large enough to show the incomplete last
 * file, small enough to stay well under any model's input budget. */
const CONTINUATION_TAIL_CHARS = 6000;
/** Wall-clock budget for a single user-initiated build attempt (prompt →
 * generate → continuation → auto-fix), measured from the moment the generation
 * request starts on the client. Once elapsed, the AUTOMATIC auto-fix loop stops
 * kicking off new fix rounds — the last committed version is kept and the user
 * is offered a manual "Fix" — so a build can't silently churn through repeated
 * fix+continuation rounds toward the route's 300s ceiling. Truncation
 * continuations are deliberately NOT gated on this clock (they finish an
 * in-flight generation; cutting them off would emit broken code) — they stay
 * bounded by MAX_CONTINUATION_ROUNDS instead. These are intentionally generous
 * circuit-breaker ceilings (not the SLA target itself): they exist to stop
 * runaway fix+continuation churn well before the route's 300s cap, while still
 * leaving room for a large initial generation PLUS at least one full fix round
 * to finish without tripping. Frontend-only apps aim for the 30-60s window but
 * get 120s of slack; full-stack apps (backend mode) aim for 30-120s and get
 * 240s of slack. */
const GENERATION_BUDGET_MS = 120_000;
const GENERATION_BUDGET_FULLSTACK_MS = 240_000;

function getMessageFiles(message: Message): RawGeneratedFile[] {
  const stored = message.files as RawGeneratedFile[] | null;
  if (stored && Array.isArray(stored) && stored.length > 0) {
    // Filter out any invalid files
    return stored.filter(f => f && typeof f.path === 'string' && f.path.trim() && (f.code || f.content));
  }
  // FIXED: Extract from content with better error handling
  try {
    const extracted = extractAllCodeBlocks(message.content || "") as RawGeneratedFile[];
    return extracted.filter(f => f && f.path && (f.code || f.content));
  } catch (error) {
    console.warn('Failed to extract code blocks:', error);
    return [];
  }
}

function normalizeFile(file: RawGeneratedFile): ArtifactFile {
  const path = (file.path || "App.tsx").replace(/^\/+/, "");
  const code = typeof file.code === "string" ? file.code : file.content || "";
  const language = file.language || path.split(".").pop() || "tsx";
  return { path, code, language };
}

function normalizeAutoFixError(error: string) {
  return error
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/:\d+:\d+/g, ":line:col")
    .replace(/\bline\s+\d+\b/gi, "line n")
    .replace(/\bcolumn\s+\d+\b/gi, "column n")
    .replace(/\(\d+\)/g, "(n)")
    .replace(/\s+/g, " ");
}

function autoFixFingerprint(error: string) {
  return normalizeAutoFixError(error)
    .replace(/Generated code validation failed before preview commit\.\s*/i, "")
    .replace(/Preview error:\s*/i, "")
    .slice(0, 900);
}

function isNonFixablePreviewError(error: string) {
  return SANDBOX_BUNDLER_TIMEOUT_RE.test(error);
}

function isPlanModeConversation(messages: Message[]) {
  return messages.some(
    (message) =>
      message.role === "system" &&
      /PLAN mode|Buildable Scope|Not Possible \/ Needs Input/i.test(message.content || ""),
  );
}

function validationDescription(result: any, fallback: string) {
  const formatted = typeof result?.validation?.formatted === "string"
    ? result.validation.formatted.trim()
    : "";
  if (formatted) return formatted.slice(0, 900);

  const issues = Array.isArray(result?.validation?.issues)
    ? result.validation.issues
    : [];
  if (issues.length > 0) {
    return issues
      .slice(0, 3)
      .map((issue: any) => {
        const path = issue?.path ? `${issue.path}: ` : "";
        return `${path}${issue?.message || "Validation issue"}`;
      })
      .join("\n");
  }

  return result?.reason || fallback;
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
  const getCurrentSearchParams = () =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const [searchParams, setSearchParams] = useState<URLSearchParams>(
    () => getCurrentSearchParams(),
  );
  const refreshPage = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };
  const navigateTo = (href: string) => {
    if (typeof window !== "undefined") {
      window.location.assign(href);
    }
  };
  const isFullscreenPreview = searchParams.get("fs") === "1";
  const targetMessageId = searchParams.get("message");

  useEffect(() => {
    const syncSearchParams = () => {
      setSearchParams(getCurrentSearchParams());
    };
    syncSearchParams();
    window.addEventListener("popstate", syncSearchParams);
    return () => window.removeEventListener("popstate", syncSearchParams);
  }, []);

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
  // Immersive fullscreen: hides the sidebar, outer header, and chat rail so the
  // builder surface (preview/code/design) fills the whole viewport. Distinct
  // from chatCollapsed (a persistent layout preference) — this is a transient
  // "focus mode" toggle that restores whatever chatCollapsed was on exit.
  const [immersiveFullscreen, setImmersiveFullscreen] = useState(false);
  const effectiveChatCollapsed = chatCollapsed || immersiveFullscreen;
  const [mobileOptionsOpen, setMobileOptionsOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
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
  // Portal target for the design-tool controls: when Design mode is active,
  // DesignWorkspace portals its typography/color/layout inspector into this
  // node instead of the chat composer, so the two never stack side by side.
  const [designControlsSlot, setDesignControlsSlot] = useState<HTMLDivElement | null>(null);
  // The floating composer (shown when the chat rail is collapsed/immersive)
  // starts as a minimal single-line input; clicking its leading icon expands
  // it to the full composer, which then collapses back once a message sends.
  const [floatingComposerExpanded, setFloatingComposerExpanded] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("web");
  // Auto-fix defaults ON: most users never discover a manually-toggled setting,
  // and leaving it off by default meant validation failures (including
  // truncated generations) surfaced as dead-end errors instead of self-healing.
  // The UI toggle below still lets a user turn it off if they want.
  const [autoFixEnabled, setAutoFixEnabled] = useState(true);
  const [autoFixAttempt, setAutoFixAttempt] = useState(0);
  const [autoFixStatus, setAutoFixStatus] = useState<"idle" | "watching" | "fixing" | "fallback" | "ready">("idle");
  const [builderStatus, setBuilderStatus] = useState<BuilderStatus>(context.streamPromise ? "generating" : "ready");
  // Phase 1 audit — STEP 2 error UX (presentation layer only; the fix logic
  // stays in triggerAutoFix / requestFix). When auto-fix is OFF, a build/preview
  // error opens this non-dismissible dialog. When ON, a non-blocking toast is
  // shown instead (tracked via autoFixingToastRef).
  const [buildErrorDialog, setBuildErrorDialog] = useState<{ error: string; status: "idle" | "fixing" | "failed" } | null>(null);
  const autoFixingToastRef = useRef<ReturnType<typeof toast> | null>(null);
  // Phase 3: AI integration chooser state
  const { isEnabled: flagEnabled } = useFeatureFlags();
  const [aiChooserPending, setAiChooserPending] = useState(false);
  const [aiChooserCapabilities, setAiChooserCapabilities] = useState<AICapability[]>([]);
  const [pendingGenerateCallback, setPendingGenerateCallback] = useState<(() => void) | null>(null);

  // MCP chooser state (parallel to AI chooser)
  const [mcpChooserPending, setMcpChooserPending] = useState(false);
  const [mcpDetectedNeeds, setMcpDetectedNeeds] = useState<string[]>([]);
  const [mcpAvailableServers, setMcpAvailableServers] = useState<any[]>([]);
  const mcpChooserStorageKey = useMemo(() => `mcp-chooser:${chat.id}`, [chat.id]);
  const chatAiIntegration = (chat as any).aiIntegration as string | null | undefined;
  const aiChooserStorageKey = useMemo(() => `ai-chooser:${chat.id}`, [chat.id]);
  const [activeMessage, setActiveMessage] = useState<Message | undefined>(
    chat.messages
      .filter(
        (m: Message) =>
          m.role === "assistant" &&
          (Boolean(extractFirstCodeBlock(m.content)) ||
            (Array.isArray(m.files) && (m.files as unknown[]).length > 0)),
      )
      .at(-1),
  );
  const [shouldFocusInput, setShouldFocusInput] = useState(false);
  const streamPromiseRef = useRef(streamPromise);
  const streamTextRef = useRef(streamText);
  const isHandlingStreamRef = useRef(false);
  const generationStartKeyRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const autoFixAttemptRef = useRef(0);
  const autoFixPendingRef = useRef(false);
  const lastAutoFixErrorRef = useRef("");
  const lastAutoFixAtRef = useRef(0);
  const autoFixLedgerRef = useRef(new Map<string, number>());
  const hasAutoSwitchedPreviewRef = useRef(false);
  // Identity of the messageId/model that kicked off the current in-flight
  // generation. Populated at every site that starts a stream so a truncated
  // response can automatically fire a "continue" call against the same
  // message/model without the user having to do anything. If a call site
  // hasn't been updated to populate this, continuation degrades gracefully
  // to a manual "Continue generation" action instead of failing silently.
  const currentGenerationRef = useRef<{ messageId: string; model: string } | null>(null);
  const continuationRoundRef = useRef(0);
  const [continuationStatus, setContinuationStatus] = useState<"idle" | "continuing" | "exhausted">("idle");
  // Accumulates the full generated text across ALL continuation rounds, since
  // each round runs as a fresh effect invocation with its own local closure.
  // Reset to "" at every genuinely new (non-continuation) generation start.
  const accumulatedGenerationTextRef = useRef("");
  // Wall-clock deadline (epoch ms) for the current build attempt. Set at every
  // genuinely-new user turn (initial generation, follow-up message, manual fix)
  // and read by the automatic auto-fix loop so it stops spawning new rounds once
  // the SLA window has elapsed. 0 means "no active budget".
  const generationDeadlineRef = useRef(0);
  const startGenerationBudget = useCallback(() => {
    generationDeadlineRef.current =
      Date.now() + (chat.backendMode ? GENERATION_BUDGET_FULLSTACK_MS : GENERATION_BUDGET_MS);
  }, [chat.backendMode]);
  const isPastGenerationBudget = useCallback(
    () => generationDeadlineRef.current > 0 && Date.now() > generationDeadlineRef.current,
    [],
  );

  useEffect(() => { streamPromiseRef.current = streamPromise; }, [streamPromise]);
  useEffect(() => {
    if (!effectiveChatCollapsed) setFloatingComposerExpanded(false);
  }, [effectiveChatCollapsed]);

  // Tell the root GlobalAppShell to hide its own nav while immersive
  // fullscreen is active, and restore it on exit or unmount.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("hs-immersive-fullscreen", { detail: { active: immersiveFullscreen } }));
  }, [immersiveFullscreen]);
  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent("hs-immersive-fullscreen", { detail: { active: false } }));
    };
  }, []);
  useEffect(() => { streamTextRef.current = streamText; }, [streamText]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (chatAiIntegration) {
      window.sessionStorage.removeItem(aiChooserStorageKey);
      setAiChooserPending(false);
      return;
    }
    if (window.sessionStorage.getItem(aiChooserStorageKey) !== "pending") return;
    if (!flagEnabled("ai-chooser") || !flagEnabled("chinnallm")) return;

    const detection = requiresAI(chat.prompt || "");
    if (!detection.detected) {
      window.sessionStorage.removeItem(aiChooserStorageKey);
      return;
    }

    setAiChooserCapabilities(detection.capabilities);
    setAiChooserPending(true);
    setPendingGenerateCallback(() => () => {
      if (typeof window !== "undefined") window.location.reload();
    });
  }, [aiChooserStorageKey, chat.prompt, chatAiIntegration, flagEnabled]);

  // MCP chooser detection (similar pattern)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentMcp = (chat as any).mcpServers;
    if (currentMcp && Array.isArray(currentMcp) && currentMcp.length > 0) {
      window.sessionStorage.removeItem(mcpChooserStorageKey);
      setMcpChooserPending(false);
      return;
    }
    if (window.sessionStorage.getItem(mcpChooserStorageKey) !== "pending") return;
    if (!flagEnabled("mcp-support")) return; // optional flag, default to showing if not set

    const mcpDet = requiresMcpTools(chat.prompt || "");
    if (!mcpDet.detected) {
      window.sessionStorage.removeItem(mcpChooserStorageKey);
      return;
    }

    setMcpDetectedNeeds(mcpDet.needs);
    // Load user's saved MCP servers
    fetch("/api/mcp", { cache: "no-store" })
      .then(r => r.ok ? r.json() : { servers: [] })
      .then(d => setMcpAvailableServers(d.servers || []))
      .catch(() => setMcpAvailableServers([]));
    setMcpChooserPending(true);
    setPendingGenerateCallback(() => () => {
      if (typeof window !== "undefined") window.location.reload();
    });
  }, [mcpChooserStorageKey, chat.prompt, flagEnabled]);

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

  const assistantVersions = useMemo<{ id: string; version: number; label: string }[]>(() => {
    const assistants = chat.messages.filter((m: Message) => m.role === "assistant" && ((m.files as any[])?.length || extractAllCodeBlocks(m.content).length > 0));
    return assistants.map((m: Message, idx: number) => ({ id: m.id, version: (chat.assistantMessagesCountBefore || 0) + idx + 1, label: `v${(chat.assistantMessagesCountBefore || 0) + idx + 1}` }));
  }, [chat.messages, chat.assistantMessagesCountBefore]);

  const activeVersion = useMemo(() => activeMessage ? assistantVersions.find((v: { id: string; version: number; label: string }) => v.id === activeMessage.id) : undefined, [activeMessage, assistantVersions]);
  const activeFileCount = useMemo(() => activeMessage ? getMessageFiles(activeMessage).length : 0, [activeMessage]);

  const sandpackOptions = useMemo<SandpackBuildOptions>(
    () => ({
      includeShadcn: chat.shadcn,
      styleId: chat.styleId,
      theme: resolvedTheme === "dark" ? "dark" : "light",
    }),
    [chat.shadcn, chat.styleId, resolvedTheme],
  );

  const hasCodeInStream = useMemo(
    () => parseReplySegments(streamText).some((segment) => segment.type === "file"),
    [streamText],
  );
  const isReasoningStreaming =
    !!streamPromise && streamReasoningEnabled && !hasCodeInStream;
  const isPlanConversation = useMemo(
    () => isPlanModeConversation(chat.messages),
    [chat.messages],
  );

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
    const msg = chat.messages.find((m: Message) => m.id === messageId);
    if (!msg) return;
    setActiveMessage(msg);
    setActiveTab("code");
    setBuilderMode("code");
    setMobilePanel("code");
  }, [chat.messages]);

  const handleUndo = useCallback(() => {
    if (assistantVersions.length < 2) return;
    const currentIdx = activeMessage ? assistantVersions.findIndex((v: { id: string; version: number; label: string }) => v.id === activeMessage.id) : assistantVersions.length - 1;
    const targetIdx = currentIdx > 0 ? currentIdx - 1 : currentIdx === -1 ? assistantVersions.length - 2 : -1;
    if (targetIdx < 0) return;
    handleSwitchVersion(assistantVersions[targetIdx].id);
  }, [activeMessage, assistantVersions, handleSwitchVersion]);

  useEffect(() => {
    if (!targetMessageId) return;
    const target = chat.messages.find((m: Message) => m.id === targetMessageId && m.role === "assistant");
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

  useEffect(() => {
    const messageId = searchParams.get("generate");
    if (!messageId || streamPromiseRef.current || streamTextRef.current) return;
    // Phase 3: if no AI decision yet on this chat and the prompt needs AI, show chooser
    if (!chatAiIntegration && chat.messages.length <= 2) {
      const userPrompt = chat.prompt || "";
      const detection = requiresAI(userPrompt);
      if (detection.detected && !aiChooserPending && flagEnabled("ai-chooser") && flagEnabled("chinnallm")) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(aiChooserStorageKey, "pending");
        }
        setAiChooserCapabilities(detection.capabilities);
        setAiChooserPending(true);
        // Stash a callback so the chooser resumes generation after selection
        setPendingGenerateCallback(() => () => {
          // Trigger a re-render that re-enters this effect with aiIntegration set
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        });
        return; // pause — chooser will resume
      }
    }

    // MCP chooser trigger on initial generation
    const currentMcp = (chat as any).mcpServers;
    if ((!currentMcp || (Array.isArray(currentMcp) && currentMcp.length === 0)) && chat.messages.length <= 2) {
      const mcpDet = requiresMcpTools(chat.prompt || "");
      if (mcpDet.detected && !mcpChooserPending && flagEnabled("mcp-support")) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(mcpChooserStorageKey, "pending");
        }
        setMcpDetectedNeeds(mcpDet.needs);
        fetch("/api/mcp", { cache: "no-store" }).then(r => r.ok ? r.json() : {servers:[]}).then(d => setMcpAvailableServers(d.servers || [])).catch(() => {});
        setMcpChooserPending(true);
        setPendingGenerateCallback(() => () => {
          if (typeof window !== "undefined") window.location.reload();
        });
        return;
      }
    }

    const requestedModel = searchParams.get("model") || chat.model;
    const requestedQuality = searchParams.get("quality") === "high" ? "high" : "low";
    const reasoning =
      searchParams.get("reasoning") === "1" ||
      searchParams.get("reasoning") === "true";
    const startKey = `${messageId}:${requestedModel}:${requestedQuality}:${reasoning}`;
    if (generationStartKeyRef.current === startKey) return;
    generationStartKeyRef.current = startKey;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStreamText("");
    streamTextRef.current = "";
    setReasoningText("");
    setStreamReasoningEnabled(reasoning);
    setBuilderStatus("generating");
    setActiveTab("code");
    setBuilderMode("code");
    setMobilePanel("code");
    autoFixLedgerRef.current.clear();

    currentGenerationRef.current = { messageId, model: requestedModel };
    continuationRoundRef.current = 0;
    accumulatedGenerationTextRef.current = "";
    setContinuationStatus("idle");
    startGenerationBudget();

    const nextStreamPromise = fetch("/api/get-next-completion-stream-promise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        messageId,
        model: requestedModel,
        reasoning,
        quality: requestedQuality,
      }),
    }).then(async (res) => {
      if (!res.ok) throw new Error((await res.text()) || "Failed to start generation");
      if (!res.body) throw new Error("No body on response");
      return res.body;
    });

    streamPromiseRef.current = nextStreamPromise;
    setStreamPromise(nextStreamPromise);

    if (typeof window !== "undefined") {
      const nextParams = new URLSearchParams(window.location.search);
      nextParams.delete("generate");
      nextParams.delete("model");
      nextParams.delete("reasoning");
      nextParams.delete("quality");
      const nextSearch = nextParams.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
      window.history.replaceState(null, "", nextUrl);
      setSearchParams(nextParams);
    }
  }, [chat.model, searchParams, startGenerationBudget]);

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
    try {
      await workspaceRequest("sync", { files: normalizedFiles });
    } catch (error) {
      console.warn("Failed to sync generated workspace files:", error);
    }
  }, [workspaceRequest]);

  const handleNewStreamPromise = useCallback(
    (
      promise: Promise<ReadableStream>,
      options?: { reasoning: boolean; messageId?: string; model?: string },
      config?: { keepChatCollapsed?: boolean },
    ) => {
      setReasoningText("");
      setStreamText("");
      streamTextRef.current = "";
      setStreamReasoningEnabled(options?.reasoning ?? false);
      autoFixPendingRef.current = false;
      autoFixLedgerRef.current.clear();
      if (options?.messageId && options?.model) {
        currentGenerationRef.current = { messageId: options.messageId, model: options.model };
        continuationRoundRef.current = 0;
        accumulatedGenerationTextRef.current = "";
        setContinuationStatus("idle");
      }
      startGenerationBudget();
      setStreamPromise(promise);
      setBuilderStatus("generating");
      setBuilderMode("code");
      setMobilePanel("code");
      // The floating composer (shown while the chat rail is collapsed/immersive)
      // deliberately keeps the rail collapsed so the user stays immersed in the
      // preview while a follow-up generates; the normal docked composer always
      // re-expands the rail so newly streamed code is visible.
      if (!config?.keepChatCollapsed) setChatCollapsed(false);
    },
    [startGenerationBudget],
  );

  const requestFix = useCallback(async ({ error, auto, attempt, fallback, files }: { error: string; auto: boolean; attempt: number; fallback: boolean; files?: RawGeneratedFile[] }) => {
    // A user-initiated ("Fix") request is a fresh turn, so it opens a new
    // wall-clock budget; automatic fixes stay on the current attempt's budget.
    if (!auto) startGenerationBudget();
    const sourceFiles = files && files.length > 0 ? files : artifactFiles;
    const normalizedFiles = sourceFiles.map(normalizeFile);
    const hasLayout = normalizedFiles.some(f => f.path === "app/layout.tsx" || f.path === "app/layout.ts");
    const hasMultipleRoutes = normalizedFiles.filter(f => /^app\/.*\/page\.(tsx|ts|jsx|js)$/.test(f.path)).length > 1;
    const singleFileArtifact = normalizedFiles.length <= 1 || (normalizedFiles.length === 1 && normalizedFiles[0]?.path === "app/page.tsx");
    const isCrammedSinglePage = !hasLayout && !hasMultipleRoutes && normalizedFiles.length < 5;
    const shouldRebuild = fallback || singleFileArtifact || isCrammedSinglePage || attempt > 1;
    const prefix = auto
      ? shouldRebuild
        ? "The current app has errors. Fix it by improving the EXISTING files. Return complete updated versions of only the files that need changes, plus any new supporting files. Do NOT start from a blank scaffold — preserve routes, layout, components and state that were already working. Use app/layout + proper routes."
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
    currentGenerationRef.current = { messageId: message.id, model: chat.model };
    continuationRoundRef.current = 0;
    accumulatedGenerationTextRef.current = "";
    setContinuationStatus("idle");
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const nextStreamPromise = fetch("/api/get-next-completion-stream-promise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    setActiveTab("code");
    setBuilderMode("code");
    setMobilePanel("code");
    setChatCollapsed(false);
  }, [artifactFiles, chat.id, chat.model, startGenerationBudget]);

  const triggerAutoFix = useCallback(async ({ error, files, fallback = false, force = false }: { error: string; files?: RawGeneratedFile[]; fallback?: boolean; force?: boolean }) => {
    if (streamPromiseRef.current || streamTextRef.current || autoFixPendingRef.current) return;
    const normalized = error.trim();
    const currentFiles = files && files.length > 0 ? files : artifactFiles;
    const fingerprint = autoFixFingerprint(normalized);
    const ledgerKey = `${chat.id}:${fingerprint}`;

    if (!force && isNonFixablePreviewError(normalized)) {
      lastAutoFixErrorRef.current = normalized;
      autoFixPendingRef.current = false;
      setAutoFixStatus("idle");
      setBuilderStatus("failed");
      if (autoFixingToastRef.current) {
        autoFixingToastRef.current.dismiss();
        autoFixingToastRef.current = null;
      }
      toast({
        title: "Preview build is still starting",
        description: "The sandbox timed out before reporting a result. Refresh the preview or review the current files; no model fix was started.",
        variant: "destructive",
      });
      return;
    }

    // `force` runs a single fix even when auto-fix is globally OFF (the "Fix with
    // ChinnaLLM" button in the build-error dialog) WITHOUT flipping the setting.
    if (!autoFixEnabled && !force) {
      lastAutoFixErrorRef.current = normalized;
      setBuilderStatus("failed");
      return;
    }

    // SLA guard: once the build attempt's wall-clock budget is spent, stop
    // kicking off new AUTOMATIC fix rounds (each one is a fresh generation that
    // can itself fan out into continuations) so a build can't churn indefinitely
    // toward the route's 300s ceiling. A user-initiated fix (`force`) is a new
    // turn and is never blocked here — it resets the budget in requestFix.
    if (!force && isPastGenerationBudget()) {
      lastAutoFixErrorRef.current = normalized;
      autoFixPendingRef.current = false;
      setAutoFixStatus("idle");
      if (autoFixingToastRef.current) {
        autoFixingToastRef.current.dismiss();
        autoFixingToastRef.current = null;
      }
      setBuilderStatus("failed");
      toast({
        title: "Build is taking longer than expected",
        description: "Paused automatic fixes after the time budget. The latest version is saved for review.",
        variant: "destructive",
      });
      return;
    }

    const now = Date.now();
    const same = fingerprint === autoFixFingerprint(lastAutoFixErrorRef.current);
    // A forced (user-clicked "Fix") request must never silently no-op — the
    // dialog is already showing "fixing" and has no other way out.
    if (!force && same && now - lastAutoFixAtRef.current < 4500) return;
    if (!force && (autoFixLedgerRef.current.get(ledgerKey) ?? 0) >= MAX_AUTO_FIX_ATTEMPTS) {
      lastAutoFixErrorRef.current = normalized;
      autoFixPendingRef.current = false;
      setAutoFixAttempt(MAX_AUTO_FIX_ATTEMPTS);
      setAutoFixStatus("idle");
      setBuilderStatus("failed");
      if (autoFixingToastRef.current) {
        autoFixingToastRef.current.dismiss();
        autoFixingToastRef.current = null;
      }
      toast({
        title: "Automatic fix paused",
        description: "The same issue already triggered an automatic fix. Review the current files or run a manual fix.",
        variant: "destructive",
      });
      return;
    }
    if (force) autoFixAttemptRef.current = 0;
    const shouldForceFallback = fallback || currentFiles.length <= 1 || autoFixAttemptRef.current > 0;

    const nextAttempt = autoFixAttemptRef.current + 1;
    if (!force && nextAttempt > MAX_AUTO_FIX_ATTEMPTS) {
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
    if (!force) autoFixLedgerRef.current.set(ledgerKey, (autoFixLedgerRef.current.get(ledgerKey) ?? 0) + 1);
    setAutoFixAttempt(nextAttempt);
    setAutoFixStatus("fixing");
    setBuilderStatus("fixing");
    startTransition(async () => {
      try {
        await requestFix({ error: normalized, auto: !force, attempt: nextAttempt, fallback: shouldForceFallback, files: currentFiles });
      } catch {
        autoFixPendingRef.current = false;
        setAutoFixStatus("watching");
        setBuilderStatus("validating");
        setBuildErrorDialog((prev) => (prev && prev.status === "fixing" ? { ...prev, status: "failed" } : prev));
      }
    });
  }, [artifactFiles, autoFixEnabled, chat.id, requestFix, isPastGenerationBudget]);

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

  // STEP 2 — the single presentation funnel for a build/preview error.
  //   OFF: open the non-dismissible build-error dialog (2a).
  //   ON:  show a non-blocking "fixing automatically…" toast (2b) and let the
  //        existing pipeline self-heal. Neither branch changes fix logic.
  const presentBuildError = useCallback((error: string) => {
    if (autoFixEnabled) {
      if (isNonFixablePreviewError(error)) {
        void triggerAutoFix({ error, files: activeMessage ? getMessageFiles(activeMessage) : [] });
        return;
      }
      if (!autoFixingToastRef.current) {
        autoFixingToastRef.current = toast({
          title: "Error detected — fixing automatically…",
          description: "ChinnaLLM is applying a fix.",
        });
      }
      void triggerAutoFix({ error, files: activeMessage ? getMessageFiles(activeMessage) : [] });
      return;
    }
    lastAutoFixErrorRef.current = error.trim();
    autoFixPendingRef.current = false;
    setAutoFixStatus("idle");
    setBuilderStatus("failed");
  }, [autoFixEnabled, triggerAutoFix, activeMessage]);

  const handlePreviewError = useCallback((error: string) => {
    presentBuildError(error);
  }, [presentBuildError]);

  const handleDialogFixWithChinnaLLM = useCallback(async () => {
    if (!buildErrorDialog) return;
    const error = buildErrorDialog.error;
    setBuildErrorDialog({ error, status: "fixing" });
    // One-shot fix without changing the global auto-fix setting.
    await triggerAutoFix({ error, files: activeMessage ? getMessageFiles(activeMessage) : [], force: true });
  }, [buildErrorDialog, triggerAutoFix, activeMessage]);

  const handleDialogDismiss = useCallback(() => {
    setBuildErrorDialog(null);
  }, []);

  const handlePreviewReady = useCallback(() => {
    if (streamPromiseRef.current || streamTextRef.current) return;
    autoFixPendingRef.current = false;
    lastAutoFixErrorRef.current = "";
    autoFixAttemptRef.current = 0;
    setAutoFixAttempt(0);
    setAutoFixStatus("ready");
    setBuilderStatus("ready");
    // STEP 2 — the preview compiled, so any pending error UX has been resolved.
    // 2b: flip the auto-fixing toast to success, then auto-dismiss after 3s.
    if (autoFixingToastRef.current) {
      const t = autoFixingToastRef.current;
      autoFixingToastRef.current = null;
      t.update({ id: t.id, title: "Fixed — preview updated", description: "The build error was resolved." });
      setTimeout(() => t.dismiss(), 3000);
    }
    // 2a: close the build-error dialog once the fix produced a working preview.
    setBuildErrorDialog(null);
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
        if (e.key === "Escape" && immersiveFullscreen) { e.preventDefault(); setImmersiveFullscreen(false); return; }
        if (streamPromise) { e.preventDefault(); stopStreaming(); }
        if (showUnsavedOverlay) { e.preventDefault(); setShowUnsavedOverlay(false); }
      }
      if (e.key === "/" && !isInput && !streamPromise) { e.preventDefault(); setShouldFocusInput(true); }
      if (!isInput && e.altKey) {
        const map: Record<string, BuilderMode> = { "1": "preview", "2": "code", "3": "design", "4": "database", "5": "canvas" };
        if (map[e.key]) { e.preventDefault(); setModeSafely(map[e.key]); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [streamPromise, stopStreaming, setModeSafely, showUnsavedOverlay, immersiveFullscreen]);

  useEffect(() => {
    async function readStream() {
      if (!streamPromise || isHandlingStreamRef.current) return;
      isHandlingStreamRef.current = true;
      setBuilderStatus("generating");
      setReasoningText("");
      context.setStreamPromise(undefined);
      let stream: ReadableStream | null = null;
      try { stream = await streamPromise; }
      catch (error) {
        isHandlingStreamRef.current = false;
        abortControllerRef.current = null;
        setStreamPromise(undefined);
        setBuilderStatus("failed");
        // Don't leave the build-error dialog stuck at "fixing" (both its
        // actions are disabled in that state) if the fix's own stream never
        // even started.
        setBuildErrorDialog((prev) => (prev && prev.status === "fixing" ? { ...prev, status: "failed" } : prev));
        toast({
          title: "Generation failed",
          description: error instanceof Error ? error.message : "Failed to start generation.",
          variant: "destructive",
        });
        return;
      }
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
            setBuildErrorDialog((prev) => (prev && prev.status === "fixing" ? { ...prev, status: "failed" } : prev));
            toast({
              title: "Generation failed",
              description: error instanceof Error ? error.message : "Stream parsing failed.",
              variant: "destructive",
            });
          });
        completionStream.on("finalContent", async (finalText, info) => {
            abortControllerRef.current = null;
            const roundText = String(finalText ?? "");
            accumulatedGenerationTextRef.current += roundText;
            const resolvedText = accumulatedGenerationTextRef.current;
            const wasTruncated = Boolean((info as { wasTruncated?: boolean } | undefined)?.wasTruncated);

            if (wasTruncated && resolvedText.trim() && currentGenerationRef.current && continuationRoundRef.current < MAX_CONTINUATION_ROUNDS) {
              continuationRoundRef.current += 1;
              setContinuationStatus("continuing");
              setBuilderStatus("generating");
              toast({
                title: "Finishing remaining files...",
                description: `This build needs a bit more room (round ${continuationRoundRef.current}/${MAX_CONTINUATION_ROUNDS}). Continuing automatically.`,
              });
              try {
                const { messageId: contMessageId, model: contModel } = currentGenerationRef.current;
                const controller = new AbortController();
                abortControllerRef.current = controller;
                const continuationPromise = fetch("/api/get-next-completion-stream-promise", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  signal: controller.signal,
                  body: JSON.stringify({
                    messageId: contMessageId,
                    model: contModel,
                    isContinuation: true,
                    continuationContext: resolvedText.slice(-CONTINUATION_TAIL_CHARS),
                  }),
                }).then(async (res) => {
                  if (!res.ok) throw new Error((await res.text()) || "Failed to continue generation");
                  if (!res.body) throw new Error("No body on continuation response");
                  return res.body;
                });
                isHandlingStreamRef.current = false;
                streamPromiseRef.current = continuationPromise;
                setStreamPromise(continuationPromise);
                return;
              } catch (continuationError) {
                console.error("Auto-continuation failed:", continuationError);
                setContinuationStatus("exhausted");
                // Fall through to commit whatever we have rather than losing it.
              }
            } else if (wasTruncated && continuationRoundRef.current >= MAX_CONTINUATION_ROUNDS) {
              setContinuationStatus("exhausted");
              toast({
                title: "Generation still incomplete after 3 attempts",
                description: "This build is unusually large. The partial result was saved — click Regenerate or simplify the request.",
                variant: "destructive",
              });
            } else {
              setContinuationStatus("idle");
            }

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
              const baseFiles = activeMessage ? getMessageFiles(activeMessage) : [];
              const currentFiles = extractAllCodeBlocks(resolvedText) as RawGeneratedFile[];
              const repairedFiles = repairMissingLocalComponentFiles(
                mergeArtifactFiles(baseFiles, currentFiles),
              ) as RawGeneratedFile[];
              // Phase 1 audit — STEP 1: apply the unambiguous semantic-token
              // rewrites (e.g. bg-white → bg-background, text-black →
              // text-foreground) before validation, so only genuinely-ambiguous
              // visual issues reach the validator/autofix pipeline.
              const { files: mergedFiles } = rewriteUnambiguousVisualTokens(repairedFiles);
              if (mergedFiles.length === 0) {
                if (isPlanConversation) {
                  await createMessage(chat.id, resolvedText, "assistant", []);
                  isHandlingStreamRef.current = false;
                  setStreamText("");
                  setStreamPromise(undefined);
                  setStreamReasoningEnabled(false);
                  setBuilderStatus("ready");
                  setChatCollapsed(false);
                  setMobilePanel("chat");
                  refreshPage();
                  return;
                }
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
              const validationIssues = await validateGeneratedCodeFiles(mergedFiles, chat.styleId);
              if (validationIssues.length > 0) {
                const validationError = `Generated code validation failed before preview commit.\n\n${formatGeneratedCodeIssues(validationIssues)}`;
                const blockedMessage = await createMessage(chat.id, resolvedText, "assistant", mergedFiles);
                void syncWorkspaceFiles(mergedFiles);
                setActiveMessage(blockedMessage);
                setActiveTab("code");
                setBuilderMode("code");
                setMobilePanel("code");
                setChatCollapsed(false);
                isHandlingStreamRef.current = false;
                abortControllerRef.current = null;
                streamPromiseRef.current = undefined;
                streamTextRef.current = "";
                setStreamText("");
                setStreamPromise(undefined);
                setStreamReasoningEnabled(false);
                if (!autoFixEnabled) {
                  // STEP 2a — surface the validation failure through the same
                  // non-dismissible build-error dialog used for preview errors.
                  presentBuildError(validationError);
                  return;
                }
                await triggerAutoFix({ error: validationError, files: mergedFiles, fallback: true });
                return;
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
                setActiveTab("preview");
                setBuilderMode("preview");
                setMobilePanel("preview");
                setChatCollapsed(false);
                refreshPage();
              });
            });
          });
      } catch (error) {
        console.error(error);
        isHandlingStreamRef.current = false;
        setStreamPromise(undefined);
        setBuilderStatus("failed");
        setBuildErrorDialog((prev) => (prev && prev.status === "fixing" ? { ...prev, status: "failed" } : prev));
      }
    }
    readStream();
  }, [chat.id, chat.messages, streamPromise, context, autoFixEnabled, syncWorkspaceFiles, triggerAutoFix, presentBuildError, isPlanConversation]);

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
    if (/chinna|chinnallm|chinnaLLM|api\/chinnallm/i.test(code)) keys.add('CHINNALLM_ENABLED');
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
      refreshPage();
    });
  }, [chat.id, syncWorkspaceFiles]);

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

  const chatRequest = useCallback(async (method: "PATCH" | "POST" | "DELETE", payload?: Record<string, unknown>) => {
    const response = await fetch(`/api/chats/${chat.id}`, {
      method,
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Chat action failed");
    return data as any;
  }, [chat.id]);

  const handleRenameChat = useCallback(async () => {
    const nextTitle = window.prompt("Rename project", chat.title)?.trim();
    if (!nextTitle || nextTitle === chat.title) return;
    await chatRequest("PATCH", { title: nextTitle });
    toast({ title: "Project renamed" });
    refreshPage();
  }, [chat.title, chatRequest]);

  const handleToggleFavorite = useCallback(async () => {
    await chatRequest("PATCH", { isPinned: !chat.isPinned });
    toast({ title: chat.isPinned ? "Removed from favorites" : "Added to favorites" });
    refreshPage();
  }, [chat.isPinned, chatRequest]);

  const handleDuplicateChat = useCallback(async () => {
    const result = await chatRequest("POST", { action: "duplicate" });
    toast({ title: "Project duplicated" });
    if (result.chat?.id) navigateTo(`/chats/${result.chat.id}`);
  }, [chatRequest]);

  const handleDeleteChat = useCallback(async () => {
    if (!window.confirm(`Delete "${chat.title}"? This removes the chat and its messages.`)) return;
    await chatRequest("DELETE");
    toast({ title: "Project deleted" });
    navigateTo("/chats");
  }, [chat.title, chatRequest]);

  const handlePublishMobile = useCallback(async () => {
    if (!activeMessage?.id || artifactFiles.length === 0) return;
    try {
      const result = await workspaceRequest("publish", { messageId: activeMessage.id, files: artifactFiles });
      if (result.ok === false) {
        toast({
          title: "Publish blocked",
          description: validationDescription(result, "Fix validation errors before publishing."),
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

  // Full dynamic Git import handler - auto clone equivalent via GitHub API + stack detect + bootstrap files
  const handleDynamicGitImport = useCallback(async (url?: string) => {
    const targetUrl = url || window.prompt("Paste any GitHub (or public git) repo URL for dynamic import + auto bootstrap:", "https://github.com/");
    if (!targetUrl || !targetUrl.includes("github.com")) {
      toast({ title: "Enter a valid GitHub URL", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`/api/workspace/${chat.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import-git", url: targetUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Import failed");
      toast({ 
        title: "Dynamic import complete", 
        description: `${data.imported?.fileCount || 0} files • Stack: ${data.imported?.stack?.stack || 'detected'} • bootstrap.sh + RUN.md added` 
      });
      // Trigger preview update by refreshing workspace files into UI
      refreshPage(); // ensures activeMessage / workspace syncs into preview + terminal
    } catch (e: any) {
      toast({ title: "Git import failed", description: e.message, variant: "destructive" });
    }
  }, [chat.id]);

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
          chatModel={chat.model}
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
              setActiveMessage((current: Message | undefined) => (current ? { ...current, files: savedFiles } as Message : current));
            }
            if (pendingMode) {
              applyMode(pendingMode);
              setPendingMode(null);
            }
            refreshPage();
          }}
          saveRequest={designSaveRequest}
          previewMode={previewMode}
          sandpackOptions={sandpackOptions}
          controlsPortalTarget={!effectiveChatCollapsed ? designControlsSlot : null}
        />
      );
    }
    if (builderMode === "database") return <ModeDatabase chatId={chat.id} files={artifactFiles} />;
    if (builderMode === "canvas") {
      return (
        <CanvasMode
          files={artifactFiles}
          isStreaming={!!streamPromise}
          onRequestChange={(description) => {
            // Handle canvas node interaction by creating a new message
            startTransition(async () => {
              await createMessage(chat.id, description, "user");
              refreshPage();
            });
          }}
        />
      );
    }
    return (
      <CodeViewer
        streamText={streamText}
        chat={chat}
        message={activeMessage}
        activeTab={activeTab}
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
    return <main className="h-dvh w-full bg-background text-foreground" aria-label={`Fullscreen preview of ${chat.title}`}>{files.length > 0 ? <CodeRunner files={files.map((f) => ({ path: f.path, content: f.code ?? f.content ?? "" }))} previewMode={previewMode} showWebPreviewChrome showDeviceToggle sandpackOptions={sandpackOptions} /> : <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground"><DotFlow size={7} label="Preparing preview" /><p>No generated version to preview yet.</p></div>}</main>;
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
    activeTab !== "preview" &&
    builderMode !== "design";

  const backendSetupKeys = ["DATABASE_URL", "DIRECT_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY"];

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
        {!immersiveFullscreen && (
          <ChatsAppSidebar
            currentChatId={chat.id}
            chats={sidebarChats}
            user={user}
            authEnabled={authEnabled}
            isAuthenticated={isAuthenticated}
          />
        )}
        <SidebarInset className="min-h-0 overflow-hidden">
      <div className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-background text-foreground" onContextMenu={handleWorkspaceContextMenu}>
          {immersiveFullscreen && (
            <Tip label="Exit fullscreen (Esc)">
              <button
                type="button"
                onClick={() => setImmersiveFullscreen(false)}
                className="hs-composer-swap fixed right-3 top-3 z-50 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground/70 opacity-70 transition hover:bg-accent hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                aria-label="Exit fullscreen"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </Tip>
          )}
          {!immersiveFullscreen && (
          <header className="hs-composer-swap grid h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-border/70 bg-transparent px-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <Tip label="Open app menu">
                <SidebarTrigger className="inline-flex size-8 md:hidden" />
              </Tip>
              <Tip label={chatCollapsed ? "Expand chat rail" : "Collapse chat rail"}>
                <button type="button" onClick={() => setChatCollapsed((value) => !value)} className="hidden size-8 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring md:inline-flex" aria-label={chatCollapsed ? "Expand chat panel" : "Collapse chat panel"}>{chatCollapsed ? <PanelLeftOpen className="size-4" aria-hidden="true" /> : <PanelLeftClose className="size-4" aria-hidden="true" />}</button>
              </Tip>
              <div className="relative min-w-0">
                <button
                  type="button"
                  onClick={() => setProjectMenuOpen((value) => !value)}
                  className="hs-version-pill flex min-w-0 items-center gap-1.5 rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground transition hover:border-foreground/20 hover:text-foreground"
                  aria-haspopup="menu"
                  aria-expanded={projectMenuOpen}
                >
                  <Star className={`size-3.5 shrink-0 ${chat.isPinned ? "fill-amber-400 text-amber-400" : ""}`} aria-hidden="true" />
                  <span className="hidden max-w-[220px] truncate sm:inline">{chat.title}</span>
                  <span className="font-mono">{activeVersion ? activeVersion.label : "v0"}</span>
                  <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
                </button>
                {projectMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute left-0 top-9 z-50 w-64 overflow-hidden rounded-xl border border-border/70 bg-[#101010]/95 p-1.5 text-sm text-foreground shadow-2xl shadow-black/40 backdrop-blur"
                  >
                    <ProjectMenuItem icon={<PenLine className="size-4" />} label="Rename" onClick={() => { setProjectMenuOpen(false); void handleRenameChat(); }} />
                    <ProjectMenuItem icon={<Star className="size-4" />} label={chat.isPinned ? "Remove from Favorites" : "Add to Favorites"} onClick={() => { setProjectMenuOpen(false); void handleToggleFavorite(); }} />
                    <ProjectMenuItem icon={<Copy className="size-4" />} label="Duplicate..." onClick={() => { setProjectMenuOpen(false); void handleDuplicateChat(); }} />
                    <div className="my-1 h-px bg-border/70" />
                    <ProjectMenuItem icon={<Download className="size-4" />} label="Download ZIP" disabled={!canAct} onClick={() => { setProjectMenuOpen(false); handleDownloadZip(); }} />
                    <ProjectMenuItem icon={<Settings className="size-4" />} label="Settings" onClick={() => { setProjectMenuOpen(false); window.dispatchEvent(new CustomEvent("open-artifact-settings")); }} />
                    <ProjectMenuItem icon={<Archive className="size-4" />} label="Transfer..." onClick={() => { setProjectMenuOpen(false); toast({ title: "Transfer needs a team workspace", description: "Project ownership is protected until team transfer is configured." }); }} />
                    <div className="my-1 h-px bg-border/70" />
                    <ProjectMenuItem danger icon={<Trash2 className="size-4" />} label="Delete" onClick={() => { setProjectMenuOpen(false); void handleDeleteChat(); }} />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="hidden items-center rounded-lg border border-border/70 bg-transparent p-0.5 md:flex" aria-label="Artifact mode">
              <BuilderModeButton mode="preview" current={builderMode} label="Preview" icon={<Eye className="size-3.5" />} onClick={() => setModeSafely("preview")} />
              <BuilderModeButton mode="code" current={builderMode} label="Code" icon={<Code2 className="size-3.5" />} onClick={() => setModeSafely("code")} />
              <BuilderModeButton mode="design" current={builderMode} label="Design" icon={<Palette className="size-3.5" />} onClick={() => setModeSafely("design")} />
              <BuilderModeButton mode="database" current={builderMode} label="Database" icon={<Database className="size-3.5" />} onClick={() => setModeSafely("database")} />
              <BuilderModeButton mode="canvas" current={builderMode} label="Canvas" icon={<ImageIcon className="size-3.5" />} onClick={() => setModeSafely("canvas")} />
            </div>

            <div className="flex items-center justify-end gap-1.5">
              {/* Mobile compact controls */}
              <div className="flex items-center rounded-lg border border-border/70 bg-transparent p-0.5 md:hidden" aria-label="Mobile panels">
                <MobilePanelButton panel="chat" current={mobilePanel} label="Chat" icon={<MessageSquare className="size-3.5" />} onClick={() => switchMobilePanel("chat")} />
                <MobilePanelButton panel="code" current={mobilePanel} label="Code" icon={<Code2 className="size-3.5" />} onClick={() => switchMobilePanel("code")} />
                <MobilePanelButton panel="preview" current={mobilePanel} label="Preview" icon={<Eye className="size-3.5" />} onClick={() => switchMobilePanel("preview")} />
              </div>
              <button type="button" onClick={() => setMobileOptionsOpen(true)} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring md:hidden" aria-label="Open mobile options"><MoreHorizontal className="size-4" /></button>

              {/* Desktop: clean non-crowded toolbar with dynamic visibility */}
              {(builderMode === "preview" || builderMode === "design") && (
                <Tip label={`Switch to ${nextPreviewMode} preview`}>
                  <button
                    type="button"
                    onClick={() => setPreviewMode(nextPreviewMode)}
                    className="hidden size-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring md:inline-flex"
                    aria-label={`Switch to ${nextPreviewMode} preview`}
                  >
                    {previewMode === "web" ? <Smartphone className="size-4" /> : <Monitor className="size-4" />}
                  </button>
                </Tip>
              )}

              <Tip label="Enter immersive fullscreen">
                <button
                  type="button"
                  onClick={() => setImmersiveFullscreen(true)}
                  className="hidden size-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring md:inline-flex"
                  aria-label="Enter fullscreen"
                >
                  <Maximize2 className="size-4" aria-hidden="true" />
                </button>
              </Tip>

              {/* Compact primary actions + overflow dropdown for the rest (fixes overlap/crowding) */}
              <div className="hidden items-center gap-1 md:flex">
                {/* Dynamic: only show if we have an active artifact */}
                {canAct && (
                  <>
                    <Tip label="Share">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        onClick={handleShareLink}
                        aria-label="Share chat"
                        disabled={!activeMessage?.id}
                      >
                        <Share2 className="size-4" />
                      </Button>
                    </Tip>
                    <Tip label="Download ZIP">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        onClick={handleDownloadZip}
                        aria-label="Download zip"
                        disabled={!canAct}
                      >
                        <Download className="size-4" />
                      </Button>
                    </Tip>
                  </>
                )}

                {/* Consolidated actions dropdown — replaces crowded ArtifactActionBar in header */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-foreground"
                      aria-label="More actions"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="text-xs">Artifact actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleShareLink} disabled={!activeMessage?.id}>
                      <Share2 className="mr-2 size-4" /> Share link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handlePublishMobile} disabled={!canAct}>
                      <ExternalLink className="mr-2 size-4" /> Publish site
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadZip} disabled={!canAct}>
                      <Download className="mr-2 size-4" /> Download ZIP
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCreatePrMobile} disabled={!canAct}>
                      <GitPullRequest className="mr-2 size-4" /> Create PR
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent("open-artifact-settings"))}>
                      <Settings className="mr-2 size-4" /> Workspace settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        // Dynamic any-stack git import trigger — focuses composer with hint
                        const composer = document.querySelector('textarea[placeholder*="change"], textarea[placeholder*="message"]') as HTMLTextAreaElement | null;
                        if (composer) {
                          composer.focus();
                          composer.placeholder = "Paste GitHub URL here for instant clone + bootstrap (any stack)";
                        }
                        toast({ title: "Paste a GitHub URL in the chat input", description: "Works for Next.js, Python, Flutter, Java, Go, etc. Auto-generates bootstrap.sh + RUN.md" });
                      }}
                    >
                      <Github className="mr-2 size-4" /> Import Git repo (dynamic)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDynamicGitImport()}>
                      <Github className="mr-2 size-4" /> Import Git URL (with auto-run)
                    </DropdownMenuItem>
                    {assistantVersions.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-[10px] text-muted-foreground">Versions</DropdownMenuLabel>
                        {assistantVersions.slice().reverse().slice(0, 5).map((v) => (
                          <DropdownMenuItem key={v.id} onClick={() => handleSwitchVersion(v.id)}>
                            Restore {v.label}
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <CreditIndicator visible={chatAiIntegration === "chinnallm" && flagEnabled("credit-indicator")} className="hidden md:inline-flex" />

              {chatAiIntegration === "skip" && (
                <Tip label="Add AI to this app">
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden h-8 gap-1.5 px-2.5 text-xs md:inline-flex"
                    onClick={() => {
                      const detection = requiresAI(chat.prompt || "");
                      setAiChooserCapabilities(detection.capabilities.length ? detection.capabilities : ["text"]);
                      setPendingGenerateCallback(null);
                      setAiChooserPending(true);
                    }}
                  >
                    <Sparkles className="size-3.5" />
                    Add AI
                  </Button>
                </Tip>
              )}

              <div className="hidden md:block"><ThemeToggle /></div>
            </div>
          </header>
          )}

          <ResizablePanelGroup id="chat-builder-split" orientation="horizontal" className="min-h-0 flex-1 overflow-hidden">
            {!effectiveChatCollapsed ? (
              <>
                <ResizablePanel id="chat-panel" defaultSize="30%" minSize="20%" maxSize="45%" className={`${mobilePanel === "chat" ? "flex" : "hidden"} min-w-0 flex-col overflow-hidden bg-transparent md:flex md:border-r md:border-border/70`}>
                  <section className="flex h-full min-h-0 w-full flex-col overflow-hidden" aria-label="Chat panel">
                    {activeMessage && activeVersion && <div className="hs-version-strip flex items-center gap-2 border-b border-border/60 px-4 py-2 text-xs"><span className="inline-flex items-center rounded px-2 py-0.5 font-mono text-emerald-600 dark:text-emerald-400">{activeVersion.label}</span><span className="font-medium text-foreground">Version {activeVersion.version}</span><span className="text-muted-foreground">• {activeFileCount} file{activeFileCount === 1 ? "" : "s"}</span></div>}
                    {/* Dynamic stack + auto commands banner for Git imports */}
                    {(() => {
                      const currentFiles = artifactFiles.length ? artifactFiles : (activeMessage ? getMessageFiles(activeMessage).map(normalizeFile) : []);
                      const stk = currentFiles.length > 0 ? getStackFromFiles(currentFiles as any) : null;
                      if (!stk) return null;
                      return (
                        <div className="flex items-center gap-2 border-b border-border/50 bg-muted/10 px-4 py-1 text-[11px]">
                          <span className="text-emerald-400">Stack:</span> <span className="font-medium">{stk.stack}</span>
                          {stk.framework && <span className="text-muted-foreground">({stk.framework})</span>}
                          <span className="mx-1 text-muted-foreground/50">•</span>
                          <span className="font-mono text-amber-400 truncate max-w-[280px]" title={stk.devCommand}>{stk.devCommand}</span>
                          <button onClick={() => handleDynamicGitImport()} className="ml-auto text-[10px] underline text-muted-foreground hover:text-foreground">Re-import / change repo</button>
                        </div>
                      );
                    })()}
                    {chat.backendMode ? (
                      <BackendSetupPanel
                        envKeys={backendSetupKeys}
                        onConfigure={() => { setRequiredEnvKeys(backendSetupKeys); setEnvModalOpen(true); }}
                      />
                    ) : null}
                    <div className="min-h-0 flex-1 overflow-hidden">
                      <ChatPanel
                        chat={chat}
                        messages={chat.messages}
                        activeMessage={activeMessage}
                        onMessageClick={(message) => {
                          if (message !== activeMessage) {
                            setActiveMessage(message);
                            setActiveTab("code");
                            setBuilderMode("code");
                            setMobilePanel("code");
                          }
                        }}
                        streamText={streamText}
                        reasoningText={reasoningText}
                        isReasoningStreaming={isReasoningStreaming}
                        isStreaming={!!streamPromise}
                        showPlanMode={isPlanConversation || (!!streamPromise && !hasCodeInStream && streamText.length > 0)}
                        checkpoints={assistantVersions}
                        onRestoreCheckpoint={handleSwitchVersion}
                      />
                    </div>
                    {continuationStatus === "exhausted" && !streamPromise && (
                      <div className="shrink-0 px-3 pt-3">
                        <Alert variant="destructive" className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 size-4 shrink-0" />
                            <div>
                              <AlertTitle className="text-sm">Generation was interrupted</AlertTitle>
                              <AlertDescription className="text-xs">
                                This build needed more room than usual to finish. Your progress was saved — click Continue to pick up exactly where it left off.
                              </AlertDescription>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0"
                            onClick={() => {
                              if (!currentGenerationRef.current) return;
                              continuationRoundRef.current = 0;
                              setContinuationStatus("continuing");
                              setBuilderStatus("generating");
                              const { messageId: contMessageId, model: contModel } = currentGenerationRef.current;
                              const controller = new AbortController();
                              abortControllerRef.current = controller;
                              const continuationPromise = fetch("/api/get-next-completion-stream-promise", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                signal: controller.signal,
                                body: JSON.stringify({
                                  messageId: contMessageId,
                                  model: contModel,
                                  isContinuation: true,
                                  continuationContext: accumulatedGenerationTextRef.current.slice(-CONTINUATION_TAIL_CHARS),
                                }),
                              }).then(async (res) => {
                                if (!res.ok) throw new Error((await res.text()) || "Failed to continue generation");
                                if (!res.body) throw new Error("No body on continuation response");
                                return res.body;
                              });
                              streamPromiseRef.current = continuationPromise;
                              setStreamPromise(continuationPromise);
                            }}
                          >
                            Continue
                          </Button>
                        </Alert>
                      </div>
                    )}
                    {builderMode === "design" ? (
                      <div
                        key="design-controls"
                        ref={setDesignControlsSlot}
                        className="hs-composer-swap min-h-0 flex-1 overflow-y-auto border-t border-border/70"
                      />
                    ) : (
                      <div key="chat-composer" className="hs-composer-swap relative shrink-0 bg-gradient-to-t from-background via-background/85 to-transparent p-3 pt-4"><ChatBox chat={chat} onNewStreamPromise={handleNewStreamPromise} onAbortController={(c) => { abortControllerRef.current = c; }} isStreaming={!!streamPromise} onStop={stopStreaming} onUndo={handleUndo} versions={assistantVersions} currentVersionId={activeMessage?.id} onSwitchVersion={handleSwitchVersion} shouldFocusInput={shouldFocusInput} onInputFocused={() => setShouldFocusInput(false)} /></div>
                    )}
                  </section>
                </ResizablePanel>
                <ResizableHandle withHandle className="hidden md:flex" />
              </>
            ) : null}

            <ResizablePanel id="builder-panel" minSize="45%" className={`${mobilePanel === "chat" ? "hidden" : "flex"} min-h-0 min-w-0 flex-col overflow-hidden bg-transparent md:flex`}>
              {mcpChooserPending ? (
                <section className="flex h-full min-h-0 min-w-0 flex-col items-center justify-center overflow-y-auto p-4" aria-label="MCP servers chooser">
                  <McpChooser
                    chatId={chat.id}
                    detectedNeeds={mcpDetectedNeeds}
                    availableServers={mcpAvailableServers}
                    onSelect={(selected) => {
                      if (typeof window !== "undefined") {
                        window.sessionStorage.removeItem(mcpChooserStorageKey);
                      }
                      setMcpChooserPending(false);
                      if (pendingGenerateCallback) {
                        pendingGenerateCallback();
                        setPendingGenerateCallback(null);
                      }
                    }}
                  />
                </section>
              ) : aiChooserPending ? (
                <section className="flex h-full min-h-0 min-w-0 flex-col items-center justify-center overflow-y-auto p-4" aria-label="AI integration chooser">
                  <AIIntegrationChooser
                    chatId={chat.id}
                    capabilities={aiChooserCapabilities}
                    onSelect={(choice) => {
                      if (typeof window !== "undefined") {
                        window.sessionStorage.removeItem(aiChooserStorageKey);
                      }
                      setAiChooserPending(false);
                      // Resume the pending generation
                      if (pendingGenerateCallback) {
                        pendingGenerateCallback();
                        setPendingGenerateCallback(null);
                      }
                    }}
                  />
                </section>
              ) : (
                <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden" aria-label="Artifact builder panel">{renderBuilderSurface()}</section>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>

          {/* The docked composer only exists inside the chat rail, so once
              that rail is collapsed (manually, or via immersive fullscreen)
              there'd be no way to keep iterating on the artifact without
              re-expanding it. Surface the same ChatBox as a floating pill
              instead, so "chat" is always reachable regardless of layout. */}
          {effectiveChatCollapsed && (
            <div className="hs-composer-swap pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
              <div className={`pointer-events-auto w-full rounded-3xl border border-border/60 bg-background/90 shadow-[0_12px_48px_-12px] shadow-primary/25 ring-1 ring-border/50 backdrop-blur-xl transition-[max-width] duration-300 ${floatingComposerExpanded ? "max-w-xl" : "max-w-md"}`}>
                <ChatBox
                  chat={chat}
                  variant={floatingComposerExpanded ? "full" : "minimal"}
                  onExpand={() => setFloatingComposerExpanded(true)}
                  onNewStreamPromise={(promise, options) => {
                    setFloatingComposerExpanded(false);
                    handleNewStreamPromise(promise, options, { keepChatCollapsed: true });
                  }}
                  onAbortController={(c) => { abortControllerRef.current = c; }}
                  isStreaming={!!streamPromise}
                  onStop={stopStreaming}
                  onUndo={handleUndo}
                  versions={assistantVersions}
                  currentVersionId={activeMessage?.id}
                  onSwitchVersion={handleSwitchVersion}
                  shouldFocusInput={shouldFocusInput}
                  onInputFocused={() => setShouldFocusInput(false)}
                />
              </div>
            </div>
          )}
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
          onNewChat={() => navigateTo("/")}
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
                <SheetAction icon={<ImageIcon className="size-4" />} label="Canvas" onClick={() => { setModeSafely("canvas"); setMobileOptionsOpen(false); }} />
              </div>

              <div className="grid gap-1 border-t border-border/70 pt-3">
                <SheetAction icon={<Palette className="size-4" />} label="Visual editor" onClick={() => { setModeSafely("design"); setMobilePanel("preview"); setMobileOptionsOpen(false); }} />
                <SheetAction icon={previewMode === "web" ? <Smartphone className="size-4" /> : <Monitor className="size-4" />} label={`Switch to ${nextPreviewMode}`} onClick={() => setPreviewMode(nextPreviewMode)} />
                <SheetAction icon={<Database className="size-4" />} label="Database workspace" onClick={() => { setModeSafely("database"); setMobilePanel("preview"); setMobileOptionsOpen(false); }} />
                <SheetAction icon={<ImageIcon className="size-4" />} label="Canvas workspace" onClick={() => { setModeSafely("canvas"); setMobilePanel("preview"); setMobileOptionsOpen(false); }} />
                <OpenAppMenuAction onOpen={() => setMobileOptionsOpen(false)} />
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
                  {assistantVersions.slice().reverse().map((version: { id: string; version: number; label: string }) => (
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

        {/* Env vars modal — top-level so it renders on both desktop and mobile */}
        <Dialog open={envModalOpen} onOpenChange={setEnvModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Environment Variables Detected</DialogTitle>
              <DialogDescription>Your app needs these keys. Enter them now or skip to add later via workspace settings. Values are encrypted before storage.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {requiredEnvKeys.map(k => (
                <div key={k} className="flex gap-2 items-center">
                  <label className="w-40 shrink-0 text-sm font-mono text-muted-foreground">{k}</label>
                  <input
                    value={envValues[k] || ''}
                    onChange={e => setEnvValues(p => ({ ...p, [k]: e.target.value }))}
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-foreground/30"
                    placeholder="sk-..."
                    type="password"
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { requiredEnvKeys.forEach(k => void workspaceRequest('save-env', { key: k, value: 'placeholder' })); setEnvModalOpen(false); }}>Skip — Add Later</Button>
              <Button onClick={saveEnvFromModal}>Save to Project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* STEP 2a — non-dismissible build-error dialog, shown only when auto-fix
            is OFF. Closes on a successful fix (via handlePreviewReady) or Dismiss. */}
        <Dialog open={!!buildErrorDialog} onOpenChange={() => { /* non-dismissible: only footer actions close it */ }}>
          <DialogContent
            className="max-w-2xl [&>button]:hidden"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="size-5 text-destructive" aria-hidden="true" /> Build error
              </DialogTitle>
              <DialogDescription>
                {buildErrorDialog?.status === "failed"
                  ? "The automatic fix didn't resolve the error. Review the details below and try again or dismiss to edit manually."
                  : "The preview couldn't build. Fix it with ChinnaLLM, or dismiss to edit the code manually."}
              </DialogDescription>
            </DialogHeader>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 font-mono text-xs leading-5 text-foreground">
              {buildErrorDialog?.error || "Unknown build error."}
            </pre>
            <DialogFooter>
              <Button variant="ghost" onClick={handleDialogDismiss} disabled={buildErrorDialog?.status === "fixing"}>
                Cancel
              </Button>
              <Button onClick={handleDialogFixWithChinnaLLM} disabled={buildErrorDialog?.status === "fixing"}>
                {buildErrorDialog?.status === "fixing" ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> Fixing…
                  </>
                ) : (
                  "Fix"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </TooltipProvider>
  );
}

function BackendSetupPanel({ envKeys, onConfigure }: { envKeys: string[]; onConfigure: () => void }) {
  return (
    <div className="border-b border-border/60 px-4 py-3">
      <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Database className="size-4 text-muted-foreground" aria-hidden="true" /> Backend setup
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Neon/Postgres + Prisma files are enabled for this build. Add required variables before deploy.</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 rounded-lg" onClick={onConfigure}>Configure</Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {envKeys.map((key) => (
            <span key={key} className="rounded-md border border-border/70 px-2 py-1 font-mono text-[11px] text-muted-foreground">{key}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function BuilderModeButton({ mode, current, label, icon, onClick, compact }: { mode: BuilderMode; current: BuilderMode; label: string; icon: ReactNode; onClick: () => void; compact?: boolean }) {
  const active = current === mode;
  return <button type="button" aria-label={label} onClick={onClick} className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${active ? "border-fuchsia-400/35 bg-[linear-gradient(135deg,rgba(244,114,182,0.2),rgba(168,85,247,0.16),rgba(251,191,36,0.1))] text-zinc-50 shadow-[0_0_18px_rgba(244,114,182,0.16)]" : "border-transparent text-muted-foreground hover:border-violet-400/20 hover:bg-zinc-900 hover:text-zinc-100"} ${compact ? "w-full" : ""}`} title={label}><span aria-hidden="true" className={active ? "text-amber-300" : "text-violet-300"}>{icon}</span><span className={compact ? "sr-only" : "hidden lg:inline"}>{label}</span></button>;
}

function MobilePanelButton({ panel, current, label, icon, onClick }: { panel: MobilePanel; current: MobilePanel; label: string; icon: ReactNode; onClick: () => void }) {
  const active = current === panel;
  return <button type="button" onClick={onClick} className={`inline-flex h-8 items-center justify-center gap-1 rounded-md border px-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${active ? "border-fuchsia-400/35 bg-[linear-gradient(135deg,rgba(244,114,182,0.18),rgba(168,85,247,0.15),rgba(251,191,36,0.08))] text-zinc-50" : "border-transparent text-muted-foreground hover:border-violet-400/20 hover:bg-zinc-900 hover:text-zinc-100"}`} aria-label={label}><span aria-hidden="true" className={active ? "text-amber-300" : "text-violet-300"}>{icon}</span><span className="sr-only">{label}</span></button>;
}

function ProjectMenuItem({ icon, label, onClick, disabled, danger }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40 ${danger ? "text-red-400" : "text-foreground"}`}
    >
      <span className={danger ? "text-red-400" : "text-muted-foreground"}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
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
