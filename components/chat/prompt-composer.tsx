"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChatStatus } from "ai";
import { Boxes, Zap } from "lucide-react";

import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputMessage,
  PromptInputProvider,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ACCEPTED_FILE_TYPES =
  "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown,application/json,text/csv,application/zip";
const MAX_FILE_SIZE = 8 * 1024 * 1024;

export type ComposerAttachment = {
  id: string;
  kind: "image" | "file";
  filename: string;
  url?: string;
  size?: number;
};

export type ComposerMode = "ask" | "plan" | "agent";

const modeLabels: Record<ComposerMode, string> = {
  agent: "Agent",
  ask: "Ask",
  plan: "Plan",
};

async function uploadDataUrl(filename: string, mediaType: string, url: string) {
  const blob = await fetch(url).then((res) => res.blob());
  const formData = new FormData();
  formData.append("file", new File([blob], filename, { type: mediaType || blob.type }));
  const response = await fetch("/api/blob-upload", { method: "POST", body: formData });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.url) throw new Error(data?.error || "Upload failed");
  return data.url as string;
}

/** Syncs the external `value` prop into the PromptInput controller's text state. */
function ControlledValueSync({ value }: { value: string }) {
  const controller = usePromptInputController();
  useEffect(() => {
    if (controller.textInput.value !== value) controller.textInput.setInput(value);
  }, [controller, value]);
  return null;
}

function AttachmentPreviewRow() {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <PromptInputHeader className="gap-1.5 px-2.5 pt-2.5 pb-0">
      <Attachments variant="inline">
        {attachments.files.map((file) => (
          <Attachment key={file.id} data={file} onRemove={() => attachments.remove(file.id)}>
            <AttachmentPreview />
            <AttachmentInfo />
            <AttachmentRemove />
          </Attachment>
        ))}
      </Attachments>
    </PromptInputHeader>
  );
}

export function PromptComposer({
  value,
  onChange,
  onSend,
  status,
  onStop,
  placeholder = "Describe the change or ask anything…",
  disabled,
  autoFocus,
  className,
  mode,
  onModeChange,
  onOpenAbilities,
  model,
  modelOptions,
  onModelChange,
  onDictate,
  leftActions,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: (content: string, attachments: ComposerAttachment[]) => void;
  status: ChatStatus;
  onStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  mode?: ComposerMode;
  onModeChange?: () => void;
  onOpenAbilities?: () => void;
  model?: string;
  modelOptions?: { label: string; value: string }[];
  onModelChange?: (value: string) => void;
  onDictate?: (text: string) => void;
  leftActions?: React.ReactNode;
}) {
  const [blobUploadConfigured, setBlobUploadConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/blob-upload/config", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { configured: false }))
      .then((data) => {
        if (!cancelled) setBlobUploadConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (!cancelled) setBlobUploadConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const text = message.text.trim();
      if (!text && message.files.length === 0) return;

      let attachments: ComposerAttachment[] = [];
      if (message.files.length > 0) {
        try {
          attachments = await Promise.all(
            message.files.map(async (file) => ({
              id: crypto.randomUUID(),
              kind: (file.mediaType?.startsWith("image/") ? "image" : "file") as "image" | "file",
              filename: file.filename || "attachment",
              url: file.url ? await uploadDataUrl(file.filename || "attachment", file.mediaType || "", file.url) : undefined,
            })),
          );
        } catch (error) {
          toast({
            title: "Attachment upload failed",
            description: error instanceof Error ? error.message : "Could not upload the attached file.",
            variant: "destructive",
          });
          return;
        }
      }

      onSend(text, attachments);
    },
    [onSend],
  );

  const isBusy = status === "streaming" || status === "submitted";

  return (
    <PromptInputProvider initialInput={value}>
      <ControlledValueSync value={value} />
      <PromptInput
        accept={ACCEPTED_FILE_TYPES}
        multiple
        maxFileSize={MAX_FILE_SIZE}
        onError={(error) =>
          toast({ title: "Attachment error", description: error.message, variant: "destructive" })
        }
        onSubmit={handleSubmit}
        className={cn(
          "rounded-2xl border-border/60 bg-background/95 shadow-sm backdrop-blur transition-colors focus-within:border-foreground/25",
          className,
        )}
      >
        <PromptInputBody>
          <AttachmentPreviewRow />
          <PromptInputTextarea
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            onChange={(event) => onChange(event.currentTarget.value)}
            className="min-h-12 px-3.5 py-3 text-[15px] leading-snug"
          />
        </PromptInputBody>

        <PromptInputFooter className="px-2 pb-2 pt-1">
          <PromptInputTools className="min-w-0">
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger
                tooltip="Attach files"
                disabled={disabled || blobUploadConfigured === false}
              />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments label="Add photos or files" />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>

            {onModeChange ? (
              <PromptInputButton tooltip="Cycle mode" onClick={onModeChange} disabled={disabled}>
                <Zap className="size-4" />
                {mode ? modeLabels[mode] : "Agent"}
              </PromptInputButton>
            ) : null}

            {onOpenAbilities ? (
              <PromptInputButton tooltip="Abilities" onClick={onOpenAbilities} disabled={disabled}>
                <Boxes className="size-4" />
                Abilities
              </PromptInputButton>
            ) : null}

            {leftActions}
          </PromptInputTools>

          <PromptInputTools>
            {onDictate ? (
              <SpeechInput
                onTranscriptionChange={onDictate}
                disabled={disabled}
                className="size-8 rounded-md border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Dictate chat prompt"
              />
            ) : null}

            {modelOptions && modelOptions.length > 0 ? (
              <PromptInputSelect value={model} onValueChange={onModelChange}>
                <PromptInputSelectTrigger className="h-8 max-w-[160px] text-xs">
                  <PromptInputSelectValue placeholder="Model" />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {modelOptions.map((option) => (
                    <PromptInputSelectItem key={option.value} value={option.value}>
                      {option.label}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            ) : null}

            <PromptInputSubmit
              status={status}
              onStop={onStop}
              disabled={isBusy ? !onStop : disabled || !value.trim()}
            />
          </PromptInputTools>
        </PromptInputFooter>
      </PromptInput>
    </PromptInputProvider>
  );
}
