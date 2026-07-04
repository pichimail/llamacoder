"use client";

import { HomeShell } from "@/components/home/home-shell";
import { use, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { ArrowUp, Bot, Brain, Check, ChevronDown, Github, Image as ImageIcon, ListChecks, Loader2, MessageSquare, Palette, Plus, Search as SearchIcon, Upload } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { transcriptJoin } from "@/components/voice-input-button";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/header";
import { FeaturedAppsGrid } from "@/components/featured-apps-grid";
import { MODELS } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { Context } from "./providers";

type Mode = "ask" | "plan" | "agent";
type Attachment = { kind: "image" | "file"; filename: string; url?: string; size?: number };
type SavedPrompt = { id: string; title: string; body: string; category: string; tone: string };

const PROMPT_CHIP_GROUPS = [
  { title: "Dashboards", prompt: "Build a polished SaaS dashboard with project cards, clean tables, filters, empty states, settings, and responsive mobile navigation." },
  { title: "Auth screens", prompt: "Build a premium authentication flow with sign in, sign up, password reset, verification state, and accessible responsive forms." },
  { title: "Admin panels", prompt: "Build a production-style admin panel with users, roles, content moderation, audit logs, settings, and server-ready CRUD screens." },
  { title: "AI apps", prompt: "Build a refined AI app with prompt input, generated result states, history, settings, and a clean consumer UI." },
  { title: "AI chat UI", prompt: "Build a mobile-first chat interface with thread history, attachments, streaming state, message actions, and a clean artifact preview flow." },
  { title: "E-commerce", prompt: "Build a premium e-commerce storefront with product grid, filters, product detail, cart drawer, checkout states, and responsive mobile UX." },
  { title: "Booking app", prompt: "Build a booking app with availability calendar, service details, customer form, confirmation flow, and admin-ready booking management." },
  { title: "CRM", prompt: "Build a CRM workspace with contacts, pipeline stages, deal detail views, activity timeline, filters, and editable forms." },
  { title: "Analytics", prompt: "Build an analytics dashboard with KPI cards, charts, date filters, drill-down tables, alerts, and export-ready actions." },
  { title: "Marketplace", prompt: "Build a marketplace app with listings, seller profiles, saved items, search filters, checkout intent, and trust/safety states." },
  { title: "Project hub", prompt: "Build a project management hub with boards, tasks, timeline, team members, comments, files, and notification states." },
  { title: "Settings", prompt: "Build a polished settings center with account, billing, team, security, notifications, integrations, and danger-zone flows." },
] as const;

function ToggleItem({ label, icon, checked, onChange }: { label: string; icon: ReactNode; checked: boolean; onChange: (value: boolean) => void }) {
  return <DropdownMenuItem onClick={() => onChange(!checked)} className="flex justify-between gap-3"><span className="flex items-center gap-2">{icon}{label}</span><span aria-hidden="true" className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-white" : "bg-zinc-700"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full transition ${checked ? "left-[18px] bg-zinc-950" : "left-0.5 bg-white"}`} /></span></DropdownMenuItem>;
}

function ModeItem({ mode, current, label, description, icon, onSelect }: { mode: Mode; current: Mode; label: string; description: string; icon: ReactNode; onSelect: (mode: Mode) => void }) {
  return <DropdownMenuItem onClick={() => onSelect(mode)} className="items-start gap-3"><span className="mt-0.5 text-zinc-300">{icon}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm text-white">{label}{current === mode ? <Check className="size-3.5 text-emerald-300" /> : null}</span><span className="mt-0.5 block text-xs leading-4 text-zinc-400">{description}</span></span></DropdownMenuItem>;
}

function PresetChipsScroller({ onSelect }: { onSelect: (prompt: string) => void }) {
  return <div className="mx-auto mt-4 w-full max-w-[880px] overflow-hidden px-0.5"><div className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{PROMPT_CHIP_GROUPS.map((group) => <button key={group.title} type="button" onClick={() => onSelect(group.prompt)} className="shrink-0 snap-start rounded-full border border-white/55 bg-white/35 px-4 py-2 text-sm font-medium whitespace-nowrap text-slate-700 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70">{group.title}</button>)}</div></div>;
}

const HERO_WORDS = [
  {
    label: "Build.",
    className:
      "headline-gradient-word bg-gradient-to-r from-orange-500 via-rose-400 to-fuchsia-500 drop-shadow-[0_0_22px_rgba(251,146,60,0.42)]",
    animationDuration: "3.2s",
  },
  {
    label: "Preview.",
    className:
      "headline-gradient-word bg-gradient-to-r from-fuchsia-500 via-violet-500 to-amber-400 drop-shadow-[0_0_22px_rgba(217,70,239,0.38)]",
    animationDuration: "3.8s",
  },
  {
    label: "Ship.",
    className:
      "headline-gradient-word bg-gradient-to-r from-amber-300 via-lime-300 to-yellow-200 drop-shadow-[0_0_22px_rgba(251,191,36,0.40)]",
    animationDuration: "3.4s",
  },
] as const;

function PremiumPromptComposer({ value, onValueChange, onSend, isLoading, disabled, model, onModelChange, models, buildMode, onBuildModeChange, shadcnEnabled, onShadcnChange, webSearchEnabled, onWebSearchChange, deepThinkingEnabled, onDeepThinkingChange, canvasEnabled, onCanvasChange, onAttach, attachmentReady, onImportGithub, savedPrompts, onSavePrompt, onUseSavedPrompt }: { value: string; onValueChange: (value: string) => void; onSend: (value: string) => void; isLoading: boolean; disabled: boolean; model: string; onModelChange: (model: string) => void; models: any[]; buildMode: Mode; onBuildModeChange: (mode: Mode) => void; shadcnEnabled: boolean; onShadcnChange: (value: boolean) => void; webSearchEnabled: boolean; onWebSearchChange: (value: boolean) => void; deepThinkingEnabled: boolean; onDeepThinkingChange: (value: boolean) => void; canvasEnabled: boolean; onCanvasChange: (value: boolean) => void; onAttach: () => void; attachmentReady?: boolean; onImportGithub: () => void; savedPrompts: SavedPrompt[]; onSavePrompt: () => void; onUseSavedPrompt: (prompt: SavedPrompt) => void }) {
  const hasValue = value.trim().length > 0 || attachmentReady;
  const variableCount = (value.match(/\{[^{}]+\}/g) || []).length;
  return (
    <div className="w-full"><div className="rounded-[28px] border border-white/10 bg-[#1f1f22] text-white shadow-[0_28px_80px_rgba(15,23,42,0.30)] backdrop-blur-2xl">
      <textarea value={value} onChange={(event) => onValueChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (!disabled && hasValue) onSend(value); } }} placeholder="Describe what to build" aria-label="Describe what to build" disabled={disabled} rows={3} className="min-h-[104px] w-full resize-none rounded-t-[28px] bg-transparent px-6 pb-4 pt-6 text-[17px] leading-relaxed text-white outline-none placeholder:text-zinc-400 disabled:opacity-60" />
      {attachmentReady ? <div className="mx-5 mb-3 inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">Attachment ready</div> : null}
      <div className="flex flex-wrap items-center gap-2 px-5 pb-2 text-xs text-zinc-400">
        <button type="button" onClick={() => onValueChange(`${value.trim()}\n\nUse a structured build plan with complete routes, states, and responsive behavior.`.trim())} className="rounded-full border border-white/10 px-3 py-1 transition hover:border-white/20 hover:text-zinc-200">Add structure</button>
        <button type="button" onClick={() => onValueChange(`${value.trim()}\n\nVariables: {audience}, {workflow}, {visual_style}, {must_have}`.trim())} className="rounded-full border border-white/10 px-3 py-1 transition hover:border-white/20 hover:text-zinc-200">Add variables</button>
        <button type="button" onClick={onSavePrompt} disabled={!value.trim()} className="rounded-full border border-white/10 px-3 py-1 transition hover:border-white/20 hover:text-zinc-200 disabled:opacity-40">Save prompt</button>
        <Link href="/library" className="rounded-full border border-white/10 px-3 py-1 transition hover:border-white/20 hover:text-zinc-200">Library</Link>
        {variableCount > 0 ? <span className="rounded-full bg-white/10 px-3 py-1">{variableCount} variables detected</span> : null}
      </div>
      {savedPrompts.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {savedPrompts.slice(0, 5).map((item) => (
            <button key={item.id} type="button" onClick={() => onUseSavedPrompt(item)} className="shrink-0 rounded-full bg-white/[0.06] px-3 py-1 text-xs text-zinc-300 transition hover:bg-white/[0.1] hover:text-white">
              {item.title}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex min-h-[58px] items-center justify-between gap-3 px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className="group inline-flex size-11 items-center justify-center rounded-full bg-transparent text-zinc-500 transition-colors hover:text-zinc-400 focus-visible:outline-none focus-visible:text-zinc-200 disabled:opacity-40"
              aria-label="Open prompt actions"
            >
              <Plus className="size-5 transition duration-200 group-hover:scale-[1.04]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[min(86vw,360px)] rounded-[22px] border-white/10 bg-[#1f1f22] p-2 text-white shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
            <DropdownMenuLabel className="text-xs text-zinc-400">Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={onAttach} className="gap-3"><Upload className="size-4" />Upload file</DropdownMenuItem>
            <DropdownMenuItem onClick={onImportGithub} className="gap-3"><Github className="size-4" />Import from GitHub</DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuLabel className="text-xs text-zinc-400">Mode</DropdownMenuLabel>
            <ModeItem mode="agent" current={buildMode} label="Agent" description="Build the app, write files, validate preview, then self-correct once if needed." icon={<Bot className="size-4" />} onSelect={onBuildModeChange} />
            <ModeItem mode="plan" current={buildMode} label="Plan" description="Create a buildability plan only: possible, not possible, backend, files, and steps." icon={<ListChecks className="size-4" />} onSelect={onBuildModeChange} />
            <ModeItem mode="ask" current={buildMode} label="Ask" description="Answer questions without writing a full artifact." icon={<MessageSquare className="size-4" />} onSelect={onBuildModeChange} />
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuLabel className="text-xs text-zinc-400">Builder</DropdownMenuLabel>
            <ToggleItem label="shadcn UI" icon={<Palette className="size-4" />} checked={shadcnEnabled} onChange={onShadcnChange} />
            <DropdownMenuSeparator className="bg-white/10" />
            <ToggleItem label="Web search" icon={<SearchIcon className="size-4" />} checked={webSearchEnabled} onChange={onWebSearchChange} />
            <ToggleItem label="Deep thinking" icon={<Brain className="size-4" />} checked={deepThinkingEnabled} onChange={onDeepThinkingChange} />
            <ToggleItem label="Canvas" icon={<ImageIcon className="size-4" />} checked={canvasEnabled} onChange={onCanvasChange} />
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <label className="sr-only" htmlFor="home-model-select">Model</label>
          <div className="group relative inline-flex max-w-[46vw] md:min-w-[210px]">
            <select
              id="home-model-select"
              value={model}
              onChange={(event) => onModelChange(event.target.value)}
              disabled={disabled}
              className="peer h-10 w-full appearance-none rounded-full border-0 bg-transparent py-0 pl-0 pr-7 text-sm text-zinc-400 outline-none transition-colors placeholder:text-zinc-500 hover:text-zinc-200 focus:text-zinc-100 disabled:opacity-50"
            >
              {models.map((m: any) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-zinc-500 transition-colors group-hover:text-zinc-400 peer-focus:text-zinc-300" aria-hidden="true" />
          </div>
          <SpeechInput onTranscriptionChange={(text) => onValueChange(transcriptJoin(value, text))} disabled={disabled} className="size-10 rounded-full border-0 bg-transparent text-zinc-500 transition-colors hover:bg-transparent hover:text-zinc-400" aria-label="Dictate prompt" />
          <button type="button" onClick={() => onSend(value)} disabled={disabled || !hasValue} className="group inline-flex size-10 items-center justify-center rounded-full border border-white/55 bg-white/90 text-zinc-500 shadow-[0_0_0_1px_rgba(255,255,255,0.14)] transition-all hover:border-white hover:bg-white hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-40" aria-label="Start build">{isLoading ? <span className="text-[10px]">...</span> : <ArrowUp className="size-5 transition-colors group-hover:text-zinc-700" />}</button>
        </div>
      </div>
    </div></div>
  );
}

export default function HomePageClient() {
  const context = use(Context);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prompt, setPrompt] = useState("");
  const [buildMode, setBuildMode] = useState<Mode>("agent");
  const [model, setModel] = useState("zai-org/GLM-5");
  const [shadcnEnabled, setShadcnEnabled] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [deepThinkingEnabled, setDeepThinkingEnabled] = useState(false);
  const [canvasEnabled, setCanvasEnabled] = useState(false);
  const [isSubmitting, startTransition] = useTransition();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [githubDialogOpen, setGithubDialogOpen] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [githubError, setGithubError] = useState("");
  const [isGithubImporting, setIsGithubImporting] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const visibleModels = MODELS.filter((item) => !item.hidden);

  useEffect(() => { let cancelled = false; async function loadBuilderSettings() { try { const response = await fetch("/api/user-settings", { cache: "no-store" }); if (!response.ok) return; const data = await response.json().catch(() => null); const settings = data?.settings; if (!settings || cancelled) return; if (typeof settings.defaultModel === "string") setModel(settings.defaultModel); if (["ask", "plan", "agent"].includes(settings.defaultMode)) setBuildMode(settings.defaultMode); if (typeof settings.shadcnDefault === "boolean") setShadcnEnabled(settings.shadcnDefault); if (typeof settings.webSearchDefault === "boolean") setWebSearchEnabled(settings.webSearchDefault); if (typeof settings.deepThinkingDefault === "boolean") setDeepThinkingEnabled(settings.deepThinkingDefault); if (typeof settings.canvasDefault === "boolean") setCanvasEnabled(settings.canvasDefault); if (typeof settings.githubRepositoryUrl === "string") setGithubUrl(settings.githubRepositoryUrl); } catch {} } loadBuilderSettings(); return () => { cancelled = true; }; }, []);

  useEffect(() => {
    const incomingPrompt = searchParams.get("prompt");
    if (incomingPrompt) setPrompt(incomingPrompt);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    async function loadPrompts() {
      const response = await fetch("/api/prompts?limit=8", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const data = await response.json().catch(() => null);
      if (!cancelled && Array.isArray(data?.prompts)) setSavedPrompts(data.prompts);
    }
    void loadPrompts();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePromptSend = (value?: string) => {
    const cleanPrompt = (value ?? prompt).trim();
    if (!cleanPrompt && attachments.length === 0) return;
    startTransition(async () => { try { const featureHints = [webSearchEnabled ? "Web search option is enabled. Add source-aware UI states only when real backend data is provided." : "", canvasEnabled ? "Canvas option is enabled. Include an editable visual workspace when relevant." : ""].filter(Boolean); const finalPrompt = [cleanPrompt || "Build from the uploaded attachment.", ...featureHints].join("\n\n"); const screenshotUrl = attachments.find((item) => item.kind === "image" && item.url)?.url; const response = await fetch("/api/create-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: finalPrompt, model, quality: "high", mode: buildMode, shadcn: shadcnEnabled, screenshotUrl, attachments }) }); const data = await response.json().catch(() => null); if (!response.ok || !data?.chatId || !data?.lastMessageId) throw new Error(data?.error || "Please check auth/API configuration."); const streamPromise = fetch("/api/get-next-completion-stream-promise", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: data.lastMessageId, model, reasoning: deepThinkingEnabled, quality: "high" }) }).then(async (streamRes) => { if (!streamRes.ok) throw new Error((await streamRes.text()) || "Failed to start generation"); if (!streamRes.body) throw new Error("No body on response"); return streamRes.body; }); void streamPromise.catch(() => undefined); context.setStreamPromise(streamPromise); const params = new URLSearchParams({ generate: data.lastMessageId, model, quality: "high" }); if (deepThinkingEnabled) params.set("reasoning", "1"); router.push(`/chats/${data.chatId}?${params.toString()}`); } catch (error) { toast({ title: "Could not start build", description: error instanceof Error ? error.message : "Please check configuration.", variant: "destructive" }); } });
  };

  const handleAttachmentUpload = async (file: File) => { const formData = new FormData(); formData.append("file", file); const response = await fetch("/api/blob-upload", { method: "POST", body: formData }); const data = await response.json().catch(() => null); if (!response.ok || !data?.url) { toast({ title: "Upload failed", description: data?.error || "Could not upload file.", variant: "destructive" }); return; } setAttachments((items) => [...items, { kind: file.type.startsWith("image/") ? "image" : "file", filename: file.name, url: data.url, size: file.size }]); if (!prompt.trim()) setPrompt("Build from the uploaded file or screenshot."); };

  const submitGithubImport = () => { const url = githubUrl.trim(); setGithubError(""); if (!url) { setGithubError("Enter a GitHub repository URL."); return; } if (!/^https:\/\/github\.com\/[^/]+\/[^/]+/i.test(url)) { setGithubError("Use a valid GitHub URL like https://github.com/owner/repo."); return; } setIsGithubImporting(true); startTransition(async () => { try { const response = await fetch("/api/import-github-repo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }); const data = await response.json().catch(() => null); if (!response.ok || !data?.chatId) throw new Error(data?.error || "Could not import repository."); setGithubDialogOpen(false); setGithubUrl(""); router.push(`/chats/${data.chatId}?preview=1`); } catch (error) { setGithubError(error instanceof Error ? error.message : "Could not import repository."); } finally { setIsGithubImporting(false); } }); };

  const saveCurrentPrompt = () => {
    const body = prompt.trim();
    if (!body) return;
    startTransition(async () => {
      try {
        const response = await fetch("/api/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: body.split(/\s+/).slice(0, 8).join(" ") || "Saved prompt",
            body,
            category: "Composer",
            tone: "Build-ready",
            tags: ["composer"],
            variables: Array.from(new Set(Array.from(body.matchAll(/\{([^{}]+)\}/g)).map((match) => match[1]))),
            visibility: "private",
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.prompt) throw new Error(data?.error || "Could not save prompt");
        setSavedPrompts((items) => [data.prompt, ...items.filter((item) => item.id !== data.prompt.id)].slice(0, 8));
        toast({ title: "Prompt saved", description: "It is now available in your library." });
      } catch (error) {
        toast({ title: "Could not save prompt", description: error instanceof Error ? error.message : "Please check auth settings.", variant: "destructive" });
      }
    });
  };

  return (
    <HomeShell><div className="flex min-h-dvh flex-col text-foreground"><section id="hero" className="relative flex min-h-dvh overflow-hidden bg-[radial-gradient(125%_125%_at_50%_101%,rgba(245,87,2,1)_10.5%,rgba(245,120,2,1)_16%,rgba(245,140,2,1)_17.5%,rgba(245,170,100,1)_25%,rgba(238,174,202,1)_40%,rgba(202,179,214,1)_65%,rgba(148,201,233,1)_100%)]"><div className="relative m-3 flex-1 overflow-hidden rounded-[28px] md:m-4"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_78%,rgba(255,122,0,0.34),transparent_30%),radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.22),transparent_34%)]" /><div className="relative flex min-h-dvh w-full flex-col"><Header hideLogo /><div className="flex flex-1 flex-col items-center justify-center px-4 pb-24 pt-8 md:pb-32"><div className="flex w-full max-w-[920px] -translate-y-2 flex-col items-center md:-translate-y-6"><h1 className="mb-10 text-center text-[52px] font-black leading-none tracking-[-0.07em] text-slate-950 md:text-[80px] lg:text-[92px]"><span className={HERO_WORDS[0].className} style={{ animationDuration: HERO_WORDS[0].animationDuration }}>Build.</span> <span className="mx-3 md:mx-8"><span className={HERO_WORDS[1].className} style={{ animationDuration: HERO_WORDS[1].animationDuration }}>Preview.</span></span> <span className={HERO_WORDS[2].className} style={{ animationDuration: HERO_WORDS[2].animationDuration }}>Ship.</span></h1><div id="prompt-composer" className="relative w-full"><PremiumPromptComposer value={prompt} onValueChange={setPrompt} onSend={handlePromptSend} isLoading={isSubmitting} disabled={isSubmitting || isGithubImporting} model={model} onModelChange={setModel} models={visibleModels} buildMode={buildMode} onBuildModeChange={setBuildMode} shadcnEnabled={shadcnEnabled} onShadcnChange={setShadcnEnabled} webSearchEnabled={webSearchEnabled} onWebSearchChange={setWebSearchEnabled} deepThinkingEnabled={deepThinkingEnabled} onDeepThinkingChange={setDeepThinkingEnabled} canvasEnabled={canvasEnabled} onCanvasChange={setCanvasEnabled} onAttach={() => fileInputRef.current?.click()} attachmentReady={attachments.length > 0} onImportGithub={() => setGithubDialogOpen(true)} savedPrompts={savedPrompts} onSavePrompt={saveCurrentPrompt} onUseSavedPrompt={(item) => setPrompt(item.body)} /><PresetChipsScroller onSelect={setPrompt} /></div></div></div></div></div></section><section id="featured-templates" className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-8 pt-5"><div className="rounded-[36px] border border-border/70 bg-background/95 px-4 py-4 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-md md:px-5 md:py-5"><div className="flex items-end justify-between gap-4 border-b border-border/60 pb-4"><div><h2 className="text-lg font-semibold tracking-tight">Featured templates</h2><p className="mt-1 text-sm text-muted-foreground">Open a responsive preview, then remix in the builder.</p></div><Link href="/gallery" className="text-xs text-muted-foreground transition hover:text-foreground">View gallery</Link></div><div className="mt-4"><FeaturedAppsGrid apps={[]} limit={6} compact /></div></div></section></div><input ref={fileInputRef} className="hidden" type="file" title="Attach file" aria-label="Attach file" accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md,.json,.csv,.zip" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleAttachmentUpload(file); if (event.currentTarget) event.currentTarget.value = ""; }} /><Dialog open={githubDialogOpen} onOpenChange={(open) => { if (!isGithubImporting) setGithubDialogOpen(open); }}><DialogContent className="w-[calc(100vw-2rem)] max-w-xl rounded-3xl border-border/70 bg-background p-0 shadow-2xl"><DialogHeader className="border-b border-border/70 px-5 pb-4 pt-5 text-left"><DialogTitle className="flex items-center gap-2 text-base"><Github className="size-4" />Import from GitHub</DialogTitle><DialogDescription>Paste a public repository URL. Chinna-Coder will import files, create a chat, and open the live preview.</DialogDescription></DialogHeader><form className="space-y-4 px-5 py-5" onSubmit={(event) => { event.preventDefault(); submitGithubImport(); }}><div className="space-y-2"><label htmlFor="github-url" className="text-sm font-medium">Repository URL</label><div className="flex flex-col gap-2 sm:flex-row"><Input id="github-url" autoFocus value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} placeholder="https://github.com/pichimail/llamacoder" disabled={isGithubImporting} className="h-11 rounded-xl" /><Button type="submit" disabled={isGithubImporting || !githubUrl.trim()} className="h-11 rounded-xl px-5">{isGithubImporting ? <Loader2 className="size-4 animate-spin" /> : null}{isGithubImporting ? "Importing" : "Import"}</Button></div>{githubError ? <p className="text-sm text-destructive">{githubError}</p> : null}</div><div className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">Supports public GitHub repositories. Private repository import should be connected through account integrations before use.</div></form><DialogFooter className="border-t border-border/70 px-5 py-4"><Button type="button" variant="outline" onClick={() => setGithubDialogOpen(false)} disabled={isGithubImporting}>Cancel</Button></DialogFooter></DialogContent></Dialog></HomeShell>
  );
}
