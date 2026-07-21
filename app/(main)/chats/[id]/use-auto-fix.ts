"use client";

import { createMessage } from "@/app/(main)/actions";
import { toast } from "@/hooks/use-toast";
import {
  startTransition,
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { BuilderStatus } from "./code-viewer";
import type { Message } from "./page";
import {
  MAX_AUTO_FIX_ATTEMPTS,
  autoFixFingerprint,
  formatFixFileContext,
  getMessageFiles,
  isNonFixablePreviewError,
  normalizeFile,
  type RawGeneratedFile,
} from "./chat-helpers";
import type { ArtifactFile } from "@/lib/artifact-analysis";

export type AutoFixStatus = "idle" | "watching" | "fixing" | "fallback" | "ready";
export type BuildErrorDialog = { error: string; status: "idle" | "fixing" | "failed" } | null;

type UseAutoFixArgs = {
  chatId: string;
  chatModel: string;
  artifactFiles: ArtifactFile[];
  activeMessage: Message | undefined;
  streamPromiseRef: MutableRefObject<Promise<ReadableStream> | undefined>;
  streamTextRef: MutableRefObject<string>;
  abortControllerRef: MutableRefObject<AbortController | null>;
  currentGenerationRef: MutableRefObject<{ messageId: string; model: string } | null>;
  continuationRoundRef: MutableRefObject<number>;
  accumulatedGenerationTextRef: MutableRefObject<string>;
  startGenerationBudget: () => void;
  isPastGenerationBudget: () => boolean;
  setStreamPromise: Dispatch<SetStateAction<Promise<ReadableStream> | undefined>>;
  setStreamText: Dispatch<SetStateAction<string>>;
  setReasoningText: Dispatch<SetStateAction<string>>;
  setStreamReasoningEnabled: Dispatch<SetStateAction<boolean>>;
  setBuilderStatus: Dispatch<SetStateAction<BuilderStatus>>;
  setActiveTab: Dispatch<SetStateAction<"code" | "preview">>;
  setBuilderMode: Dispatch<SetStateAction<"preview" | "code" | "design" | "database" | "canvas">>;
  setMobilePanel: Dispatch<SetStateAction<"chat" | "code" | "preview">>;
  setChatCollapsed: Dispatch<SetStateAction<boolean>>;
  setContinuationStatus: Dispatch<SetStateAction<"idle" | "continuing" | "exhausted">>;
};

export function useAutoFix({
  chatId,
  chatModel,
  artifactFiles,
  activeMessage,
  streamPromiseRef,
  streamTextRef,
  abortControllerRef,
  currentGenerationRef,
  continuationRoundRef,
  accumulatedGenerationTextRef,
  startGenerationBudget,
  isPastGenerationBudget,
  setStreamPromise,
  setStreamText,
  setReasoningText,
  setStreamReasoningEnabled,
  setBuilderStatus,
  setActiveTab,
  setBuilderMode,
  setMobilePanel,
  setChatCollapsed,
  setContinuationStatus,
}: UseAutoFixArgs) {
  const [autoFixEnabled, setAutoFixEnabled] = useState(true);
  const [autoFixAttempt, setAutoFixAttempt] = useState(0);
  const [autoFixStatus, setAutoFixStatus] = useState<AutoFixStatus>("idle");
  const [buildErrorDialog, setBuildErrorDialog] = useState<BuildErrorDialog>(null);

  const autoFixAttemptRef = useRef(0);
  const autoFixPendingRef = useRef(false);
  const lastAutoFixErrorRef = useRef("");
  const lastAutoFixAtRef = useRef(0);
  const autoFixLedgerRef = useRef(new Map<string, number>());
  const hasAutoSwitchedPreviewRef = useRef(false);
  const autoFixingToastRef = useRef<ReturnType<typeof toast> | null>(null);

  const requestFix = useCallback(
    async ({
      error,
      auto,
      attempt,
      fallback,
      files,
    }: {
      error: string;
      auto: boolean;
      attempt: number;
      fallback: boolean;
      files?: RawGeneratedFile[];
    }) => {
      if (!auto) startGenerationBudget();
      const sourceFiles = files && files.length > 0 ? files : artifactFiles;
      const normalizedFiles = sourceFiles.map(normalizeFile);
      const hasLayout = normalizedFiles.some(
        (f) => f.path === "app/layout.tsx" || f.path === "app/layout.ts",
      );
      const hasMultipleRoutes =
        normalizedFiles.filter((f) => /^app\/.*\/page\.(tsx|ts|jsx|js)$/.test(f.path)).length > 1;
      const singleFileArtifact =
        normalizedFiles.length <= 1 ||
        (normalizedFiles.length === 1 && normalizedFiles[0]?.path === "app/page.tsx");
      const isCrammedSinglePage =
        !hasLayout && !hasMultipleRoutes && normalizedFiles.length < 5;
      const shouldRebuild =
        fallback || singleFileArtifact || isCrammedSinglePage || attempt > 1;
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
      const message = await createMessage(chatId, text, "user");
      currentGenerationRef.current = { messageId: message.id, model: chatModel };
      continuationRoundRef.current = 0;
      accumulatedGenerationTextRef.current = "";
      setContinuationStatus("idle");
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const nextStreamPromise = fetch("/api/get-next-completion-stream-promise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message.id, model: chatModel, reasoning: false }),
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
    },
    [
      artifactFiles,
      chatId,
      chatModel,
      startGenerationBudget,
      currentGenerationRef,
      continuationRoundRef,
      accumulatedGenerationTextRef,
      setContinuationStatus,
      abortControllerRef,
      setStreamPromise,
      setBuilderStatus,
      setStreamText,
      streamTextRef,
      setReasoningText,
      setStreamReasoningEnabled,
      setActiveTab,
      setBuilderMode,
      setMobilePanel,
      setChatCollapsed,
    ],
  );

  const triggerAutoFix = useCallback(
    async ({
      error,
      files,
      fallback = false,
      force = false,
    }: {
      error: string;
      files?: RawGeneratedFile[];
      fallback?: boolean;
      force?: boolean;
    }) => {
      if (streamPromiseRef.current || streamTextRef.current || autoFixPendingRef.current) return;
      const normalized = error.trim();
      const currentFiles = files && files.length > 0 ? files : artifactFiles;
      const fingerprint = autoFixFingerprint(normalized);
      const ledgerKey = `${chatId}:${fingerprint}`;

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
          description:
            "The sandbox timed out before reporting a result. Refresh the preview or review the current files; no model fix was started.",
          variant: "destructive",
        });
        return;
      }

      if (!autoFixEnabled && !force) {
        lastAutoFixErrorRef.current = normalized;
        setBuilderStatus("failed");
        return;
      }

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
          description:
            "Paused automatic fixes after the time budget. The latest version is saved for review.",
          variant: "destructive",
        });
        return;
      }

      const now = Date.now();
      const same = fingerprint === autoFixFingerprint(lastAutoFixErrorRef.current);
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
          description:
            "The same issue already triggered an automatic fix. Review the current files or run a manual fix.",
          variant: "destructive",
        });
        return;
      }
      if (force) autoFixAttemptRef.current = 0;
      const shouldForceFallback =
        fallback || currentFiles.length <= 1 || autoFixAttemptRef.current > 0;

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
      if (!force) {
        autoFixLedgerRef.current.set(
          ledgerKey,
          (autoFixLedgerRef.current.get(ledgerKey) ?? 0) + 1,
        );
      }
      setAutoFixAttempt(nextAttempt);
      setAutoFixStatus("fixing");
      setBuilderStatus("fixing");
      startTransition(async () => {
        try {
          await requestFix({
            error: normalized,
            auto: !force,
            attempt: nextAttempt,
            fallback: shouldForceFallback,
            files: currentFiles,
          });
        } catch {
          autoFixPendingRef.current = false;
          setAutoFixStatus("watching");
          setBuilderStatus("validating");
          setBuildErrorDialog((prev) =>
            prev && prev.status === "fixing" ? { ...prev, status: "failed" } : prev,
          );
        }
      });
    },
    [
      artifactFiles,
      autoFixEnabled,
      chatId,
      requestFix,
      isPastGenerationBudget,
      streamPromiseRef,
      streamTextRef,
      setBuilderStatus,
    ],
  );

  const handleAutoFixEnabledChange = useCallback(
    (enabled: boolean) => {
      setAutoFixEnabled(enabled);
      autoFixAttemptRef.current = 0;
      autoFixPendingRef.current = false;
      lastAutoFixErrorRef.current = "";
      lastAutoFixAtRef.current = 0;
      setAutoFixAttempt(0);
      setAutoFixStatus(enabled ? "watching" : "idle");
      if (enabled && activeMessage) setBuilderStatus("validating");
    },
    [activeMessage, setBuilderStatus],
  );

  const presentBuildError = useCallback(
    (error: string) => {
      if (autoFixEnabled) {
        if (isNonFixablePreviewError(error)) {
          void triggerAutoFix({
            error,
            files: activeMessage ? getMessageFiles(activeMessage) : [],
          });
          return;
        }
        if (!autoFixingToastRef.current) {
          autoFixingToastRef.current = toast({
            title: "Error detected — fixing automatically…",
            description: "ChinnaLLM is applying a fix.",
          });
        }
        void triggerAutoFix({
          error,
          files: activeMessage ? getMessageFiles(activeMessage) : [],
        });
        return;
      }
      lastAutoFixErrorRef.current = error.trim();
      autoFixPendingRef.current = false;
      setAutoFixStatus("idle");
      setBuilderStatus("failed");
    },
    [autoFixEnabled, triggerAutoFix, activeMessage, setBuilderStatus],
  );

  const handlePreviewError = useCallback(
    (error: string) => {
      presentBuildError(error);
    },
    [presentBuildError],
  );

  const handleDialogFixWithChinnaLLM = useCallback(async () => {
    if (!buildErrorDialog) return;
    const error = buildErrorDialog.error;
    setBuildErrorDialog({ error, status: "fixing" });
    await triggerAutoFix({
      error,
      files: activeMessage ? getMessageFiles(activeMessage) : [],
      force: true,
    });
  }, [buildErrorDialog, triggerAutoFix, activeMessage]);

  const handleDialogDismiss = useCallback(() => {
    setBuildErrorDialog(null);
  }, []);

  const handlePreviewReady = useCallback(() => {
    autoFixPendingRef.current = false;
    lastAutoFixErrorRef.current = "";
    autoFixAttemptRef.current = 0;
    setAutoFixAttempt(0);
    setAutoFixStatus("ready");
    setBuilderStatus("ready");
    if (autoFixingToastRef.current) {
      const t = autoFixingToastRef.current;
      autoFixingToastRef.current = null;
      t.update({
        id: t.id,
        title: "Fixed — preview updated",
        description: "The build error was resolved.",
      });
      setTimeout(() => t.dismiss(), 3000);
    }
    setBuildErrorDialog(null);
    if (!hasAutoSwitchedPreviewRef.current && activeMessage) {
      hasAutoSwitchedPreviewRef.current = true;
      setActiveTab("preview");
      setBuilderMode("preview");
      setMobilePanel("preview");
    }
  }, [activeMessage, setBuilderStatus, setActiveTab, setBuilderMode, setMobilePanel]);

  const resetAutoFixForMessage = useCallback(() => {
    hasAutoSwitchedPreviewRef.current = false;
    autoFixPendingRef.current = false;
    autoFixAttemptRef.current = 0;
    lastAutoFixErrorRef.current = "";
    lastAutoFixAtRef.current = 0;
    setAutoFixAttempt(0);
    setAutoFixStatus(autoFixEnabled ? "watching" : "idle");
    setBuilderStatus("validating");
  }, [autoFixEnabled, setBuilderStatus]);

  const clearAutoFixLedger = useCallback(() => {
    autoFixLedgerRef.current.clear();
  }, []);

  const markAutoFixIdleOnStop = useCallback(() => {
    autoFixPendingRef.current = false;
    setAutoFixStatus(autoFixEnabled ? "watching" : "idle");
  }, [autoFixEnabled]);

  const markAutoFixPendingFalse = useCallback(() => {
    autoFixPendingRef.current = false;
  }, []);

  const resetAutoFixAttemptCounters = useCallback(() => {
    autoFixPendingRef.current = false;
    autoFixAttemptRef.current = 0;
    setAutoFixAttempt(0);
    if (autoFixEnabled) setAutoFixStatus("watching");
  }, [autoFixEnabled]);

  return {
    autoFixEnabled,
    setAutoFixEnabled,
    autoFixAttempt,
    autoFixStatus,
    setAutoFixStatus,
    buildErrorDialog,
    setBuildErrorDialog,
    autoFixAttemptRef,
    autoFixPendingRef,
    autoFixLedgerRef,
    hasAutoSwitchedPreviewRef,
    autoFixingToastRef,
    lastAutoFixErrorRef,
    requestFix,
    triggerAutoFix,
    handleAutoFixEnabledChange,
    presentBuildError,
    handlePreviewError,
    handleDialogFixWithChinnaLLM,
    handleDialogDismiss,
    handlePreviewReady,
    resetAutoFixForMessage,
    clearAutoFixLedger,
    markAutoFixIdleOnStop,
    markAutoFixPendingFalse,
    resetAutoFixAttemptCounters,
  };
}
