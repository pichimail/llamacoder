"use client";

import { createMessage } from "@/app/(main)/actions";
import LogoSmall from "@/components/icons/logo-small";
import {
  parseReplySegments,
  extractFirstCodeBlock,
  extractAllCodeBlocks,
} from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import {
  memo,
  startTransition,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { ChatCompletionStream } from "together-ai/lib/ChatCompletionStream.mjs";
import ChatBox from "./chat-box";
import ChatLog from "./chat-log";
import CodeViewer from "./code-viewer";
import type { Chat, Message } from "./page";
import { Context } from "../../providers";
import ThemeToggle from "@/components/theme-toggle";
import { toast } from "@/hooks/use-toast";

const HeaderChat = memo(({ chat }: { chat: Chat }) => (
  <div className="flex items-center justify-between gap-4 px-4 py-4">
    <a href="/" className="inline-flex items-center gap-3">
      <LogoSmall />
      <span
        className="text-sm font-semibold tracking-tight text-foreground"
        aria-label="Chinna-Coder logo link"
      >
        Chinna-Coder
      </span>
    </a>
    <div className="flex items-center gap-3">
      <p className="italic text-muted-foreground" aria-live="polite">
        {chat.title}
      </p>
      <ThemeToggle />
    </div>
  </div>
));

HeaderChat.displayName = "HeaderChat";

export default function PageClient({ chat }: { chat: Chat }) {
  const context = use(Context);
  const [streamPromise, setStreamPromise] = useState<
    Promise<ReadableStream> | undefined
  >(context.streamPromise);
  const [streamText, setStreamText] = useState("");
  const [activeTab, setActiveTab] = useState<"code" | "preview">("preview");
  const [autoFixEnabled, setAutoFixEnabled] = useState(false);
  const [autoFixAttempt, setAutoFixAttempt] = useState(0);
  const [autoFixStatus, setAutoFixStatus] = useState<
    "idle" | "watching" | "fixing" | "fallback" | "ready"
  >("idle");
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

  // Resizable state for left chat pane (subtle splitter like v0/lovable)
  const [chatPanelWidth, setChatPanelWidth] = useState(300);

  const dragRef = useRef<{
    startX: number;
    startChat: number;
  } | null>(null);

  const onSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startChat: chatPanelWidth,
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { startX, startChat } = dragRef.current;
      const delta = e.clientX - startX;
      const newWidth = Math.max(220, Math.min(520, startChat + delta));
      setChatPanelWidth(newWidth);
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
      return {
        id: m.id,
        version: v,
        label: `v${v}`,
      };
    });
  }, [chat.messages, chat.assistantMessagesCountBefore]);

  const handleUndo = useCallback(() => {
    if (assistantVersions.length < 2) return;
    const currentIdx = activeMessage
      ? assistantVersions.findIndex((v) => v.id === activeMessage.id)
      : assistantVersions.length - 1;
    if (currentIdx > 0) {
      const prev = assistantVersions[currentIdx - 1];
      const msg = chat.messages.find((m) => m.id === prev.id);
      if (msg) {
        setActiveMessage(msg);
        // setIsShowingCodeViewer(true); // removed in new two-pane layout
        setActiveTab("preview");
      }
    } else if (currentIdx === -1 && assistantVersions.length > 0) {
      // switch to second to last if none active
      const prev = assistantVersions[assistantVersions.length - 2];
      const msg = chat.messages.find((m) => m.id === prev.id);
      if (msg) {
        setActiveMessage(msg);
        // setIsShowingCodeViewer(true); // removed in new two-pane layout
        setActiveTab("preview");
      }
    }
  }, [activeMessage, assistantVersions, chat.messages]);

  const handleSwitchVersion = useCallback(
    (messageId: string) => {
      const msg = chat.messages.find((m) => m.id === messageId);
      if (msg) {
        setActiveMessage(msg);
        // setIsShowingCodeViewer(true); // removed in new two-pane layout
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

  // Auto-activate target version for full screen new tab links
  useEffect(() => {
    if (targetMessageId && chat.messages.length > 0) {
      const target = chat.messages.find(
        (m) => m.id === targetMessageId && m.role === "assistant",
      );
      if (target) {
        setActiveMessage(target);
        // setIsShowingCodeViewer(true); // removed in new two-pane layout
        setActiveTab("preview");
      }
    }
  }, [targetMessageId, chat.messages]);

  // Minimal keyboard shortcuts (highest leverage, zero UI)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + .  or Escape → stop current build
      if ((isMod && e.key === ".") || e.key === "Escape") {
        if (streamPromise) {
          e.preventDefault();
          stopStreaming();
        }
      }

      // /  (when not typing in an input) → focus the prompt
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
          toast({ title: "Generation failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
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
      let didPushToPreview = false;

      try {
        ChatCompletionStream.fromReadableStream(stream)
          .on("content", (delta, content) => {
            // Stop consuming if aborted
            if (!streamPromiseRef.current) return;
            setStreamText((text) => text + delta);

            if (
              !didPushToCode &&
              parseReplySegments(content).some((seg) => seg.type === "file")
            ) {
              didPushToCode = true;
              // setIsShowingCodeViewer(true); // removed in new two-pane layout
              setActiveTab("code");
            }

            if (
              !didPushToPreview &&
              parseReplySegments(content).some(
                (seg) => seg.type === "file" && !seg.isPartial,
              )
            ) {
              didPushToPreview = true;
              // setIsShowingCodeViewer(true); // removed in new two-pane layout
            }
          })
          .on("finalContent", async (finalText) => {
            abortControllerRef.current = null;
            startTransition(async () => {
              // Get all previous assistant messages with files
              const previousAssistantMessages = chat.messages.filter(
                (m) =>
                  m.role === "assistant" &&
                  extractAllCodeBlocks(m.content).length > 0,
              );

              // Extract all files from previous messages
              const previousFiles = previousAssistantMessages.flatMap((msg) =>
                extractAllCodeBlocks(msg.content),
              );

              // Extract files from current AI response
              const currentFiles = extractAllCodeBlocks(finalText);

              // Merge files (current overrides previous for same paths)
              const fileMap = new Map();
              previousFiles.forEach((file) => fileMap.set(file.path, file));
              currentFiles.forEach((file) => fileMap.set(file.path, file));
              const allFiles = Array.from(fileMap.values());

              const message = await createMessage(
                chat.id,
                finalText, // Store original AI response content (only changed files)
                "assistant",
                allFiles, // Store cumulative files
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
                // When streaming finishes, switch to preview mode and keep the viewer open
                // setIsShowingCodeViewer(true); // removed in new two-pane layout
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

  return (
    <div className="h-dvh bg-background text-foreground flex flex-col overflow-hidden dark">
      {/* Top bar exactly like the screenshot */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-zinc-950 px-3 text-sm">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <LogoSmall />
            <span>Chinna-Coder</span>
          </a>
          <div className="mx-1 h-4 w-px bg-border" />
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-zinc-900 px-2 py-1 text-xs text-muted-foreground">
            <span className="font-mono">v1</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline truncate max-w-[180px]">{chat.title}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setActiveTab("code")} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-zinc-900 px-3 py-1 text-xs font-medium text-foreground hover:bg-zinc-800">View Code</button>
          <button onClick={() => setActiveTab("preview")} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-zinc-900 px-3 py-1 text-xs font-medium text-foreground hover:bg-zinc-800">Preview App</button>
          <button onClick={() => toast({ title: "Download", description: "Zip of files" })} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-zinc-900 px-3 py-1 text-xs font-medium text-foreground hover:bg-zinc-800">Download Code (zip)</button>
          <button onClick={() => window.open(`/chats/${chat.id}?fs=1&preview=1`, "_blank")} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500">Publish</button>
          <ThemeToggle />
        </div>
      </div>

      {/* Two pane with resizable subtle splitter - left chat with version badge, right builder exactly like the screenshot */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div style={{ width: chatPanelWidth + "px" }} className="flex flex-col border-r border-border bg-zinc-950 min-w-[260px] max-w-[420px] overflow-hidden">
          {activeMessage && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-zinc-900/50 text-xs">
              <span className="inline-flex items-center rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-400 font-mono">v1</span>
              <span className="font-medium text-foreground">Version 1</span>
              <span className="text-muted-foreground">• 3 files edited</span>
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatLog
              chat={chat}
              streamText={streamText}
              activeMessage={activeMessage}
              onMessageClick={(message) => {
                if (message !== activeMessage) {
                  setActiveMessage(message);
                  setActiveTab("preview");
                } else {
                  setActiveMessage(undefined);
                }
              }}
            />
          </div>
          <div className="shrink-0 border-t border-border bg-zinc-950 p-3">
            <ChatBox
              chat={chat}
              onNewStreamPromise={setStreamPromise}
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

        <div
          className="w-[6px] bg-border hover:bg-primary/50 cursor-col-resize flex-shrink-0 relative z-10 group"
          onMouseDown={onSplitterMouseDown}
        >
          <div className="absolute inset-y-0 left-1/2 w-[2px] bg-current opacity-0 group-hover:opacity-100 transition" />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950 min-w-[400px]">
          <CodeViewer
            streamText={streamText}
            chat={chat}
            message={activeMessage}
            onMessageChange={setActiveMessage}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onClose={() => { setActiveMessage(undefined); }}
            onRequestFix={(error: string) => {
              startTransition(async () => {
                await requestFix({ error, auto: false, attempt: 1, fallback: false });
              });
            }}
            onPreviewError={handlePreviewError}
            onPreviewReady={handlePreviewReady}
            autoFixEnabled={autoFixEnabled}
            onAutoFixEnabledChange={handleAutoFixEnabledChange}
            autoFixAttempt={autoFixAttempt}
            autoFixStatus={autoFixStatus}
            onRestore={async (message, oldVersion, newVersion) => {
              startTransition(async () => {
                if (!message) return;
                const getFilesFromMessage = (msg: Message) => (msg.files as any[]) || extractAllCodeBlocks(msg.content);
                const restoredFiles = getFilesFromMessage(message);
                if (restoredFiles.length === 0) return;
                const explanation = `Version ${newVersion} was created by restoring version ${oldVersion}.`;
                const newContent = explanation + "\n\n" + restoredFiles.map(f => `\`\`\`${f.language}{path=${f.path}}\n${f.code}\n\`\`\``).join("\n\n");
                const newMessage = await createMessage(chat.id, newContent, "assistant", restoredFiles);
                setActiveMessage(newMessage);
                router.refresh();
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
