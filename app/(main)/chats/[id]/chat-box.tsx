"use client";

import ArrowRightIcon from "@/components/icons/arrow-right";
import Spinner from "@/components/spinner";
import { MODELS } from "@/lib/constants";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createMessage } from "../../actions";
import { type Chat } from "./page";

type SupportedFile = {
  name: string;
  type: string;
  content: string;
  previewUrl?: string;
};

type ChatMode = "ask" | "plan" | "agent";

export default function ChatBox({
  chat,
  onNewStreamPromise,
  isStreaming,
}: {
  chat: Chat;
  onNewStreamPromise: (v: Promise<ReadableStream>) => void;
  isStreaming: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const disabled = isPending || isStreaming;
  const didFocusOnce = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<ChatMode>("agent");
  const [attachedFiles, setAttachedFiles] = useState<SupportedFile[]>([]);

  const textareaResizePrompt = useMemo(
    () =>
      prompt
        .split("\n")
        .map((text) => (text === "" ? "a" : text))
        .join("\n"),
    [prompt],
  );

  const modelLabel =
    MODELS.find((m) => m.value === chat.model)?.label || chat.model;

  useEffect(() => {
    if (!textareaRef.current) return;

    if (!disabled && !didFocusOnce.current) {
      textareaRef.current.focus();
      didFocusOnce.current = true;
    } else {
      didFocusOnce.current = false;
    }
  }, [disabled]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: SupportedFile[] = [];

    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      const isCode =
        file.name.endsWith(".html") ||
        file.name.endsWith(".tsx") ||
        file.name.endsWith(".jsx") ||
        file.name.endsWith(".js");

      if (!isImage && !isCode) {
        window.alert(
          "Only images, .html, .tsx, .jsx, and .js files are supported.",
        );
        continue;
      }

      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onload = () => {
          const content = reader.result as string;
          newFiles.push({
            name: file.name,
            type: file.type,
            content: isImage ? content.split(",")[1] : content,
            previewUrl: isImage ? content : undefined,
          });
          resolve();
        };

        if (isImage) {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
      });
    }

    setAttachedFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() && attachedFiles.length === 0) return;

    startTransition(async () => {
      const filesForDb = attachedFiles.map((file) => ({
        name: file.name,
        type: file.type,
        content: file.content,
        isImage: file.type.startsWith("image/"),
      }));

      const message = await createMessage(
        chat.id,
        prompt || "[Uploaded files for app analysis]",
        "user",
        filesForDb,
      );

      const streamPromise = fetch("/api/get-next-completion-stream-promise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-mode": mode,
        },
        body: JSON.stringify({
          messageId: message.id,
          model: chat.model,
          mode,
          hasFiles: attachedFiles.length > 0,
        }),
      }).then((res) => {
        if (!res.body) {
          throw new Error("No body on response");
        }
        return res.body;
      });

      onNewStreamPromise(streamPromise);
      startTransition(() => {
        router.refresh();
        setPrompt("");
        setAttachedFiles([]);
      });
    });
  };

  return (
    <div className="mx-auto mb-5 flex w-full max-w-prose shrink-0 px-4">
      <form className="relative flex w-full" onSubmit={handleSubmit}>
        <fieldset className="w-full" disabled={disabled}>
          <div
            className="relative flex flex-col rounded-2xl border border-border bg-card shadow-sm"
            role="form"
            aria-label="Chat input form"
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as ChatMode)}
                  className="appearance-none rounded-lg border border-border bg-background px-3 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={disabled}
                  aria-label="Generation mode"
                >
                  <option value="ask">Ask</option>
                  <option value="plan">Plan</option>
                  <option value="agent">Agent (Full Stack)</option>
                </select>
                <div
                  id="mode-description"
                  className="text-[10px] text-muted-foreground"
                  aria-live="polite"
                >
                  {mode === "agent" && "Full backend + SaaS admin"}
                  {mode === "plan" && "Architecture first"}
                  {mode === "ask" && "Quick answers"}
                </div>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-foreground transition hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Attach image or code file"
                title="Attach image or code file"
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.html,.tsx,.jsx,.js"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {attachedFiles.length > 0 && (
              <div
                className="flex flex-wrap gap-2 border-b border-border px-3 py-2"
                role="list"
                aria-label="Attached files"
              >
                {attachedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted px-2 py-1 text-xs"
                  >
                    {file.previewUrl ? (
                      <img
                        src={file.previewUrl}
                        alt={file.name}
                        className="size-6 rounded object-cover"
                      />
                    ) : (
                      <div className="flex size-6 items-center justify-center rounded bg-primary/10 font-mono text-[10px] text-primary">
                        {file.name.split(".").pop()?.toUpperCase()}
                      </div>
                    )}
                    <span
                      className="max-w-[120px] truncate font-medium text-foreground"
                      title={file.name}
                    >
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachedFiles((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                      className="ml-1 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove attached file ${file.name}`}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative w-full">
              <div className="w-full p-3 pb-12">
                <p className="invisible min-h-[48px] w-full whitespace-pre-wrap text-sm">
                  {textareaResizePrompt}
                </p>
              </div>
              <textarea
                ref={textareaRef}
                placeholder={
                  mode === "agent"
                    ? "Describe the app, paste URL, or attach a screenshot / .html / .tsx..."
                    : mode === "plan"
                      ? "What should we build?"
                      : "Ask anything or describe changes..."
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required={attachedFiles.length === 0}
                name="prompt"
                className="peer absolute inset-0 w-full resize-none bg-transparent p-3 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
                aria-describedby="mode-description"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
              />
            </div>

            <div className="flex w-full items-center justify-between rounded-b-2xl border-t border-border px-3 py-2">
              <div
                className="flex items-center gap-2 pl-1 text-[10px] text-muted-foreground"
                aria-live="polite"
              >
                <span>{modelLabel}</span>
                <span className="text-muted-foreground/70" aria-hidden="true">
                  -
                </span>
                <span className="font-mono">{mode.toUpperCase()} MODE</span>
              </div>

              <button
                type="submit"
                disabled={
                  disabled || (!prompt.trim() && attachedFiles.length === 0)
                }
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={
                  mode === "agent" ? "Build full stack app" : "Send message"
                }
              >
                <Spinner loading={disabled}>
                  {mode === "agent" ? "Build Full Stack" : "Send"}
                </Spinner>
                <ArrowRightIcon className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
