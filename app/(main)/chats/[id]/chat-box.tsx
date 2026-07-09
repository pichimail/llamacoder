"use client";

import { ProductionInputBar as InputBar, type AttachedFile, type AttachedImage } from "@/components/agent-elements/production-input-bar";
import { AiModalAbilitySelector } from "@/components/ui/ai-modal-ability-selector";
import { AiModalSelector } from "@/components/ui/ai-modal-selector";
import { AiResponseWriter } from "@/components/ui/ai-response-writer";
import { AiSuggestions } from "@/components/ui/ai-suggestions";
import {
  Checkpoint,
  CheckpointIcon,
  CheckpointTrigger,
} from "@/components/ai-elements/checkpoint";
import {
  Context,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextTrigger,
} from "@/components/ai-elements/context";
import {
  EnvironmentVariable,
  EnvironmentVariableName,
  EnvironmentVariableRequired,
  EnvironmentVariables,
  EnvironmentVariablesContent,
  EnvironmentVariablesHeader,
  EnvironmentVariablesTitle,
  EnvironmentVariablesToggle,
} from "@/components/ai-elements/environment-variables";
import {
  Queue,
  QueueItem,
  QueueItemContent,
  QueueItemDescription,
  QueueItemIndicator,
  QueueList,
  QueueSection,
  QueueSectionContent,
  QueueSectionLabel,
  QueueSectionTrigger,
} from "@/components/ai-elements/queue";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Terminal,
  TerminalActions,
  TerminalClearButton,
  TerminalContent,
  TerminalCopyButton,
  TerminalHeader,
  TerminalStatus,
  TerminalTitle,
} from "@/components/ai-elements/terminal";
import { Button } from "@/components/ui/button";
import { Tip, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { MODELS } from "@/lib/constants";
import { askModePrompt, planModePrompt } from "@/lib/prompts";
import { cn } from "@/lib/utils";
import { useAvailableModels } from "@/lib/use-available-models";
import {
  Bookmark,
  Boxes,
  Brain,
  CheckCircle2,
  Expand,
  Gauge,
  KeyRound,
  ListChecks,
  Paperclip,
  RotateCcw,
  ShieldCheck,
  TerminalSquare,
  Workflow,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent, type ClipboardEvent } from "react";
import { createMessage } from "../../actions";
import { type Chat } from "./page";

type ComposerMode = "ask" | "plan" | "agent";
type ComposerAttachment = {
  id: string;
  kind: "image" | "file";
  filename: string;
  url?: string;
  size?: number;
};

type QueueStatus = "pending" | "active" | "completed";

const modeLabels: Record<ComposerMode, string> = {
  agent: "Agent",
  ask: "Ask",
  plan: "Plan",
};

function StreamingText({ text, active }: { text: string; active?: boolean }) {
  if (!active) return <span>{text}</span>;
  return (
    <span>
      <Shimmer duration={1.15}>{text}</Shimmer>
      <span className="ml-1 inline-block size-1.5 animate-pulse rounded-full bg-lime-300" />
    </span>
  );
}

function AgentPanel({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-lime-300/10 bg-[#0b0d09]/92 p-3 text-stone-200 shadow-[0_0_32px_rgba(0,0,0,0.25)]",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-lime-100/75">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function BuildQueue({
  items,
}: {
  items: { id: string; title: string; description: string; status: QueueStatus }[];
}) {
  return (
    <Queue className="border-lime-300/10 bg-transparent shadow-none">
      <QueueSection>
        <QueueSectionTrigger className="bg-white/[0.035] text-stone-300 hover:bg-white/[0.055]">
          <QueueSectionLabel count={items.length} label="queued steps" icon={<Workflow className="size-4 text-lime-200" />} />
        </QueueSectionTrigger>
        <QueueSectionContent>
          <QueueList className="mt-2">
            {items.map((item) => (
              <QueueItem key={item.id} className="hover:bg-lime-300/5">
                <div className="flex items-start gap-3">
                  <QueueItemIndicator
                    completed={item.status === "completed"}
                    className={cn(item.status === "active" && "border-amber-200 bg-amber-200/30")}
                  />
                  <div className="min-w-0">
                    <QueueItemContent completed={item.status === "completed"} className="text-stone-300">
                      {item.title}
                    </QueueItemContent>
                    <QueueItemDescription completed={item.status === "completed"} className="ml-0 text-stone-500">
                      {item.description}
                    </QueueItemDescription>
                  </div>
                </div>
              </QueueItem>
            ))}
          </QueueList>
        </QueueSectionContent>
      </QueueSection>
    </Queue>
  );
}

export default function ChatBox({
  chat,
  onNewStreamPromise,
  onAbortController,
  isStreaming,
  onStop,
  onUndo,
  versions = [],
  currentVersionId,
  onSwitchVersion,
  shouldFocusInput,
  onInputFocused,
  variant = "full",
  onExpand,
}: {
  chat: Chat;
  onNewStreamPromise: (
    v: Promise<ReadableStream>,
    options?: { reasoning: boolean; messageId?: string; model?: string },
  ) => void;
  onAbortController?: (c: AbortController | null) => void;
  isStreaming: boolean;
  onStop?: () => void;
  onUndo?: () => void;
  versions?: { id: string; version: number; label: string }[];
  currentVersionId?: string;
  onSwitchVersion?: (id: string) => void;
  shouldFocusInput?: boolean;
  onInputFocused?: () => void;
  variant?: "full" | "minimal";
  onExpand?: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(chat.model);
  const [mode, setMode] = useState<ComposerMode>("agent");
  const [quality] = useState<"low" | "high">(chat.quality === "high" ? "high" : "low");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [blobUploadConfigured, setBlobUploadConfigured] = useState<boolean | null>(null);
  const [abilityModalOpen, setAbilityModalOpen] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState("agent ready\nqueue idle\npreview watcher attached");
  const [activeAbilities, setActiveAbilities] = useState<string[]>(["web"]);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const availableModels = useAvailableModels();

  const disabled = isPending || isStreaming;
  const modelOptions = useMemo(
    () => (availableModels ?? MODELS.filter((item) => !item.hidden)).map((item) => ({
      label: item.label || item.value,
      value: item.value,
    })),
    [availableModels],
  );

  const attachedImages: AttachedImage[] = attachments
    .filter((item) => item.kind === "image" && item.url)
    .map((item) => ({ id: item.id, filename: item.filename, url: item.url!, size: item.size }));
  const attachedFiles: AttachedFile[] = attachments
    .filter((item) => item.kind === "file")
    .map((item) => ({ id: item.id, filename: item.filename, size: item.size }));

  const promptLooksBackend = /database|postgres|prisma|auth|api|backend|admin|dashboard|stripe|payment|login/i.test(prompt);
  const promptLooksThreeD = /3d|three|webgl|canvas|shader|orbit|scene|gsap|parallax/i.test(prompt);
  const promptLooksIntegration = /openai|anthropic|gemini|grok|openrouter|together|nvidia|api key|secret|env/i.test(prompt);
  const activeCheckpoint = versions.find((version) => version.id === currentVersionId) ?? versions[versions.length - 1];

  const queueItems = useMemo(
    () => [
      {
        id: "requirements",
        title: "Understand request",
        description: prompt ? "Prompt captured and ready for agent planning." : "Waiting for a product request.",
        status: prompt ? "completed" : "active",
      },
      {
        id: "plan",
        title: "Create build plan",
        description: mode === "ask" ? "Answer mode keeps edits small." : "Agent mode prepares files, preview, and checkpoints.",
        status: isStreaming ? "completed" : prompt ? "active" : "pending",
      },
      {
        id: "files",
        title: "Write changed files only",
        description: attachments.length ? `${attachments.length} attachment${attachments.length === 1 ? "" : "s"} staged.` : "No attachment context staged.",
        status: isStreaming ? "active" : "pending",
      },
      {
        id: "preview",
        title: "Build preview",
        description: "Compile, render, and surface recoverable errors.",
        status: isStreaming ? "active" : "pending",
      },
    ] satisfies { id: string; title: string; description: string; status: QueueStatus }[],
    [attachments.length, isStreaming, mode, prompt],
  );

  const terminalText = useMemo(() => {
    const lines = [
      terminalOutput,
      `mode=${mode}`,
      `model=${model}`,
      `quality=${quality}`,
      activeAbilities.length ? `abilities=${activeAbilities.join(",")}` : "abilities=web",
      promptLooksBackend ? "detected backend/data requirements" : "backend detection idle",
      promptLooksThreeD ? "detected 3D/motion requirements" : "motion detection idle",
      isStreaming ? "stream: receiving file patches..." : "stream: idle",
    ];
    return lines.join("\n");
  }, [activeAbilities, isStreaming, mode, model, promptLooksBackend, promptLooksThreeD, quality, terminalOutput]);

  const reasoningSummary = useMemo(() => {
    if (!prompt.trim()) {
      return "Waiting for the next request. The agent will summarize requirements, choose the build path, then ask before secrets, integrations, destructive changes, publishing, or exports.";
    }
    return [
      `Mode: ${modeLabels[mode]}.`,
      promptLooksBackend ? "Backend/data work is likely needed." : "Frontend-first build path is likely enough.",
      promptLooksThreeD ? "3D, GSAP, or advanced motion should be considered." : "Motion stays restrained unless requested.",
      promptLooksIntegration ? "Integration or environment-variable confirmation may be required." : "No external provider confirmation detected yet.",
      "Raw chain-of-thought stays private; this panel shows the user-facing reasoning summary.",
    ].join(" ");
  }, [mode, prompt, promptLooksBackend, promptLooksIntegration, promptLooksThreeD]);

  const envVars = [
    {
      name: "DATABASE_URL",
      purpose: "Postgres/Prisma persistence for backend or admin dashboards.",
      required: promptLooksBackend,
      configured: promptLooksBackend ? false : true,
      value: promptLooksBackend ? "missing" : "not required",
    },
    {
      name: "OPENROUTER_API_KEY",
      purpose: "ChinnaLLM/OpenRouter fallback for generated AI features.",
      required: promptLooksIntegration,
      configured: false,
      value: promptLooksIntegration ? "missing" : "optional",
    },
    {
      name: "BLOB_READ_WRITE_TOKEN",
      purpose: "Screenshot, image, and file attachments.",
      required: attachments.length > 0,
      configured: blobUploadConfigured === true,
      value: blobUploadConfigured ? "configured" : "missing",
    },
  ];

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

  useEffect(() => {
    if (!shouldFocusInput) return;
    const textarea = composerRef.current?.querySelector("textarea");
    textarea?.focus();
    onInputFocused?.();
  }, [onInputFocused, shouldFocusInput]);

  async function persistBuilderSettings(updates: { model?: string }) {
    await fetch(`/api/chats/${chat.id}/builder-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).catch(() => undefined);
  }

  function handleModelChange(next: string) {
    const nextModel = modelOptions.find((item) => item.label === next || item.value === next)?.value ?? next;
    setModel(nextModel);
    void persistBuilderSettings({ model: nextModel });
  }

  function buildModePrefix() {
    if (mode === "ask") return askModePrompt.trim();
    if (mode === "plan") return planModePrompt.trim();
    return "Act as an agentic app builder. Plan briefly, update only necessary files, keep preview buildable, and ask for confirmation before integrations, secrets, destructive actions, publishing, or exports.";
  }

  function isGitHubUrl(value: string) {
    return /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/.test(value.trim());
  }

  async function handleGitImport(url: string) {
    const response = await fetch(`/api/workspace/${chat.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import-git", url }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) throw new Error(data?.error || "Import failed");
    toast({
      title: "Repository imported",
      description: `${data.imported?.fileCount || 0} files are ready for bootstrap and preview.`,
    });
    window.location.reload();
  }

  async function handleAttachmentUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (blobUploadConfigured === false) {
      toast({
        title: "Attachments unavailable",
        description: "Blob upload is not configured in this environment.",
        variant: "destructive",
      });
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/blob-upload", { method: "POST", body: formData });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.url) throw new Error(data?.error || "Blob upload failed");
      setAttachments((items) => [
        ...items,
        {
          id: crypto.randomUUID(),
          kind: file.type.startsWith("image/") ? "image" : "file",
          filename: file.name || "attachment",
          size: file.size,
          url: data.url,
        },
      ]);
      if (!prompt.trim()) setPrompt("Use the attached file as context and update the app.");
      setTerminalOutput((current) => `${current}\nattached ${file.name || "file"}`);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not upload the file.",
        variant: "destructive",
      });
    } finally {
      event.currentTarget.value = "";
    }
  }

  async function handlePaste(event: ClipboardEvent) {
    const imageItem = Array.from(event.clipboardData?.items ?? []).find((item) => item.type.startsWith("image/"));
    const file = imageItem?.getAsFile();
    if (!file || blobUploadConfigured === false) return;
    event.preventDefault();
    const transfer = new DataTransfer();
    transfer.items.add(file);
    await handleAttachmentUpload({
      currentTarget: { value: "" },
      target: { files: transfer.files },
    } as unknown as ChangeEvent<HTMLInputElement>);
  }

  function removeAttachment(id: string) {
    setAttachments((items) => items.filter((item) => item.id !== id));
  }

  function handleSend({ content }: { role: "user"; content: string }) {
    if (disabled) return;
    const trimmed = content.trim();
    if (!trimmed && attachments.length === 0) return;

    startTransition(async () => {
      try {
        if (isGitHubUrl(trimmed) && variant === "full") {
          await handleGitImport(trimmed);
          setPrompt("");
          return;
        }

        let finalPrompt = trimmed || "Use the attached files as context and update the app.";
        finalPrompt = `${buildModePrefix()}\n\nUser request:\n${finalPrompt}`;

        if (activeAbilities.length > 0) {
          finalPrompt += `\n\nSelected abilities: ${activeAbilities.join(", ")}.`;
        }

        if (attachments.length > 0) {
          finalPrompt += `\n\nAttachments:\n${attachments
            .map((attachment, index) => {
              const parts = [`${index + 1}. [${attachment.kind}] ${attachment.filename}`];
              if (attachment.size) parts.push(`${Math.round(attachment.size / 1024)} KB`);
              if (attachment.url) parts.push(attachment.url);
              return parts.join(" - ");
            })
            .join("\n")}`;
        }

        if (versions.length > 0 && currentVersionId) {
          const label = versions.find((version) => version.id === currentVersionId)?.label || "latest";
          finalPrompt = `Iterate on the existing application checkpoint: ${label}.\n\n${finalPrompt}\n\nReturn only files that need to change. Preserve working structure.`;
        }

        const controller = new AbortController();
        onAbortController?.(controller);
        const message = await createMessage(
          chat.id,
          finalPrompt,
          "user",
          attachments.length > 0 ? (attachments as unknown as Record<string, unknown>[]) : undefined,
        );

        const streamPromise = fetch("/api/get-next-completion-stream-promise", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messageId: message.id,
            model,
            reasoning: mode === "agent",
            quality,
          }),
        })
          .then(async (response) => {
            if (!response.ok) throw new Error((await response.text()) || "Failed to start generation");
            if (!response.body) throw new Error("No body on response");
            return response.body;
          })
          .catch((error) => {
            onAbortController?.(null);
            if (error?.name === "AbortError") return null as unknown as ReadableStream;
            toast({
              title: "Generation failed",
              description: error instanceof Error ? error.message : String(error),
              variant: "destructive",
            });
            throw error;
          });

        setTerminalOutput((current) => `${current}\nmessage ${message.id} queued\nstream requested`);
        onNewStreamPromise(streamPromise, { reasoning: mode === "agent", messageId: message.id, model });
        setPrompt("");
        setAttachments([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (error) {
        onAbortController?.(null);
        toast({
          title: "Could not send request",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    });
  }

  if (variant === "minimal") {
    return (
      <TooltipProvider>
        <div ref={composerRef} className="w-full">
          <InputBar
            value={prompt}
            onChange={setPrompt}
            onSend={handleSend}
            onStop={onStop ?? (() => undefined)}
            status={isStreaming ? "streaming" : isPending ? "submitted" : "ready"}
            placeholder="Describe a change..."
            disabled={disabled}
            leftActions={
              <Tip label="Show full composer">
                <button
                  type="button"
                  onClick={onExpand}
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  aria-label="Show full composer"
                >
                  <Expand className="size-3.5" />
                </button>
              </Tip>
            }
          />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div ref={composerRef} className="relative w-full chat-composer">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md,.json,.csv,.zip"
          aria-label="Attach image or file"
          onChange={handleAttachmentUpload}
        />

        <div className="mb-3 grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="grid gap-3 md:grid-cols-2">
            <AgentPanel title="Queue + To-do" icon={<ListChecks className="size-4" />}>
              <BuildQueue items={queueItems} />
            </AgentPanel>

            <AgentPanel title="Reasoning Summary" icon={<Brain className="size-4" />}>
              <Reasoning isStreaming={isStreaming} defaultOpen>
                <ReasoningTrigger className="text-stone-300">
                  <Brain className="size-4 text-lime-200" />
                  <StreamingText text={isStreaming ? "Reasoning through build steps..." : "Build reasoning summary"} active={isStreaming} />
                </ReasoningTrigger>
                <ReasoningContent className="mt-3 text-stone-400">
                  {reasoningSummary}
                </ReasoningContent>
              </Reasoning>
            </AgentPanel>

            <AgentPanel title="Checkpoints" icon={<Bookmark className="size-4" />}>
              <Checkpoint className="mb-2 text-stone-400">
                <CheckpointIcon className="text-lime-200" />
                <span className="px-2 text-xs">{activeCheckpoint?.label ?? "No checkpoint yet"}</span>
              </Checkpoint>
              <div className="flex flex-wrap gap-2">
                {versions.slice(-4).map((version) => (
                  <CheckpointTrigger
                    key={version.id}
                    variant={version.id === currentVersionId ? "secondary" : "outline"}
                    size="sm"
                    tooltip={`Restore ${version.label}`}
                    onClick={() => onSwitchVersion?.(version.id)}
                    disabled={!onSwitchVersion || disabled}
                    className="h-8 border-lime-300/15 text-xs"
                  >
                    {version.label}
                  </CheckpointTrigger>
                ))}
                {onUndo ? (
                  <Button variant="outline" size="sm" onClick={onUndo} disabled={disabled} className="h-8 border-lime-300/15 text-xs">
                    <RotateCcw className="size-3.5" />
                    Undo
                  </Button>
                ) : null}
              </div>
            </AgentPanel>

            <AgentPanel title="Confirmation" icon={<ShieldCheck className="size-4" />}>
              <div className="space-y-2 text-sm text-stone-400">
                <div className="flex items-start gap-2 rounded-lg border border-lime-300/10 bg-lime-300/5 p-2">
                  <CheckCircle2 className="mt-0.5 size-4 text-lime-200" />
                  <span>Normal file edits and preview builds can proceed automatically.</span>
                </div>
                <div className="flex items-start gap-2 rounded-lg border border-amber-300/15 bg-amber-300/5 p-2">
                  <KeyRound className="mt-0.5 size-4 text-amber-200" />
                  <span>Secrets, integrations, destructive actions, publishing, and exports require user confirmation.</span>
                </div>
              </div>
            </AgentPanel>
          </div>

          <div className="grid gap-3">
            <Terminal
              output={terminalText}
              isStreaming={isStreaming}
              onClear={() => setTerminalOutput("terminal cleared\nagent ready")}
              className="h-full min-h-[260px] border-lime-300/10 bg-[#050604]"
            >
              <TerminalHeader className="border-lime-300/10">
                <TerminalTitle className="text-lime-100">
                  <TerminalSquare className="size-4" />
                  Agent terminal
                </TerminalTitle>
                <div className="flex items-center gap-1">
                  <TerminalStatus>streaming</TerminalStatus>
                  <TerminalActions>
                    <TerminalCopyButton />
                    <TerminalClearButton />
                  </TerminalActions>
                </div>
              </TerminalHeader>
              <TerminalContent className="max-h-[300px]" />
            </Terminal>

            <EnvironmentVariables className="border-lime-300/10 bg-[#0b0d09]/92 text-stone-200">
              <EnvironmentVariablesHeader className="border-lime-300/10">
                <EnvironmentVariablesTitle>Environment variables</EnvironmentVariablesTitle>
                <EnvironmentVariablesToggle />
              </EnvironmentVariablesHeader>
              <EnvironmentVariablesContent className="divide-lime-300/10">
                {envVars.map((item) => (
                  <EnvironmentVariable key={item.name} name={item.name} value={item.value}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <EnvironmentVariableName className="text-stone-200" />
                        {item.required ? (
                          <EnvironmentVariableRequired className={cn(item.configured ? "bg-lime-300/15 text-lime-100" : "bg-amber-300/15 text-amber-100")}>
                            {item.configured ? "Configured" : "Required"}
                          </EnvironmentVariableRequired>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-stone-500">{item.purpose}</p>
                    </div>
                    {item.required && !item.configured ? (
                      <Button size="sm" variant="outline" className="h-8 border-lime-300/15 text-xs" asChild>
                        <a href={`/settings?chat=${chat.id}#environment`}>Add</a>
                      </Button>
                    ) : null}
                  </EnvironmentVariable>
                ))}
              </EnvironmentVariablesContent>
            </EnvironmentVariables>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <AiSuggestions onSelect={(value) => setPrompt(value)} />
        </div>

        {isStreaming ? (
          <div className="mb-3">
            <AiResponseWriter isActive={isStreaming} />
          </div>
        ) : null}

        <div className="group/composer relative">
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -inset-[2px] rounded-[18px] bg-[linear-gradient(135deg,rgba(190,242,100,0.44),rgba(251,191,36,0.14),rgba(255,255,255,0.06))] opacity-0 blur-[7px] transition-opacity duration-500 group-focus-within/composer:opacity-75",
              isStreaming && "animate-pulse opacity-70",
            )}
          />
          <div className="relative rounded-[20px] border border-lime-300/10 bg-[#080a07]/95 p-1 shadow-2xl shadow-black/30">
            <InputBar
              value={prompt}
              onChange={setPrompt}
              onSend={handleSend}
              onStop={onStop ?? (() => undefined)}
              status={isStreaming ? "streaming" : isPending ? "submitted" : "ready"}
              placeholder="Describe the next app build, fix, integration, or preview change..."
              disabled={disabled}
              autoFocus
              onAttach={() => fileInputRef.current?.click()}
              onPaste={handlePaste}
              attachedImages={attachedImages}
              attachedFiles={attachedFiles}
              onRemoveImage={removeAttachment}
              onRemoveFile={removeAttachment}
              infoBar={{
                title: `${modeLabels[mode]} workflow`,
                description: isStreaming ? "Queue and terminal are live." : "Enter sends the exact request to the builder.",
                position: "top",
              }}
              leftActions={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Paperclip className="size-3.5" />
                    Attach
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbilityModalOpen(true)}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Boxes className="size-3.5" />
                    Abilities
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode((current) => (current === "agent" ? "plan" : current === "plan" ? "ask" : "agent"))}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Zap className="size-3.5" />
                    {modeLabels[mode]}
                  </button>
                </div>
              }
              rightActions={
                <div className="flex items-center gap-1">
                  <SpeechInput
                    onTranscriptionChange={(text) => setPrompt((current) => `${current}${current.trim() ? " " : ""}${text}`)}
                    disabled={disabled}
                    className="size-7 rounded-md border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="Dictate chat prompt"
                  />
                  <AiModalSelector
                    options={modelOptions.map((item) => item.label)}
                    onSelect={handleModelChange}
                    trigger={modelOptions.find((item) => item.value === model)?.label ?? "Model"}
                  />
                  <Context
                    usedTokens={Math.floor(prompt.length / 4) + 240}
                    maxTokens={model.includes("claude") ? 200000 : 128000}
                    modelId={model}
                  >
                    <ContextTrigger asChild>
                      <button
                        type="button"
                        className="hidden size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:flex"
                        aria-label="Model context"
                      >
                        <Gauge className="size-3.5" />
                      </button>
                    </ContextTrigger>
                    <ContextContent>
                      <ContextContentHeader>
                        <span className="text-sm font-medium">Context · {model.split("/").pop()}</span>
                      </ContextContentHeader>
                      <ContextContentBody>
                        <div className="text-xs text-muted-foreground">
                          ~{Math.floor(prompt.length / 4)} prompt tokens. Attachments and previous files are included by the builder context.
                        </div>
                      </ContextContentBody>
                      <ContextContentFooter>
                        <span className="text-[10px] text-muted-foreground">Visible estimate only.</span>
                      </ContextContentFooter>
                    </ContextContent>
                  </Context>
                </div>
              }
            />
          </div>
        </div>

        <AiModalAbilitySelector
          open={abilityModalOpen}
          onOpenChange={setAbilityModalOpen}
          onSelect={(ability) => {
            setActiveAbilities((current) => Array.from(new Set([...current, ability])));
            if (ability === "backend") setPrompt((current) => current || "Build a backend-ready app with database, auth, API routes, and admin controls.");
          }}
        />
      </div>
    </TooltipProvider>
  );
}
