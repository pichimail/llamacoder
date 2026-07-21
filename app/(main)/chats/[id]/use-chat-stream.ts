"use client";

import { createMessage } from "@/app/(main)/actions";
import { toast } from "@/hooks/use-toast";
import { extractAllCodeBlocks, parseReplySegments } from "@/lib/utils";
import { mergeArtifactFiles } from "@/lib/code-patch";
import { repairMissingLocalComponentFiles } from "@/lib/artifact-auto-repair";
import {
  formatGeneratedCodeIssues,
  rewriteUnambiguousVisualTokens,
  validateGeneratedCodeFiles,
} from "@/lib/generated-code-validation";
import { ChatCompletionStreamClient } from "@/lib/chat-completion-stream-client";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { BuilderStatus } from "./code-viewer";
import type { Chat, Message } from "./page";
import {
  CONTINUATION_TAIL_CHARS,
  GENERATION_BUDGET_FULLSTACK_MS,
  GENERATION_BUDGET_MS,
  MAX_CONTINUATION_ROUNDS,
  getMessageFiles,
  isPlanModeConversation,
  type RawGeneratedFile,
} from "./chat-helpers";

type UseChatStreamArgs = {
  chat: Chat;
  contextStreamPromise: Promise<ReadableStream> | undefined;
  setContextStreamPromise: (p: Promise<ReadableStream> | undefined) => void;
  activeMessage: Message | undefined;
  setActiveMessage: Dispatch<SetStateAction<Message | undefined>>;
  autoFixEnabled: boolean;
  isPlanConversation: boolean;
  syncWorkspaceFiles: (files: RawGeneratedFile[]) => Promise<void>;
  triggerAutoFix: (args: {
    error: string;
    files?: RawGeneratedFile[];
    fallback?: boolean;
    force?: boolean;
  }) => Promise<void>;
  presentBuildError: (error: string) => void;
  showEnvModalIfNeeded: (files: { path: string; code: string; language: string }[]) => void;
  clearAutoFixLedger: () => void;
  markAutoFixIdleOnStop: () => void;
  markAutoFixPendingFalse: () => void;
  resetAutoFixAttemptCounters: () => void;
  setBuildErrorDialog: Dispatch<
    SetStateAction<{ error: string; status: "idle" | "fixing" | "failed" } | null>
  >;
  setBuilderStatus: Dispatch<SetStateAction<BuilderStatus>>;
  setActiveTab: Dispatch<SetStateAction<"code" | "preview">>;
  setBuilderMode: Dispatch<SetStateAction<"preview" | "code" | "design" | "database" | "canvas">>;
  setMobilePanel: Dispatch<SetStateAction<"chat" | "code" | "preview">>;
  setChatCollapsed: Dispatch<SetStateAction<boolean>>;
  hasAutoSwitchedPreviewRef: MutableRefObject<boolean>;
  searchParams: URLSearchParams;
  setSearchParams: Dispatch<SetStateAction<URLSearchParams>>;
  /** AI/MCP chooser gates — if true, URL-driven generation is paused */
  aiChooserPending: boolean;
  mcpChooserPending: boolean;
  chatAiIntegration: string | null | undefined;
  onMaybeShowAiChooser: () => boolean;
  onMaybeShowMcpChooser: () => boolean;
};

