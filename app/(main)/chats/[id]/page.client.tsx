"use client";

import { createMessage } from "@/app/(main)/actions";
import LogoSmall from "@/components/icons/logo-small";
import LightRays from "@/components/LightRays";
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
import CodeViewerLayout from "./code-viewer-layout";
import type { Chat, Message } from "./page";
import { Context } from "../../providers";
import ThemeToggle from "@/components/theme-toggle";

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
  const [isShowingCodeViewer, setIsShowingCodeViewer] = useState(
    chat.messages.some((m) => m.role === "assistant"),
  );
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

  const searchParams = useSearchParams();
  const isFullScreenPreview =
    searchParams.get("fs") === "1" || searchParams.get("preview") === "1";
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
        setIsShowingCodeViewer(true);
        setActiveTab("preview");
      }
    } else if (currentIdx === -1 && assistantVersions.length > 0) {
      // switch to second to last if none active
      const prev = assistantVersions[assistantVersions.length - 2];
      const msg = chat.messages.find((m) => m.id === prev.id);
      if (msg) {
        setActiveMessage(msg);
        setIsShowingCodeViewer(true);
        setActiveTab("preview");
      }
    }
  }, [activeMessage, assistantVersions, chat.messages]);

  const handleSwitchVersion = useCallback(
    (messageId: string) => {
      const msg = chat.messages.find((m) => m.id === messageId);
      if (msg) {
        setActiveMessage(msg);
        setIsShowingCodeViewer(true);
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
        setIsShowingCodeViewer(true);
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
        return `Auto mode tried three normal fixes and the preview still fails. Switch to an alternative implementation method and complete the requested app now.

Fallback rules:
- Rebuild the app from the current files if needed.
- Return a complete working file set, not a partial patch.
- Remove or replace unsupported dependencies, missing modules, broken aliases, Tailwind config plugins, and unavailable imports.
- If a package fails inside Sandpack, inline the behavior or use plain React/Tailwind instead.
- Keep the user's requested app, UI intent, and features intact.
- Use only dependencies already available in the sandbox unless you include them through supported imports.
- Make the preview compile cleanly.

Current failing preview error:

${error.trimStart()}`;
      }

      return `Auto mode detected that the preview is not working. Fix it completely and return the updated files.

Attempt ${attempt} of 3 before fallback.

Important:
- Do not keep retrying the same broken dependency or import.
- For missing dependencies like tailwindcss-animate, unsupported Tailwind plugins, or missing "@/..." modules, remove the dependency and replace the behavior with plain React/Tailwind.
- Return all files needed for the app to run in preview.

Preview error:

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
        .then((res) => {
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
              setIsShowingCodeViewer(true);
              setActiveTab("code");
            }

            if (
              !didPushToPreview &&
              parseReplySegments(content).some(
                (seg) => seg.type === "file" && !seg.isPartial,
              )
            ) {
              didPushToPreview = true;
              setIsShowingCodeViewer(true);
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
                setIsShowingCodeViewer(true);
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
    <div className="h-dvh bg-background text-foreground relative overflow-hidden">
      {/* Light rays background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <LightRays
          raysOrigin="top-center"
          raysColor="#67e8f9"
          raysSpeed={1.1}
          lightSpread={0.8}
          rayLength={1.6}
          fadeDistance={1.4}
          saturation={0.9}
          followMouse={true}
          mouseInfluence={0.18}
          noiseAmount={0.1}
          distortion={0.06}
        />
      </div>

      <div className="relative z-10 flex h-full">
        <div
          className={`flex w-full shrink-0 flex-col overflow-hidden ${isFullScreenPreview ? "hidden" : isShowingCodeViewer ? "lg:w-[30%]" : "lg:w-full"}`}
        >
          <HeaderChat chat={chat} />

          <ChatLog
            chat={chat}
            streamText={streamText}
            activeMessage={activeMessage}
            onMessageClick={(message) => {
              if (message !== activeMessage) {
                setActiveMessage(message);
                setIsShowingCodeViewer(true);
              } else {
                setActiveMessage(undefined);
                setIsShowingCodeViewer(false);
              }
            }}
          />

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

        <CodeViewerLayout
          isShowing={isShowingCodeViewer || isFullScreenPreview}
          onClose={() => {
            setActiveMessage(undefined);
            setIsShowingCodeViewer(false);
          }}
        >
          {isShowingCodeViewer && (
            <CodeViewer
              streamText={streamText}
              chat={chat}
              message={activeMessage}
              onMessageChange={setActiveMessage}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onClose={() => {
                setActiveMessage(undefined);
                setIsShowingCodeViewer(false);
              }}
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
              autoFixEnabled={autoFixEnabled}
              onAutoFixEnabledChange={handleAutoFixEnabledChange}
              autoFixAttempt={autoFixAttempt}
              autoFixStatus={autoFixStatus}
              onRestore={async (
                message: Message | undefined,
                oldVersion: number,
                newVersion: number,
              ) => {
                startTransition(async () => {
                  if (!message) return;

                  // Helper to get files from a message (JSON field or extract from content)
                  const getFilesFromMessage = (msg: Message) => {
                    return (
                      (msg.files as any[]) || extractAllCodeBlocks(msg.content)
                    );
                  };

                  const restoredFiles = getFilesFromMessage(message);
                  if (restoredFiles.length === 0) return;

                  const explanation = `Version ${newVersion} was created by restoring version ${oldVersion}.`;
                  const newContent =
                    explanation +
                    "\n\n" +
                    restoredFiles
                      .map(
                        (file) =>
                          `\`\`\`${file.language}{path=${file.path}}\n${file.code}\n\`\`\``,
                      )
                      .join("\n\n");

                  const newMessage = await createMessage(
                    chat.id,
                    newContent,
                    "assistant",
                    restoredFiles,
                  );
                  setActiveMessage(newMessage);
                  router.refresh();
                });
              }}
            />
          )}
        </CodeViewerLayout>
      </div>
    </div>
  );
}
