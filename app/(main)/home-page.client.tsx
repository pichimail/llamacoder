"use client";

import { HomeShell } from "@/components/home/home-shell";
import { useRouter } from "next/navigation";
import { use, useRef, useState, useTransition } from "react";
import { ArrowUp, Brain, Github, Palette, Plus, Search as SearchIcon, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import Header from "@/components/header";
import { FeaturedAppsGrid } from "@/components/featured-apps-grid";
import { MODELS } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { Context } from "./providers";

type Mode = "ask" | "plan" | "agent";
type Attachment = { kind: "image" | "file"; filename: string; url?: string; size?: number };

const HERO_GRADIENT =
  "radial-gradient(125% 125% at 50% 101%, rgba(245,87,2,1) 10.5%, rgba(245,120,2,1) 16%, rgba(245,140,2,1) 17.5%, rgba(245,170,100,1) 25%, rgba(238,174,202,1) 40%, rgba(202,179,214,1) 65%, rgba(148,201,233,1) 100%)";

const PROMPT_CHIP_GROUPS = [
  { title: "Dashboards", prompt: "Build a polished SaaS dashboard with project cards, clean tables, filters, empty states, settings, and responsive mobile navigation." },
  { title: "Auth screens", prompt: "Build a premium authentication flow with sign in, sign up, password reset, verification state, and accessible responsive forms." },
  { title: "Admin panels", prompt: "Build a production-style admin panel with users, roles, content moderation, audit logs, settings, and server-ready CRUD screens." },
  { title: "AI apps", prompt: "Build a refined AI app with prompt input, generated result states, history, settings, and a clean consumer UI." },
  { title: "AI chat UI", prompt: "Build a mobile-first chat interface with thread history, attachments, streaming state, message actions, and a clean artifact preview flow." },
] as const;

function ToggleItem({ label, icon, checked, onChange }: { label: string; icon: React.ReactNode; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <DropdownMenuItem onClick={() => onChange(!checked)} className="flex justify-between gap-3">
      <span className="flex items-center gap-2">{icon}{label}</span>
      <span aria-hidden="true" className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-white" : "bg-zinc-700"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full transition ${checked ? "left-[18px] bg-zinc-950" : "left-0.5 bg-white"}`} />
      </span>
    </DropdownMenuItem>
  );
}

function PresetChipsScroller({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="mx-auto mt-4 w-full max-w-[880px] overflow-hidden px-0.5">
      <div className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PROMPT_CHIP_GROUPS.map((group) => (
          <button key={group.title} type="button" onClick={() => onSelect(group.prompt)} className="shrink-0 snap-start rounded-full border border-white/55 bg-white/35 px-4 py-2 text-sm font-medium whitespace-nowrap text-slate-700 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70">
            {group.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function PremiumPromptComposer({
  value,
  onValueChange,
  onSend,
  isLoading,
  disabled,
  model,
  onModelChange,
  models,
  shadcnEnabled,
  onShadcnChange,
  webSearchEnabled,
  onWebSearchChange,
  deepThinkingEnabled,
  onDeepThinkingChange,
  canvasEnabled,
  onCanvasChange,
  onAttach,
  attachmentReady,
  onImportGithub,
}: {
  value: string;
  onValueChange: (value: string) => void;
  onSend: (value: string) => void;
  isLoading: boolean;
  disabled: boolean;
  model: string;
  onModelChange: (model: string) => void;
  models: any[];
  shadcnEnabled: boolean;
  onShadcnChange: (value: boolean) => void;
  webSearchEnabled: boolean;
  onWebSearchChange: (value: boolean) => void;
  deepThinkingEnabled: boolean;
  onDeepThinkingChange: (value: boolean) => void;
  canvasEnabled: boolean;
  onCanvasChange: (value: boolean) => void;
  onAttach: () => void;
  attachmentReady?: boolean;
  onImportGithub: () => void;
}) {
  const hasValue = value.trim().length > 0 || attachmentReady;

  return (
    <div className="w-full">
      <div className="rounded-[28px] border border-white/10 bg-[#1f1f22] text-white shadow-[0_28px_80px_rgba(15,23,42,0.30)] backdrop-blur-2xl">
        <textarea
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!disabled && hasValue) onSend(value);
            }
          }}
          placeholder="Describe what to build"
          aria-label="Describe what to build"
          disabled={disabled}
          rows={3}
          className="min-h-[104px] w-full resize-none rounded-t-[28px] bg-transparent px-6 pb-4 pt-6 text-[17px] leading-relaxed text-white outline-none placeholder:text-zinc-400 disabled:opacity-60"
        />

        {attachmentReady ? (
          <div className="mx-5 mb-3 inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">Attachment ready</div>
        ) : null}

        <div className="flex min-h-[58px] items-center justify-between gap-3 border-t border-white/[0.06] px-3 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" disabled={disabled} className="inline-flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-zinc-300 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/50" aria-label="Open prompt actions">
                <Plus className="size-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[min(86vw,340px)] rounded-[22px] border-white/10 bg-[#1f1f22] p-2 text-white shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
              <DropdownMenuLabel className="text-xs text-zinc-400">Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={onAttach} className="gap-3"><Upload className="size-4" />Upload file</DropdownMenuItem>
              <DropdownMenuItem onClick={onImportGithub} className="gap-3"><Github className="size-4" />Import from GitHub</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuLabel className="text-xs text-zinc-400">Builder</DropdownMenuLabel>
              <ToggleItem label="shadcn UI" icon={<Palette className="size-4" />} checked={shadcnEnabled} onChange={onShadcnChange} />
              <DropdownMenuSeparator className="bg-white/10" />
              <ToggleItem label="Web search" icon={<SearchIcon className="size-4" />} checked={webSearchEnabled} onChange={onWebSearchChange} />
              <ToggleItem label="Deep thinking" icon={<Brain className="size-4" />} checked={deepThinkingEnabled} onChange={onDeepThinkingChange} />
              <ToggleItem label="Canvas" icon={<span aria-hidden="true">🖼️</span>} checked={canvasEnabled} onChange={onCanvasChange} />
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            <label className="sr-only" htmlFor="home-model-select">Model</label>
            <select id="home-model-select" value={model} onChange={(event) => onModelChange(event.target.value)} disabled={disabled} className="h-10 max-w-[58vw] rounded-full border border-white/10 bg-white/[0.055] px-4 text-sm text-white outline-none transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/50 disabled:opacity-50 md:min-w-[210px]">
              {models.map((m: any) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <button type="button" onClick={() => onSend(value)} disabled={disabled || !hasValue} className="inline-flex size-10 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/50 disabled:opacity-40" aria-label="Start build">
              {isLoading ? <span className="text-[10px]">...</span> : <ArrowUp className="size-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePageClient() {
  const router = useRouter();
  const context = use(Context);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("zai-org/GLM-5");
  const [shadcnEnabled, setShadcnEnabled] = useState(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [deepThinkingEnabled, setDeepThinkingEnabled] = useState(false);
  const [canvasEnabled, setCanvasEnabled] = useState(false);
  const [isSubmitting, startTransition] = useTransition();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const visibleModels = MODELS.filter((item) => !item.hidden);

  const handlePromptSend = (value?: string) => {
    const cleanPrompt = (value ?? prompt).trim();
    if (!cleanPrompt && attachments.length === 0) return;

    startTransition(async () => {
      try {
        const featureHints = [
          webSearchEnabled ? "Web search option is enabled. Add source-aware UI states only when real backend data is provided." : "",
          canvasEnabled ? "Canvas option is enabled. Include an editable visual workspace when relevant." : "",
        ].filter(Boolean);
        const finalPrompt = [cleanPrompt || "Build from the uploaded attachment.", ...featureHints].join("\n\n");
        const screenshotUrl = attachments.find((item) => item.kind === "image" && item.url)?.url;
        const response = await fetch("/api/create-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: finalPrompt,
            model,
            quality: "high",
            mode: "agent",
            shadcn: shadcnEnabled,
            screenshotUrl,
            attachments,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.chatId || !data?.lastMessageId) throw new Error(data?.error || "Please check auth/API configuration.");

        const streamPromise = fetch("/api/get-next-completion-stream-promise", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: data.lastMessageId, model, reasoning: deepThinkingEnabled, quality: "high" }),
        }).then(async (streamRes) => {
          if (!streamRes.ok) throw new Error((await streamRes.text()) || "Failed to start generation");
          if (!streamRes.body) throw new Error("No body on response");
          return streamRes.body;
        });
        void streamPromise.catch(() => undefined);
        context.setStreamPromise(streamPromise);
        router.push(`/chats/${data.chatId}`);
      } catch (error) {
        toast({ title: "Could not start build", description: error instanceof Error ? error.message : "Please check configuration.", variant: "destructive" });
      }
    });
  };

  const handleAttachmentUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/blob-upload", { method: "POST", body: formData });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.url) {
      toast({ title: "Upload failed", description: data?.error || "Could not upload file.", variant: "destructive" });
      return;
    }
    setAttachments((items) => [...items, { kind: file.type.startsWith("image/") ? "image" : "file", filename: file.name, url: data.url, size: file.size }]);
    if (!prompt.trim()) setPrompt("Build from the uploaded file or screenshot.");
  };

  const handleImportGithub = () => {
    const url = window.prompt("Paste a public GitHub repository URL");
    if (!url?.trim()) return;
    startTransition(async () => {
      const response = await fetch("/api/import-github-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.chatId) {
        toast({ title: "Import failed", description: data?.error || "Could not import repository.", variant: "destructive" });
        return;
      }
      router.push(`/chats/${data.chatId}?preview=1`);
    });
  };

  return (
    <HomeShell>
      <div className="flex min-h-dvh flex-col text-foreground">
        <section id="hero" className="relative flex min-h-dvh overflow-hidden" style={{ background: HERO_GRADIENT }}>
          <div className="relative m-3 flex-1 overflow-hidden rounded-[28px] md:m-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_78%,rgba(255,122,0,0.34),transparent_30%),radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.22),transparent_34%)]" />
            <div className="relative flex min-h-dvh w-full flex-col">
              <Header hideLogo />
              <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24 pt-8 md:pb-32">
                <div className="flex w-full max-w-[920px] -translate-y-2 flex-col items-center md:-translate-y-6">
                  <h1 className="mb-10 text-center text-[52px] font-black leading-none tracking-[-0.07em] text-slate-950 md:text-[80px] lg:text-[92px]">
                    Build. <span className="mx-3 md:mx-8">Preview.</span> <span className="bg-gradient-to-r from-lime-300 to-emerald-400 bg-clip-text text-transparent">Ship.</span>
                  </h1>
                  <div id="prompt-composer" className="relative w-full">
                    <PremiumPromptComposer value={prompt} onValueChange={setPrompt} onSend={handlePromptSend} isLoading={isSubmitting} disabled={isSubmitting} model={model} onModelChange={setModel} models={visibleModels} shadcnEnabled={shadcnEnabled} onShadcnChange={setShadcnEnabled} webSearchEnabled={webSearchEnabled} onWebSearchChange={setWebSearchEnabled} deepThinkingEnabled={deepThinkingEnabled} onDeepThinkingChange={setDeepThinkingEnabled} canvasEnabled={canvasEnabled} onCanvasChange={setCanvasEnabled} onAttach={() => fileInputRef.current?.click()} attachmentReady={attachments.length > 0} onImportGithub={handleImportGithub} />
                    <PresetChipsScroller onSelect={setPrompt} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="featured-templates" className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-8 pt-5">
          <div className="rounded-[36px] border border-border/70 bg-background/95 px-4 py-4 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-md md:px-5 md:py-5">
            <div className="flex items-end justify-between gap-4 border-b border-border/60 pb-4">
              <div><h2 className="text-lg font-semibold tracking-tight">Featured templates</h2><p className="mt-1 text-sm text-muted-foreground">Open a responsive preview, then remix in the builder.</p></div>
              <Link href="/gallery" className="text-xs text-muted-foreground transition hover:text-foreground">View gallery</Link>
            </div>
            <div className="mt-4"><FeaturedAppsGrid apps={[]} limit={6} compact /></div>
          </div>
        </section>
      </div>
      <input ref={fileInputRef} className="hidden" type="file" accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md,.json,.csv,.zip" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleAttachmentUpload(file); if (event.currentTarget) event.currentTarget.value = ""; }} />
    </HomeShell>
  );
}