export function useChatStream({
  chat,
  contextStreamPromise,
  setContextStreamPromise,
  activeMessage,
  setActiveMessage,
  autoFixEnabled,
  isPlanConversation,
  syncWorkspaceFiles,
  triggerAutoFix,
  presentBuildError,
  showEnvModalIfNeeded,
  clearAutoFixLedger,
  markAutoFixIdleOnStop,
  markAutoFixPendingFalse,
  resetAutoFixAttemptCounters,
  setBuildErrorDialog,
  setBuilderStatus,
  setActiveTab,
  setBuilderMode,
  setMobilePanel,
  setChatCollapsed,
  hasAutoSwitchedPreviewRef,
  searchParams,
  setSearchParams,
  aiChooserPending,
  mcpChooserPending,
  chatAiIntegration,
  onMaybeShowAiChooser,
  onMaybeShowMcpChooser,
}: UseChatStreamArgs) {
  const [streamPromise, setStreamPromise] = useState<Promise<ReadableStream> | undefined>(
    contextStreamPromise,
  );
  const [streamText, setStreamText] = useState("");
  const [reasoningText, setReasoningText] = useState("");
  const [streamReasoningEnabled, setStreamReasoningEnabled] = useState(false);
  const [continuationStatus, setContinuationStatus] = useState<
    "idle" | "continuing" | "exhausted"
  >("idle");

  const streamPromiseRef = useRef(streamPromise);
  const streamTextRef = useRef(streamText);
  const isHandlingStreamRef = useRef(false);
  const generationStartKeyRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentGenerationRef = useRef<{ messageId: string; model: string } | null>(null);
  const continuationRoundRef = useRef(0);
  const accumulatedGenerationTextRef = useRef("");
  const generationDeadlineRef = useRef(0);

  useEffect(() => {
    streamPromiseRef.current = streamPromise;
  }, [streamPromise]);
  useEffect(() => {
    streamTextRef.current = streamText;
  }, [streamText]);

  const startGenerationBudget = useCallback(() => {
    generationDeadlineRef.current =
      Date.now() + (chat.backendMode ? GENERATION_BUDGET_FULLSTACK_MS : GENERATION_BUDGET_MS);
  }, [chat.backendMode]);

  const isPastGenerationBudget = useCallback(
    () => generationDeadlineRef.current > 0 && Date.now() > generationDeadlineRef.current,
    [],
  );

  const refreshPage = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  const stopStreaming = useCallback(() => {
    try {
      abortControllerRef.current?.abort();
    } catch {}
    abortControllerRef.current = null;
    setStreamText("");
    setReasoningText("");
    setStreamReasoningEnabled(false);
    setStreamPromise(undefined);
    isHandlingStreamRef.current = false;
    markAutoFixIdleOnStop();
    setBuilderStatus(activeMessage ? "validating" : "ready");
  }, [activeMessage, markAutoFixIdleOnStop, setBuilderStatus]);

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
      markAutoFixPendingFalse();
      clearAutoFixLedger();
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
      if (!config?.keepChatCollapsed) setChatCollapsed(false);
    },
    [
      startGenerationBudget,
      markAutoFixPendingFalse,
      clearAutoFixLedger,
      setBuilderStatus,
      setBuilderMode,
      setMobilePanel,
      setChatCollapsed,
    ],
  );

  const handleContinueGeneration = useCallback(() => {
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
  }, [setBuilderStatus]);

  // URL-driven generation start (?generate=messageId)
  useEffect(() => {
    const messageId = searchParams.get("generate");
    if (!messageId || streamPromiseRef.current || streamTextRef.current) return;

    if (!chatAiIntegration && chat.messages.length <= 2) {
      if (onMaybeShowAiChooser()) return;
    }
    if (onMaybeShowMcpChooser()) return;

    const requestedModel = searchParams.get("model") || chat.model;
    const requestedQuality = searchParams.get("quality") === "high" ? "high" : "low";
    const reasoning =
      searchParams.get("reasoning") === "1" || searchParams.get("reasoning") === "true";
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
    clearAutoFixLedger();

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
  }, [
    chat.model,
    chat.messages.length,
    chatAiIntegration,
    searchParams,
    startGenerationBudget,
    onMaybeShowAiChooser,
    onMaybeShowMcpChooser,
    clearAutoFixLedger,
    setBuilderStatus,
    setActiveTab,
    setBuilderMode,
    setMobilePanel,
    setSearchParams,
  ]);

  // Core stream reader
  useEffect(() => {
    async function readStream() {
      if (!streamPromise || isHandlingStreamRef.current) return;
      isHandlingStreamRef.current = true;
      setBuilderStatus("generating");
      setReasoningText("");
      setContextStreamPromise(undefined);
      let stream: ReadableStream | null = null;
      try {
        stream = await streamPromise;
      } catch (error) {
        isHandlingStreamRef.current = false;
        abortControllerRef.current = null;
        setStreamPromise(undefined);
        setBuilderStatus("failed");
        setBuildErrorDialog((prev) =>
          prev && prev.status === "fixing" ? { ...prev, status: "failed" } : prev,
        );
        toast({
          title: "Generation failed",
          description: error instanceof Error ? error.message : "Failed to start generation.",
          variant: "destructive",
        });
        return;
      }
      if (!stream) {
        isHandlingStreamRef.current = false;
        setStreamPromise(undefined);
        return;
      }
      let didPushToCode = false;
      try {
        const completionStream = ChatCompletionStreamClient.fromReadableStream(stream);
        completionStream.on("content", (delta, content) => {
          if (!streamPromiseRef.current) return;
          const deltaText = String(delta ?? "");
          const fullText = String(content ?? "");
          setStreamText((text) => text + deltaText);
          if (
            !didPushToCode &&
            parseReplySegments(fullText).some((seg) => seg.type === "file")
          ) {
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
          setBuildErrorDialog((prev) =>
            prev && prev.status === "fixing" ? { ...prev, status: "failed" } : prev,
          );
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
          const wasTruncated = Boolean(
            (info as { wasTruncated?: boolean } | undefined)?.wasTruncated,
          );

          if (
            wasTruncated &&
            resolvedText.trim() &&
            currentGenerationRef.current &&
            continuationRoundRef.current < MAX_CONTINUATION_ROUNDS
          ) {
            continuationRoundRef.current += 1;
            setContinuationStatus("continuing");
            setBuilderStatus("generating");
            toast({
              title: "Finishing remaining files...",
              description: `This build needs a bit more room (round ${continuationRoundRef.current}/${MAX_CONTINUATION_ROUNDS}). Continuing automatically.`,
            });
            try {
              const { messageId: contMessageId, model: contModel } =
                currentGenerationRef.current;
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
                if (!res.ok)
                  throw new Error((await res.text()) || "Failed to continue generation");
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
            }
          } else if (
            wasTruncated &&
            continuationRoundRef.current >= MAX_CONTINUATION_ROUNDS
          ) {
            setContinuationStatus("exhausted");
            toast({
              title: `Generation still incomplete after ${MAX_CONTINUATION_ROUNDS} attempts`,
              description:
                "This build is unusually large. The partial result was saved — click Regenerate or simplify the request.",
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
              description:
                "The model returned an empty response. Try another model or rephrase your prompt.",
              variant: "destructive",
            });
            return;
          }
          startTransition(async () => {
            const baseFiles = activeMessage ? getMessageFiles(activeMessage) : [];
            const currentFiles = extractAllCodeBlocks(resolvedText) as RawGeneratedFile[];
            const repairedFiles = repairMissingLocalComponentFiles(
              mergeArtifactFiles(baseFiles, currentFiles),
            ) as RawGeneratedFile[];
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
                description:
                  "The model replied without fenced code blocks. Try again or switch models.",
                variant: "destructive",
              });
              return;
            }
            const validationIssues = await validateGeneratedCodeFiles(
              mergedFiles,
              chat.styleId,
            );
            if (validationIssues.length > 0) {
              const validationError = `Generated code validation failed before preview commit.\n\n${formatGeneratedCodeIssues(validationIssues)}`;
              const blockedMessage = await createMessage(
                chat.id,
                resolvedText,
                "assistant",
                mergedFiles,
              );
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
                presentBuildError(validationError);
                return;
              }
              await triggerAutoFix({ error: validationError, files: mergedFiles, fallback: true });
              return;
            }
            const message = await createMessage(
              chat.id,
              resolvedText,
              "assistant",
              mergedFiles,
            );
            void syncWorkspaceFiles(mergedFiles);
            showEnvModalIfNeeded(mergedFiles as any);
            startTransition(() => {
              isHandlingStreamRef.current = false;
              setStreamText("");
              setStreamPromise(undefined);
              setStreamReasoningEnabled(false);
              resetAutoFixAttemptCounters();
              setBuilderStatus("validating");
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
        setBuildErrorDialog((prev) =>
          prev && prev.status === "fixing" ? { ...prev, status: "failed" } : prev,
        );
      }
    }
    readStream();
  }, [
    chat.id,
    chat.styleId,
    streamPromise,
    autoFixEnabled,
    syncWorkspaceFiles,
    triggerAutoFix,
    presentBuildError,
    isPlanConversation,
    activeMessage,
    setActiveMessage,
    setContextStreamPromise,
    setBuildErrorDialog,
    setBuilderStatus,
    setActiveTab,
    setBuilderMode,
    setMobilePanel,
    setChatCollapsed,
    showEnvModalIfNeeded,
    resetAutoFixAttemptCounters,
    hasAutoSwitchedPreviewRef,
  ]);

  return {
    streamPromise,
    setStreamPromise,
    streamText,
    setStreamText,
    reasoningText,
    setReasoningText,
    streamReasoningEnabled,
    setStreamReasoningEnabled,
    continuationStatus,
    setContinuationStatus,
    streamPromiseRef,
    streamTextRef,
    abortControllerRef,
    currentGenerationRef,
    continuationRoundRef,
    accumulatedGenerationTextRef,
    startGenerationBudget,
    isPastGenerationBudget,
    stopStreaming,
    handleNewStreamPromise,
    handleContinueGeneration,
  };
}
