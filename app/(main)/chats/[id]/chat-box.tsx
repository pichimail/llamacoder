"use client";

import ArrowRightIcon from "@/components/icons/arrow-right";
import Spinner from "@/components/spinner";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createMessage } from "../../actions";
import { type Chat } from "./page";
import { MODELS } from "@/lib/constants";

// Supported file types for App-From-Screenshot / fullstack generation
type SupportedFile = {
  name: string;
  type: string;
  content: string; // base64 for images, text for code files
  previewUrl?: string; // for images
};

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
  const [mode, setMode] = useState<'ask' | 'plan' | 'agent'>('agent'); // Default to powerful Agent mode
  const [attachedFiles, setAttachedFiles] = useState<SupportedFile[]>([]);

  const textareaResizePrompt = prompt
    .split("\n")
    .map((text) => (text === "" ? "a" : text))
    .join("\n");

  const modelLabel =
    MODELS.find((m) => m.value === chat.model)?.label || chat.model;

  // Handle file selection (images, .html, .tsx, .jsx)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: SupportedFile[] = [];

    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image/');
      const isCode = file.name.endsWith('.html') || file.name.endsWith('.tsx') || file.name.endsWith('.jsx') || file.name.endsWith('.js');

      if (!isImage && !isCode) {
        alert('Only images, .html, .tsx, .jsx files are supported for App-From-Screenshot / fullstack generation');
        continue;
      }

      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onload = () => {
          const content = reader.result as string;
          newFiles.push({
            name: file.name,
            type: file.type,
            content: isImage ? content.split(',')[1] : content, // base64 without prefix for images
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
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Trigger hidden file input
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (!textareaRef.current) return;

    if (!disabled && !didFocusOnce.current) {
      textareaRef.current.focus();
      didFocusOnce.current = true;
    } else {
      didFocusOnce.current = false;
    }
  }, [disabled]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() && attachedFiles.length === 0) return;

    startTransition(async () => {
      // Prepare files for DB (store base64/text)
      const filesForDb = attachedFiles.map(f => ({
        name: f.name,
        type: f.type,
        content: f.content,
        isImage: f.type.startsWith('image/'),
      }));

      const message = await createMessage(chat.id, prompt || "[Uploaded files for App-From-Screenshot analysis]", "user", filesForDb);

      // Pass mode + files info to the streaming endpoint via custom header or body
      const streamPromise = fetch(
        "/api/get-next-completion-stream-promise",
        {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
            'x-app-mode': mode, // Pass the selected mode
          },
          body: JSON.stringify({
            messageId: message.id,
            model: chat.model,
            mode, // also in body for safety
            hasFiles: attachedFiles.length > 0,
          }),
        },
      ).then((res) => {
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
      <form
        className="relative flex w-full"
        onSubmit={handleSubmit}
      >
        <fieldset className="w-full" disabled={disabled}>
          <div className="relative flex flex-col rounded-2xl border border-gray-300 bg-white shadow-sm dark:border-gray-800 dark:bg-zinc-950">
            
            {/* Mode Selector + Upload Bar - Lovable.dev style */}
            <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-800">
              <div className="flex items-center gap-2">
                {/* Mode Dropdown */}
                <div className="relative">
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as 'ask' | 'plan' | 'agent')}
                    className="appearance-none rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-zinc-900 dark:text-gray-300"
                    disabled={disabled}
                  >
                    <option value="ask">Ask</option>
                    <option value="plan">Plan</option>
                    <option value="agent">Agent (Full Stack)</option>
                  </select>
                  <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 dark:text-gray-500">
                    ▼
                  </div>
                </div>

                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                  {mode === 'agent' && 'Full backend + SaaS admin'}
                  {mode === 'plan' && 'Architecture first'}
                  {mode === 'ask' && 'Quick answers'}
                </div>
              </div>

              {/* Upload Button for screenshots, HTML, TSX */}
              <button
                type="button"
                onClick={triggerFileUpload}
                disabled={disabled}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-zinc-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upload (img / .html / .tsx)
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

            {/* Attached Files Preview */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-800">
                {attachedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs dark:border-gray-700 dark:bg-zinc-900"
                  >
                    {file.previewUrl ? (
                      <img src={file.previewUrl} alt={file.name} className="h-6 w-6 rounded object-cover" />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-100 text-[10px] font-mono text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                        {file.name.split('.').pop()?.toUpperCase()}
                      </div>
                    )}
                    <span className="max-w-[120px] truncate font-medium text-gray-700 dark:text-gray-300" title={file.name}>
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="ml-1 text-gray-400 hover:text-red-500 dark:text-gray-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Textarea */}
            <div className="relative w-full">
              <div className="w-full p-3 pb-12">
                <p className="invisible min-h-[48px] w-full whitespace-pre-wrap text-sm">
                  {textareaResizePrompt}
                </p>
              </div>
              <textarea
                ref={textareaRef}
                placeholder={
                  mode === 'agent' 
                    ? "Describe the app, paste URL, or upload screenshot / .html / .tsx for 92% exact full-stack recreation..." 
                    : mode === 'plan' 
                    ? "What should we build? (Plan mode will create architecture first)" 
                    : "Ask anything or describe changes..."
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required={attachedFiles.length === 0}
                name="prompt"
                className="peer absolute inset-0 w-full resize-none bg-transparent p-3 text-sm placeholder-gray-500 focus:outline-none disabled:opacity-50 dark:placeholder-gray-400"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
              />
            </div>

            {/* Bottom Bar */}
            <div className="flex w-full items-center justify-between rounded-b-2xl border-t border-gray-200 px-3 py-2 dark:border-gray-800">
              <div className="flex items-center gap-2 pl-1 text-[10px] text-gray-500 dark:text-gray-400">
                <span>{modelLabel}</span>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span className="font-mono">{mode.toUpperCase()} MODE</span>
              </div>

              <button
                type="submit"
                disabled={disabled || (!prompt.trim() && attachedFiles.length === 0)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1.5 text-sm font-semibold text-white shadow-lg transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Spinner loading={disabled}>
                  {mode === 'agent' ? 'Build Full Stack' : 'Send'}
                </Spinner>
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
