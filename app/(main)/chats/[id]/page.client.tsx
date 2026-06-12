"use client";

import { createMessage } from "@/app/(main)/actions";
import {
  parseReplySegments,
  extractFirstCodeBlock,
  extractAllCodeBlocks,
} from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import {
  startTransition,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { ChatCompletionStream } from "together-ai/lib/ChatCompletionStream.mjs";
import dynamic from "next/dynamic";
import ChatBox from "./chat-box";
import ChatLog from "./chat-log";
import CodeViewer, { downloadFilesAsZip } from "./code-viewer";
import type { Chat, Message } from "./page";
import { Context } from "../../providers";
import ThemeToggle from "@/components/theme-toggle";
import { toast } from "@/hooks/use-toast";
import { Download, ExternalLink, Loader2, MessageSquare, Code2, Eye } from "lucide-react";
import { Tip, TooltipProvider } from "@/components/ui/tooltip";

const CodeRunner = dynamic(() => import("@/components/code-runner"), {
  ssr: false,
});

const MIN_CHAT_WIDTH = 260;
const MAX_CHAT_WIDTH = 520;

function getMessageFiles(message: Message) {
  const stored = message.files as any[] | null;
  if (stored && Array.isArray(stored) && stored.length > 0) return stored;
  return extractAllCodeBlocks(message.content);
}

export default function PageClient({ chat }: { chat: Chat }) {
  const context = use(Context);
  const [streamPromise, setStreamPromise] = useState<
    Promise<ReadableStream> | undefined
  >(context.streamPromise);
  const [streamText, setStreamText] = useState("");
  const [activeTab, setActiveTab] = useState<"code" | "preview">("preview");
  const [mobileView, setMobileView] = useState<"chat" | "builder">("chat");
  const [autoFixEnabled, setAutoFixEnabled] = useState(false);
  const [autoFixAttempt, setAutoFixAttempt] = useState(0);
  const [autoFixStatus, setAutoFixStatus] = useState<
    "idle" | "watching" | "fixing" | "fallback" | "ready"
  >("idle");

  // Admin-controlled default for the self-correcting repair loop
  useEffect(() => {
    fetch("/api/public-settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.autoFixDefault) {
          setAutoFixEnabled(true);
          setAutoFixStatus("watching");
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const router = useRouter();
  const isHandlingStreamRef = useRef(false);
  const autoFixAttemptRef = useRef(0);
  const autoFixPendingRef = useRef(false);
  const lastAutoFixErrorRef = useRef("");
  const lastAutoFixAtRef = useRef(0);
  const streamPromiseRef = useRef<Promise<ReadableStream> | undefined>(
    streamPromise,
  );
  const streamTextRef = useRef(streamText);
  const [activeMessage, setActiveMessage] = useState(
    chat.messages
      .filter((m) => m.role === "assistant" && extractFirstCodeBlock(m.content))
      .at(-1),
  );

  const [shouldFocusInput, setShouldFocusInput] = useState(false);

  // Resizable left chat pane
  const [chatPanelWidth, setChatPanelWidth] = useState(320);

  const dragRef = useRef<{ startX: number; startChat: number } | null>(null);

  const onSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startChat: chatPanelWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  // Keyboard-accessible splitter resize
  const onSplitterKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 48 : 16;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setChatPanelWidth((w) => Math.max(MIN_CHAT_WIDTH, w - step));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setChatPanelWidth((w) => Math.min(MAX_CHAT_WIDTH, w + step));
    } else if (e.key === "Home") {
      e.preventDefault();
      setChatPanelWidth(MIN_CHAT_WIDTH);
    } else if (e.key === "End") {
      e.preventDefault();
      setChatPanelWidth(MAX_CHAT_WIDTH);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { startX, startChat } = dragRef.current;
      const delta = e.clientX - startX;
      setChatPanelWidth(
        Math.max(MIN_CHAT_WIDTH, Math.min(MAX_CHAT_WIDTH, startChat + delta)),
      );
    };

    const handleMouseUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const searchParams = useSearchParams();
  const targetMessageId = searchParams.get("message");
  const isFullscreenPreview = searchParams.get("fs") === "1";

  const abortControllerRef = useRef<AbortController | null>(null);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {}
      abortControllerRef.current = null;
    }
    setStreamText("");
    setStreamPromise(undefined);
    isHandlingStreamRef.current = false;
    autoFixPendingRef.current = false;
    setAutoFixStatus(autoFixEnabled ? "watching" : "idle");
  }, [autoFixEnabled]);

  const assistantVersions = useMemo(() => {
    const assistants = chat.messages.filter(
      (m) =>
        m.role === "assistant" &&
        ((m.files as any[])?.length ||
          extractAllCodeBlocks(m.content).length > 0),
    );
    return assistants.map((m, idx) => {
      const v = (chat.assistantMessagesCountBefore || 0) + idx + 1;
      return { id: m.id, version: v, label: `v${v}` };
    });
  }, [chat.messages, chat.assistantMessagesCountBefore]);

  const activeVersion = useMemo(() => {
    if (!activeMessage) return undefined;
    return assistantVersions.find((v) => v.id === activeMessage.id);
  }, [activeMessage, assistantVersions]);

  const activeFileCount = useMemo(
    () => (activeMessage ? getMessageFiles(activeMessage).length : 0),
    [activeMessage],
  );

  const handleUndo = useCallback(() => {
    if (assistantVersions.length < 2) return;
    const currentIdx = activeMessage
      ? assistantVersions.findIndex((v) => v.id === activeMessage.id)
      : assistantVersions.length - 1;
    const targetIdx =
      currentIdx > 0
        ? currentIdx - 1
        : currentIdx === -1
          ? assistantVersions.length - 2
          : -1;
    if (targetIdx >= 0) {
      const prev = assistantVersions[targetIdx];
      const msg = chat.messages.find((m) => m.id === prev.id);
      if (msg) {
        setActiveMessage(msg);
        setActiveTab("preview");
      }
    }
  }, [activeMessage, assistantVersions, chat.messages]);

  const handleSwitchVersion = useCallback(
    (messageId: string) => {
      const msg = chat.messages.find((m) => m.id === messageId);
      if (msg) {
        setActiveMessage(msg);
        setActiveTab("preview");
      }
    },
    [chat.messages],
  );

  useEffect(() => {
    streamPromiseRef.current = streamPromise;
  }, [streamPromise]);

  useEffect(() => {
    streamTextRef.current = streamText;
  }, [streamText]);

  // Auto-activate target version for deep links (?message=...)
  useEffect(() => {
    if (targetMessageId && chat.messages.length > 0) {
      const target = chat.messages.find(
        (m) => m.id === targetMessageId && m.role === "assistant",
      );
      if (target) {
        setActiveMessage(target);
        setActiveTab("preview");
      }
    }
  }, [targetMessageId, chat.messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      if ((isMod && e.key === ".") || e.key === "Escape") {
        if (streamPromise) {
          e.preventDefault();
          stopStreaming();
        }
      }

      if (
        e.key === "/" &&
        document.activeElement &&
        !["TEXTAREA", "INPUT"].includes(
          (document.activeElement as HTMLElement).tagName,
        )
      ) {
        if (!streamPromise) {
          e.preventDefault();
          setShouldFocusInput(true);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [streamPromise, stopStreaming]);

  const playCompletionSound = useCallback(() => {
    try {
      const AudioContextConstructor: typeof window.AudioContext | undefined =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof window.AudioContext;
          }
        ).webkitAudioContext;
      if (!AudioContextConstructor) return;

      const audioContext = new AudioContextConstructor();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.12);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.18,
        audioContext.currentTime + 0.02,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + 0.32,
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.34);
      window.setTimeout(() => void audioContext.close(), 500);
    } catch {}
  }, []);

  const buildFixPrompt = useCallback(
    (error: string, attempt: number, useFallback: boolean) => {
      if (useFallback) {
        return `SELF-CORRECT (FALLBACK): The preview has failed multiple times. Completely rebuild the app from scratch while preserving the original user request and design intent.

Rules for this self-correction pass:
- Output a full, clean, working set of files.
- Eliminate every possible source of runtime or compile error (bad imports, missing types, Sandpack-incompatible packages).
- Inline any complex logic instead of relying on external packages when in doubt.
- Add extra defensive code: error boundaries (via simple try/catch + fallback UI), input sanitization, loading states, and empty states.
- Keep the exact same UI/UX the user asked for (use only shadcn + lucide + Tailwind patterns).
- The app must render and function in the preview without any further errors.

Failing error:
${error.trimStart()}`;
      }

      return `SELF-CORRECT: The current preview has an error. Analyze the error, identify the root cause, and emit a precise patch (only changed + new files) that fixes it while keeping all previous functionality and the user's original request.

Attempt ${attempt} of 3.

Self-correction guidelines:
- Prefer minimal targeted changes over full rewrites.
- If the error mentions a missing module/dependency, replace its usage with pure React + shadcn components or simple in-memory logic.
- Add guards, validation, and user-friendly error UIs so the app is more resilient.
- Maintain perfect visual and functional fidelity to what was already working.
- Return the files in the exact \`\`\`tsx{path=...} format.

Current preview error:
${error.trimStart()}`;
    },
    [],
  );

  const requestFix = useCallback(
    async ({
      error,
      auto,
      attempt,
      fallback,
    }: {
      error: string;
      auto: boolean;
      attempt: number;
      fallback: boolean;
    }) => {
      const newMessageText = auto
        ? buildFixPrompt(error, attempt, fallback)
        : `The code is not working. Can you fix it? Here's the error:\n\n${error.trimStart()}`;

      const message = await createMessage(chat.id, newMessageText, "user");

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const nextStreamPromise = fetch(
        "/api/get-next-completion-stream-promise",
        {
          method: "POST",
          body: JSON.stringify({
            messageId: message.id,
            model: chat.model,
          }),
          signal: controller.signal,
        },
      )
        .then(async (res) => {
          if (!res.ok) {
            throw new Error((await res.text()) || "Failed to start generation");
          }
          if (!res.body) {
            throw new Error("No body on response");
          }
          return res.body;
        })
        .catch((err) => {
          if (err?.name === "AbortError") {
            abortControllerRef.current = null;
            return null as any;
          }
          abortControllerRef.current = null;
          toast({
            title: "Generation failed",
            description:
              err instanceof Error ? err.message : String(err),
            variant: "destructive",
          });
          throw err;
        });

      setStreamPromise(nextStreamPromise);
      router.refresh();
    },
    [buildFixPrompt, chat.id, chat.model, router],
  );

  const handleAutoFixEnabledChange = useCallback((enabled: boolean) => {
    setAutoFixEnabled(enabled);
    autoFixAttemptRef.current = 0;
    autoFixPendingRef.current = false;
    lastAutoFixErrorRef.current = "";
    lastAutoFixAtRef.current = 0;
    setAutoFixAttempt(0);
    setAutoFixStatus(enabled ? "watching" : "idle");
  }, []);

  const handlePreviewError = useCallback(
    (error: string) => {
      if (!autoFixEnabled) return;
      if (streamPromiseRef.current || streamTextRef.current) return;
      if (autoFixPendingRef.current) return;

      const normalizedError = error.trim();
      const now = Date.now();
      const isSameError = normalizedError === lastAutoFixErrorRef.current;

      if (isSameError && autoFixAttemptRef.current >= 4) {
        setAutoFixStatus("fallback");
        return;
      }

      if (isSameError && now - lastAutoFixAtRef.current < 4500) {
        return;
      }

      if (!isSameError) {
        autoFixAttemptRef.current = 0;
      }

      const nextAttempt = autoFixAttemptRef.current + 1;
      const fallback = nextAttempt > 3;

      autoFixAttemptRef.current = nextAttempt;
      autoFixPendingRef.current = true;
      lastAutoFixErrorRef.current = normalizedError;
      lastAutoFixAtRef.current = now;
      setAutoFixAttempt(nextAttempt);
      setAutoFixStatus(fallback ? "fallback" : "fixing");

      startTransition(async () => {
        try {
          await requestFix({
            error,
            auto: true,
            attempt: nextAttempt,
            fallback,
          });
        } catch {
          autoFixPendingRef.current = false;
          setAutoFixStatus("watching");
        }
      });
    },
    [autoFixEnabled, requestFix],
  );

  const handlePreviewReady = useCallback(() => {
    if (!autoFixEnabled) return;
    if (streamPromiseRef.current || streamTextRef.current) return;

    autoFixPendingRef.current = false;
    lastAutoFixErrorRef.current = "";
    autoFixAttemptRef.current = 0;
    setAutoFixAttempt(0);
    setAutoFixStatus("ready");
    playCompletionSound();
  }, [autoFixEnabled, playCompletionSound]);

  useEffect(() => {
    async function f() {
      if (!streamPromise || isHandlingStreamRef.current) return;

      isHandlingStreamRef.current = true;
      context.setStreamPromise(undefined);

      let stream: ReadableStream | null = null;
      try {
        stream = await streamPromise;
      } catch (err: any) {
        if (err?.name === "AbortError") {
          isHandlingStreamRef.current = false;
          abortControllerRef.current = null;
          return;
        }
        console.error("Stream promise error", err);
        isHandlingStreamRef.current = false;
        abortControllerRef.current = null;
        setStreamPromise(undefined);
        return;
      }

      if (!stream) {
        isHandlingStreamRef.current = false;
        abortControllerRef.current = null;
        setStreamPromise(undefined);
        return;
      }

      let didPushToCode = false;

      try {
        ChatCompletionStream.fromReadableStream(stream)
          .on("content", (delta, content) => {
            if (!streamPromiseRef.current) return;
            setStreamText((text) => text + delta);

            if (
              !didPushToCode &&
              parseReplySegments(content).some((seg) => seg.type === "file")
            ) {
              didPushToCode = true;
              setActiveTab("code");
            }
          })
          .on("finalContent", async (finalText) => {
            abortControllerRef.current = null;
            startTransition(async () => {
              // Merge cumulative files: previous versions + current patch
              const previousAssistantMessages = chat.messages.filter(
                (m) =>
                  m.role === "assistant" &&
                  extractAllCodeBlocks(m.content).length > 0,
              );

              const previousFiles = previousAssistantMessages.flatMap((msg) =>
                getMessageFiles(msg),
              );

              const currentFiles = extractAllCodeBlocks(finalText);

              const fileMap = new Map();
              previousFiles.forEach((file) => fileMap.set(file.path, file));
              currentFiles.forEach((file) => fileMap.set(file.path, file));
              const allFiles = Array.from(fileMap.values());

              const message = await createMessage(
                chat.id,
                finalText,
                "assistant",
                allFiles,
              );

              startTransition(() => {
                isHandlingStreamRef.current = false;
                setStreamText("");
                setStreamPromise(undefined);
                autoFixPendingRef.current = false;
                if (autoFixEnabled) {
                  setAutoFixStatus("watching");
                }
                setActiveMessage(message);
                setActiveTab("preview");
                router.refresh();
              });
            });
          });
      } catch (err: any) {
        if (err?.name === "AbortError") {
          abortControllerRef.current = null;
        } else {
          console.error(err);
        }
        isHandlingStreamRef.current = false;
        setStreamPromise(undefined);
      }
    }

    f();
  }, [chat.id, router, streamPromise, context, autoFixEnabled]);

  // Manual editor saves -> persist as a new version and refresh
  const handleSaveFiles = useCallback(
    (files: { path: string; code: string; language: string }[]) => {
      startTransition(async () => {
        const content =
          "Manual edit saved from the code editor.\n\n" +
          files
            .map(
              (f) =>
                "```" + f.language + "{path=" + f.path + "}\n" + f.code + "\n```",
            )
            .join("\n\n");
        const newMessage = await createMessage(
          chat.id,
          content,
          "assistant",
          files,
        );
        setActiveMessage(newMessage);
        router.refresh();
      });
    },
    [chat.id, router],
  );

  const handleDownloadZip = useCallback(() => {
    const files = activeMessage ? getMessageFiles(activeMessage) : [];
    void downloadFilesAsZip(files, chat.title || "app");
  }, [activeMessage, chat.title]);

  const handlePublish = useCallback(async () => {
    if (!activeMessage) {
      toast({
        title: "Nothing to publish yet",
        description: "Generate a version first.",
        variant: "destructive",
      });
      return;
    }
    const url = `${window.location.origin}/share/v2/${activeMessage.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Published — link copied",
        description: "Anyone with the link can view this version live.",
      });
    } catch {}
    window.open(url, "_blank", "noopener,noreferrer");
  }, [activeMessage]);

  // Fullscreen preview mode (?fs=1) — used by "open in new tab" links
  if (isFullscreenPreview) {
    const files = activeMessage ? getMessageFiles(activeMessage) : [];
    return (
      <main
        className="h-dvh w-full bg-background text-foreground"
        aria-label={`Fullscreen preview of ${chat.title}`}
      >
        {files.length > 0 ? (
          <CodeRunner
            files={files.map((f: any) => ({
              path: f.path,
              content: f.code ?? f.content ?? "",
            }))}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            <p>No generated version to preview yet.</p>
          </div>
        )}
      </main>
    );
  }

  return (
    <TooltipProvider>
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-3 text-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
          <div className="flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground">
            <span className="font-mono">
              {activeVersion ? activeVersion.label : "—"}
            </span>
            <span className="hidden sm:inline" aria-hidden="true">
              •
            </span>
            <span className="hidden max-w-[220px] truncate sm:inline">
              {chat.title}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Mobile: switch between chat and builder */}
          <div className="mr-1 flex items-center rounded-lg border border-border p-0.5 md:hidden" role="tablist" aria-label="Mobile view">
            <button
              role="tab"
              aria-selected={mobileView === "chat"}
              onClick={() => setMobileView("chat")}
              className={`inline-flex size-7 items-center justify-center rounded-md ${mobileView === "chat" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
              aria-label="Chat view"
            >
              <MessageSquare className="size-3.5" aria-hidden="true" />
            </button>
            <button
              role="tab"
              aria-selected={mobileView === "builder" && activeTab === "code"}
              onClick={() => { setMobileView("builder"); setActiveTab("code"); }}
              className={`inline-flex size-7 items-center justify-center rounded-md ${mobileView === "builder" && activeTab === "code" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
              aria-label="Code view"
            >
              <Code2 className="size-3.5" aria-hidden="true" />
            </button>
            <button
              role="tab"
              aria-selected={mobileView === "builder" && activeTab === "preview"}
              onClick={() => { setMobileView("builder"); setActiveTab("preview"); }}
              className={`inline-flex size-7 items-center justify-center rounded-md ${mobileView === "builder" && activeTab === "preview" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
              aria-label="Preview view"
            >
              <Eye className="size-3.5" aria-hidden="true" />
            </button>
          </div>
          <Tip label="Download zip">
            <button
              onClick={handleDownloadZip}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              aria-label="Download generated code as a zip file"
            >
              <Download className="size-4" aria-hidden="true" />
            </button>
          </Tip>
          <Tip label="Publish — share a live link">
            <button
              onClick={handlePublish}
              className="inline-flex h-7 items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 text-xs font-medium text-white transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              aria-label="Publish and open shareable link"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Publish</span>
            </button>
          </Tip>
          <ThemeToggle />
        </div>
      </header>

      {/* Two-pane layout with resizable splitter */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <section
          style={{ ["--chat-w" as any]: chatPanelWidth + "px" }}
          className={`${mobileView === "chat" ? "flex" : "hidden"} h-full w-full flex-col overflow-hidden bg-card md:flex md:h-auto md:w-[var(--chat-w)] md:min-w-[260px] md:max-w-[520px] md:border-r md:border-border`}
          aria-label="Chat panel"
        >
          {activeMessage && activeVersion && (
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2 text-xs">
              <span className="inline-flex items-center rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-emerald-600 dark:text-emerald-400">
                {activeVersion.label}
              </span>
              <span className="font-medium text-foreground">
                Version {activeVersion.version}
              </span>
              <span className="text-muted-foreground">
                • {activeFileCount} file{activeFileCount === 1 ? "" : "s"}
              </span>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-hidden">
            <ChatLog
              chat={chat}
              streamText={streamText}
              activeMessage={activeMessage}
              onMessageClick={(message) => {
                if (message !== activeMessage) {
                  setActiveMessage(message);
                  setActiveTab("preview");
                }
              }}
            />
          </div>
          <div className="shrink-0 border-t border-border bg-card p-3">
            <ChatBox
              chat={chat}
              onNewStreamPromise={setStreamPromise}
              onAbortController={(c) => {
                abortControllerRef.current = c;
              }}
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
        </section>

        <div
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="Resize chat panel (arrow keys to adjust)"
          aria-valuemin={MIN_CHAT_WIDTH}
          aria-valuemax={MAX_CHAT_WIDTH}
          aria-valuenow={chatPanelWidth}
          onMouseDown={onSplitterMouseDown}
          onKeyDown={onSplitterKeyDown}
          className="group relative z-10 hidden w-[6px] flex-shrink-0 cursor-col-resize bg-border transition hover:bg-primary/50 focus-visible:bg-primary/60 focus-visible:outline-none md:block"
        >
          <div
            className="absolute inset-y-0 left-1/2 w-[2px] bg-current opacity-0 transition group-hover:opacity-100"
            aria-hidden="true"
          />
        </div>

        <section
          className={`${mobileView === "builder" ? "flex" : "hidden"} min-h-0 flex-1 flex-col overflow-hidden bg-background md:flex md:min-w-[360px]`}
          aria-label="Code and preview panel"
        >
          <CodeViewer
            streamText={streamText}
            chat={chat}
            message={activeMessage}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onRequestFix={(error: string) => {
              startTransition(async () => {
                await requestFix({
                  error,
                  auto: false,
                  attempt: 1,
                  fallback: false,
                });
              });
            }}
            onPreviewError={handlePreviewError}
            onPreviewReady={handlePreviewReady}
            onSaveFiles={handleSaveFiles}
            autoFixEnabled={autoFixEnabled}
            onAutoFixEnabledChange={handleAutoFixEnabledChange}
            autoFixAttempt={autoFixAttempt}
            autoFixStatus={autoFixStatus}
          />
        </section>
      </div>
    </div>
    </TooltipProvider>
  );
}
