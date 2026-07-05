"use client";

import { HomeShell } from "@/components/home/home-shell";
import { use, useEffect, useRef, useState, useTransition, type ChangeEvent, type ReactNode } from "react";
import { DotFlow } from "@/components/ui/dot-flow";
import { ArrowUp, Bot, Box, Brain, Check, ChevronDown, Code2, Eye, Github, Image as ImageIcon, Layers, ListChecks, Database, Loader2, Lock, MessageSquare, Palette, Plus, Rocket, Search as SearchIcon, Smartphone, Sparkles, Store, Upload, Video, Wand2, Zap } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { transcriptJoin } from "@/components/voice-input-button";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/header";
import { FeaturedAppsGrid } from "@/components/featured-apps-grid";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { MODELS } from "@/lib/constants";
import { SANDBOX_STYLE_PRESETS, DEFAULT_STYLE_ID, type SandboxStyleId } from "@/lib/sandbox-theme";
import { requiresAI } from "@/lib/ai-detection";
import { toast } from "@/hooks/use-toast";
import { Context } from "./providers";

type Mode = "ask" | "plan" | "agent";
type Attachment = { kind: "image" | "file"; filename: string; url?: string; size?: number };
type SavedPrompt = { id: string; title: string; body: string; category: string; tone: string };
type SavedDesign = { id: string; name: string; source: string; sourceRef?: string | null };

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

const TYPEWRITER_PROMPTS = [
  "Build a project tracker with kanban boards and a timeline view...",
  "Build a 3D solar system viewer with Three.js and orbit controls...",
  "Build a booking app with an availability calendar and admin panel...",
  "Build an analytics dashboard with KPI cards and drill-down tables...",
  "Build a premium blog with an editorial dark theme...",
];

function useTypewriterPlaceholder(active: boolean) {
  const [text, setText] = useState("Describe what to build");
  const prefersReducedMotion = useReducedMotion();
  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion) { setText(TYPEWRITER_PROMPTS[0]); return; }
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const phrase = TYPEWRITER_PROMPTS[phraseIndex];
      if (!deleting) {
        charIndex += 1;
        setText(phrase.slice(0, charIndex));
        if (charIndex >= phrase.length) { deleting = true; timer = setTimeout(tick, 2200); return; }
        timer = setTimeout(tick, 34);
      } else {
        charIndex -= 2;
        if (charIndex <= 0) { charIndex = 0; deleting = false; phraseIndex = (phraseIndex + 1) % TYPEWRITER_PROMPTS.length; }
        setText(phrase.slice(0, Math.max(charIndex, 0)) || "Describe what to build");
        timer = setTimeout(tick, deleting ? 14 : 300);
      }
    };
    timer = setTimeout(tick, 700);
    return () => clearTimeout(timer);
  }, [active, prefersReducedMotion]);
  return text;
}

function ToggleItem({ label, icon, checked, onChange }: { label: string; icon: ReactNode; checked: boolean; onChange: (value: boolean) => void }) {
  return <DropdownMenuItem onClick={() => onChange(!checked)} className="flex justify-between gap-3"><span className="flex items-center gap-2">{icon}{label}</span><span aria-hidden="true" className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-white" : "bg-zinc-700"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full transition ${checked ? "left-[18px] bg-zinc-950" : "left-0.5 bg-white"}`} /></span></DropdownMenuItem>;
}

function ModeItem({ mode, current, label, description, icon, onSelect }: { mode: Mode; current: Mode; label: string; description: string; icon: ReactNode; onSelect: (mode: Mode) => void }) {
  return <DropdownMenuItem onClick={() => onSelect(mode)} className="items-start gap-3"><span className="mt-0.5 text-zinc-300">{icon}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm text-white">{label}{current === mode ? <Check className="size-3.5 text-emerald-300" /> : null}</span><span className="mt-0.5 block text-xs leading-4 text-zinc-400">{description}</span></span></DropdownMenuItem>;
}

/* Phase 1 (B6): style preset chip selector. Same pattern as the mode toggles. */
function DesignPicker({
  value,
  onChange,
  disabled,
  savedDesigns,
  onOpenDesignDialog,
  onSelectSavedDesign,
  selectedSavedDesignId,
}: {
  value: SandboxStyleId;
  onChange: (id: SandboxStyleId) => void;
  disabled?: boolean;
  savedDesigns: SavedDesign[];
  onOpenDesignDialog: () => void;
  onSelectSavedDesign: (design: SavedDesign) => void;
  selectedSavedDesignId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const activePreset = SANDBOX_STYLE_PRESETS.find((p) => p.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={selectedSavedDesignId ? "Custom design active" : activePreset?.description}
          aria-label="Choose a design style"
          className="inline-flex size-10 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 disabled:opacity-40"
        >
          <Palette className="size-5" style={selectedSavedDesignId ? undefined : { color: activePreset?.swatch }} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 rounded-xl border-white/10 bg-zinc-900 p-0 text-white shadow-xl">
        <button
          type="button"
          onClick={() => { setOpen(false); onOpenDesignDialog(); }}
          className="flex w-full items-center gap-2.5 border-b border-white/10 px-3.5 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-white/[0.06]"
        >
          <Plus className="size-4" />
          Start with your design
        </button>
        <ScrollArea className="max-h-80">
          <div className="p-1.5">
            {savedDesigns.length > 0 ? (
              <>
                <div className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Your designs</div>
                {savedDesigns.map((design) => (
                  <button
                    key={design.id}
                    type="button"
                    onClick={() => { onSelectSavedDesign(design); setOpen(false); }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-white/[0.06] ${selectedSavedDesignId === design.id ? "bg-white/10 text-white" : "text-zinc-300"}`}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 text-[10px] font-semibold uppercase">{design.name.slice(0, 1)}</span>
                    <span className="truncate">{design.name}</span>
                    {selectedSavedDesignId === design.id ? <Check className="ml-auto size-3.5 shrink-0" /> : null}
                  </button>
                ))}
                <div className="my-1 h-px bg-white/10" />
              </>
            ) : null}
            <div className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Design styles</div>
            {SANDBOX_STYLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => { onChange(preset.id); setOpen(false); }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-white/[0.06] ${!selectedSavedDesignId && value === preset.id ? "bg-white/10 text-white" : "text-zinc-300"}`}
              >
                <span aria-hidden="true" className="size-4 shrink-0 rounded-full" style={{ backgroundColor: preset.swatch }} />
                <span className="flex flex-col">
                  <span>{preset.label}</span>
                  <span className="text-[11px] text-zinc-500">{preset.description}</span>
                </span>
                {!selectedSavedDesignId && value === preset.id ? <Check className="ml-auto size-3.5 shrink-0" /> : null}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function DesignSystemDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (design: SavedDesign, fullContent: string, instructions?: string) => void;
}) {
  const [pasted, setPasted] = useState("");
  const [name, setName] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadedContent, setUploadedContent] = useState<{ filename: string; text: string } | null>(null);

  const reset = () => {
    setPasted(""); setName(""); setGithubUrl(""); setWebsiteUrl(""); setInstructions(""); setUploadedContent(null);
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text().catch(() => "");
    setUploadedContent({ filename: file.name, text });
    if (!name) setName(file.name.replace(/\.(md|txt)$/i, ""));
  };

  const canContinue = (pasted.trim() || uploadedContent || githubUrl.trim() || websiteUrl.trim()) && !isSaving;

  const handleContinue = async () => {
    if (!canContinue) return;
    setIsSaving(true);
    try {
      let content = "";
      let source: "paste" | "upload" | "github" | "website" = "paste";
      let sourceRef: string | undefined;

      if (uploadedContent) {
        content = uploadedContent.text;
        source = "upload";
      } else if (pasted.trim()) {
        content = pasted.trim();
        source = "paste";
      } else if (githubUrl.trim()) {
        // Honest limitation: repo content extraction isn't implemented in this
        // pass. We store the URL and instructions as the design signal rather
        // than silently pretending to have scanned the repo's actual styles.
        content = `Design reference: GitHub repository ${githubUrl.trim()}. No automated style extraction was run — apply the additional instructions below as the primary guidance, and use common conventions from a typical project at this URL only as a loose fallback.`;
        source = "github";
        sourceRef = githubUrl.trim();
      } else if (websiteUrl.trim()) {
        content = `Design reference: website ${websiteUrl.trim()}. No automated style extraction was run — apply the additional instructions below as the primary guidance.`;
        source = "website";
        sourceRef = websiteUrl.trim();
      }

      const finalName = name.trim() || uploadedContent?.filename.replace(/\.(md|txt)$/i, "") || `Custom design ${new Date().toLocaleDateString()}`;

      const response = await fetch("/api/design-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: finalName, source, sourceRef, content, instructions: instructions.trim() || undefined }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.preset) throw new Error(data?.error || "Could not save this design.");

      onSaved(data.preset, content, instructions.trim() || undefined);
      toast({ title: "Design saved", description: "It's ready to use now and saved for future builds." });
      reset();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Could not save design", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!isSaving) { onOpenChange(next); if (!next) reset(); } }}>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto rounded-3xl border-border/70 bg-background p-0 shadow-2xl">
        <DialogHeader className="border-b border-border/70 px-6 pb-4 pt-6 text-left">
          <DialogTitle className="text-xl">Start with your design</DialogTitle>
          <DialogDescription>
            DESIGN.md describes the look and feel you want. Paste one, upload files, or point at a reference — Chinna-Coder will follow it strictly for this build and save it for reuse.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 px-6 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="design-name" className="text-sm">Name this design</Label>
            <Input id="design-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme brand system" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="design-paste" className="text-sm">Paste existing DESIGN.md</Label>
            <Textarea id="design-paste" value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Paste a DESIGN.md file here..." className="min-h-28 font-mono text-xs" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <Upload className="size-5" />
              {uploadedContent ? uploadedContent.filename : "Upload a DESIGN.md or .txt file"}
            </button>
            <input ref={fileRef} type="file" accept=".md,.txt" className="hidden" onChange={handleFileUpload} aria-label="Upload DESIGN.md file" />
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground opacity-60">
              <ImageIcon className="size-5" />
              Upload images/fonts/logos
              <Badge variant="secondary" className="text-[10px]">Coming soon</Badge>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="design-github" className="text-sm">Public GitHub repository</Label>
            <Input id="design-github" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/owner/repo" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="design-website" className="text-sm">Reference website</Label>
            <Input id="design-website" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="design-instructions" className="text-sm">Additional instructions</Label>
            <Textarea id="design-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. Favor dark mode. Buttons should be pill-shaped." className="min-h-20" />
          </div>

          {(githubUrl.trim() || websiteUrl.trim()) && !pasted.trim() && !uploadedContent ? (
            <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              Automated style extraction from a repo or website isn't implemented yet — your additional
              instructions above will carry the design intent for now. Pasting or uploading a DESIGN.md
              gives the most accurate results today.
            </p>
          ) : null}
        </div>
        <DialogFooter className="border-t border-border/70 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button type="button" onClick={handleContinue} disabled={!canContinue}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {isSaving ? "Saving..." : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const APP_TYPE_OPTIONS: Array<{ id: string; label: string; icon: ReactNode; premiumFlag?: string; hint: string }> = [
  { id: "prototype", label: "Prototype", icon: <Wand2 className="size-3.5" />, hint: "Fast, exploratory build — fewer states, quick to iterate." },
  { id: "backend", label: "Backend", icon: <Database className="size-3.5" />, hint: "Generate Neon/Postgres, Prisma, and API routes alongside the UI." },
  { id: "web-app", label: "Web app", icon: <Layers className="size-3.5" />, hint: "A complete multi-page web application." },
  { id: "mobile-app", label: "Mobile app", icon: <Smartphone className="size-3.5" />, premiumFlag: "app-type-mobile", hint: "Mobile-first layout tuned for a native-app feel." },
  { id: "3d-webgl", label: "3D/WebGL", icon: <Box className="size-3.5" />, premiumFlag: "app-type-3d", hint: "Interactive Three.js scenes." },
  { id: "image", label: "Image", icon: <ImageIcon className="size-3.5" />, premiumFlag: "app-type-image", hint: "Generate imagery as part of the build." },
  { id: "video", label: "Video", icon: <Video className="size-3.5" />, premiumFlag: "app-type-video", hint: "Generate video content as part of the build." },
  { id: "app-stores", label: "App stores", icon: <Store className="size-3.5" />, premiumFlag: "app-type-stores", hint: "Package for iOS/Android app store submission." },
];

function AppTypeChips({
  value,
  onChange,
  flagEnabled,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  flagEnabled: (key: string) => boolean;
  disabled?: boolean;
}) {
  return (
    <div className="mx-auto mt-3 flex w-full max-w-[880px] flex-wrap items-center justify-center gap-2">
      {APP_TYPE_OPTIONS.map((option) => {
        const locked = option.premiumFlag ? !flagEnabled(option.premiumFlag) : false;
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            title={option.hint}
            disabled={disabled}
            onClick={() => {
              if (locked) {
                toast({ title: "Upgrade to unlock", description: `${option.label} builds are available on paid plans.` });
                return;
              }
              onChange(selected ? "" : option.id);
            }}
            className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 disabled:opacity-40 ${
              selected
                ? "border-white/60 bg-white/15 text-white"
                : locked
                  ? "border-white/10 text-zinc-600"
                  : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
            }`}
          >
            {option.icon}
            {option.label}
            {locked ? <Lock className="size-3 opacity-70" /> : null}
          </button>
        );
      })}
    </div>
  );
}


/* Sleek horizontal preset chips — compact, 6px-radius, drag-to-swipe with
 * edge-fade masks. Pointer drag works on desktop; native momentum on touch. */
function PresetChipsScroller({ onSelect }: { onSelect: (prompt: string) => void }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ active: boolean; startX: number; startLeft: number; moved: boolean }>({
    active: false,
    startX: 0,
    startLeft: 0,
    moved: false,
  });

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el) return;
    drag.current = { active: true, startX: event.clientX, startLeft: el.scrollLeft, moved: false };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el || !drag.current.active) return;
    const delta = event.clientX - drag.current.startX;
    if (Math.abs(delta) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startLeft - delta;
  };
  const endDrag = () => {
    drag.current.active = false;
  };

  return (
    <div className="mx-auto mt-3.5 w-full max-w-[880px] px-0.5">
      <div
        ref={scrollerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        className="flex cursor-grab snap-x gap-1.5 overflow-x-auto pb-0.5 select-none active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, transparent, #000 18px, #000 calc(100% - 18px), transparent)",
          maskImage:
            "linear-gradient(to right, transparent, #000 18px, #000 calc(100% - 18px), transparent)",
        }}
        role="group"
        aria-label="Prompt presets"
      >
        {PROMPT_CHIP_GROUPS.map((group) => (
          <button
            key={group.title}
            type="button"
            onClick={() => {
              if (drag.current.moved) return; // ignore click that ended a drag
              onSelect(group.prompt);
            }}
            className="shrink-0 snap-start rounded-[6px] border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[13px] font-medium whitespace-nowrap text-zinc-400 backdrop-blur-md transition-colors duration-150 hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
          >
            {group.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function PremiumPromptComposer({ value, onValueChange, onSend, isLoading, disabled, model, onModelChange, models, buildMode, onBuildModeChange, shadcnEnabled, onShadcnChange, webSearchEnabled, onWebSearchChange, deepThinkingEnabled, onDeepThinkingChange, canvasEnabled, onCanvasChange, backendEnabled, onBackendChange, styleId, onStyleIdChange, savedDesigns, onOpenDesignDialog, onSelectSavedDesign, selectedSavedDesignId, onAttach, attachmentReady, onImportGithub, savedPrompts, onSavePrompt, onUseSavedPrompt, flagEnabled }: { value: string; onValueChange: (value: string) => void; onSend: (value: string) => void; isLoading: boolean; disabled: boolean; model: string; onModelChange: (model: string) => void; models: any[]; buildMode: Mode; onBuildModeChange: (mode: Mode) => void; shadcnEnabled: boolean; onShadcnChange: (value: boolean) => void; webSearchEnabled: boolean; onWebSearchChange: (value: boolean) => void; deepThinkingEnabled: boolean; onDeepThinkingChange: (value: boolean) => void; canvasEnabled: boolean; onCanvasChange: (value: boolean) => void; backendEnabled: boolean; onBackendChange: (value: boolean) => void; styleId: SandboxStyleId; onStyleIdChange: (id: SandboxStyleId) => void; savedDesigns: SavedDesign[]; onOpenDesignDialog: () => void; onSelectSavedDesign: (design: SavedDesign) => void; selectedSavedDesignId?: string | null; onAttach: () => void; attachmentReady?: boolean; onImportGithub: () => void; savedPrompts: SavedPrompt[]; onSavePrompt: () => void; onUseSavedPrompt: (prompt: SavedPrompt) => void; flagEnabled: (key: string) => boolean }) {
  /* Phase 4 refresh: clean, quiet composer — single hairline border, no glow,
   * every optional feature gated by admin feature flags. */
  const hasValue = value.trim().length > 0 || attachmentReady;
  const variableCount = (value.match(/\{[^{}]+\}/g) || []).length;
  const [focused, setFocused] = useState(false);
  const placeholder = useTypewriterPlaceholder(!value && !focused);
  const promptLibraryOn = flagEnabled("prompt-library");
  const anyBuilderToggle = flagEnabled("web-search") || flagEnabled("deep-thinking") || flagEnabled("canvas-mode");
  return (
    <div className="w-full">
      <div className={`rounded-2xl border bg-zinc-950/60 text-white backdrop-blur-xl transition-colors duration-200 ${focused ? "border-white/25" : "border-white/10"}`}>
        <textarea
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (!disabled && hasValue) onSend(value); } }}
          placeholder={placeholder}
          aria-label="Describe what to build"
          disabled={disabled}
          rows={3}
          className="min-h-[96px] w-full resize-none rounded-t-2xl bg-transparent px-5 pb-3 pt-5 text-base leading-relaxed text-white outline-none placeholder:text-zinc-500 disabled:opacity-60"
        />
        {attachmentReady ? <div className="mx-5 mb-2 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-300">Attachment ready</div> : null}
        {variableCount > 0 ? <div className="flex flex-wrap items-center gap-1.5 px-4 pb-1.5 text-xs text-zinc-500"><span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-zinc-400">{variableCount} variables</span></div> : null}
        {promptLibraryOn && savedPrompts.length > 0 ? (
          <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {savedPrompts.slice(0, 5).map((item) => (
              <button key={item.id} type="button" onClick={() => onUseSavedPrompt(item)} className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200">
                {item.title}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex min-h-[54px] items-center justify-between gap-2 border-t border-white/[0.06] px-2.5 py-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                className="inline-flex size-10 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 disabled:opacity-40"
                aria-label="Open prompt actions"
              >
                <Plus className="size-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[min(86vw,340px)] rounded-xl border-white/10 bg-zinc-900 p-1.5 text-white shadow-lg">
              <DropdownMenuLabel className="text-xs text-zinc-500">Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={onAttach} className="gap-3"><Upload className="size-4" />Upload file</DropdownMenuItem>
              {flagEnabled("github-import") ? <DropdownMenuItem onClick={onImportGithub} className="gap-3"><Github className="size-4" />Import from GitHub</DropdownMenuItem> : null}
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuLabel className="text-xs text-zinc-500">Mode</DropdownMenuLabel>
              <ModeItem mode="agent" current={buildMode} label="Agent" description="Build the app, write files, validate preview, then self-correct once if needed." icon={<Bot className="size-4" />} onSelect={onBuildModeChange} />
              <ModeItem mode="plan" current={buildMode} label="Plan" description="Create a buildability plan only: possible, not possible, backend, files, and steps." icon={<ListChecks className="size-4" />} onSelect={onBuildModeChange} />
              <ModeItem mode="ask" current={buildMode} label="Ask" description="Answer questions without writing a full artifact." icon={<MessageSquare className="size-4" />} onSelect={onBuildModeChange} />
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuLabel className="text-xs text-zinc-500">Builder</DropdownMenuLabel>
              <ToggleItem label="shadcn UI" icon={<Palette className="size-4" />} checked={shadcnEnabled} onChange={onShadcnChange} />
              {anyBuilderToggle ? <DropdownMenuSeparator className="bg-white/10" /> : null}
              {flagEnabled("web-search") ? <ToggleItem label="Web search" icon={<SearchIcon className="size-4" />} checked={webSearchEnabled} onChange={onWebSearchChange} /> : null}
              {flagEnabled("deep-thinking") ? <ToggleItem label="Deep thinking" icon={<Brain className="size-4" />} checked={deepThinkingEnabled} onChange={onDeepThinkingChange} /> : null}
              {flagEnabled("canvas-mode") ? <ToggleItem label="Canvas" icon={<ImageIcon className="size-4" />} checked={canvasEnabled} onChange={onCanvasChange} /> : null}
              <ToggleItem label="Backend" icon={<Database className="size-4" />} checked={backendEnabled} onChange={onBackendChange} />
              {promptLibraryOn ? (
                <>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuLabel className="text-xs text-zinc-500">Prompts</DropdownMenuLabel>
                  <DropdownMenuItem onClick={onSavePrompt} disabled={!value.trim()} className="gap-3"><Sparkles className="size-4" />Save this prompt</DropdownMenuItem>
                  <DropdownMenuItem asChild className="gap-3"><Link href="/library"><Layers className="size-4" />Prompt library</Link></DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          {flagEnabled("style-picker") ? (
            <DesignPicker
              value={styleId}
              onChange={onStyleIdChange}
              disabled={disabled}
              savedDesigns={savedDesigns}
              onOpenDesignDialog={onOpenDesignDialog}
              onSelectSavedDesign={onSelectSavedDesign}
              selectedSavedDesignId={selectedSavedDesignId}
            />
          ) : null}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2">
            <label className="sr-only" htmlFor="home-model-select">Model</label>
            <div className="group relative inline-flex max-w-[46vw] md:min-w-[200px]">
              <select
                id="home-model-select"
                value={model}
                onChange={(event) => onModelChange(event.target.value)}
                disabled={disabled}
                className="peer h-9 w-full appearance-none rounded-full border-0 bg-transparent py-0 pl-0 pr-6 text-sm text-zinc-500 outline-none transition-colors hover:text-zinc-300 focus:text-zinc-200 disabled:opacity-50"
              >
                {models.map((m: any) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-zinc-600 transition-colors group-hover:text-zinc-400" aria-hidden="true" />
            </div>
            {flagEnabled("voice-input") ? <SpeechInput onTranscriptionChange={(text) => onValueChange(transcriptJoin(value, text))} disabled={disabled} className="size-10 rounded-full border-0 bg-transparent text-zinc-500 transition-colors hover:bg-transparent hover:text-zinc-300" aria-label="Dictate prompt" /> : null}
            <button type="button" onClick={() => onSend(value)} disabled={disabled || !hasValue} className="inline-flex size-10 items-center justify-center rounded-full bg-white text-zinc-950 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 disabled:opacity-30" aria-label="Start build">{isLoading ? <DotFlow size={5} label="Starting build" /> : <ArrowUp className="size-5" />}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Landing sections (scroll-reveal via framer-motion) ---------- */

const revealVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const prefersReducedMotion = useReducedMotion();
  if (prefersReducedMotion) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={revealVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.55, delay, ease: [0.21, 0.47, 0.32, 0.98] }}>
      {children}
    </motion.div>
  );
}

const HOW_IT_WORKS = [
  { icon: Wand2, step: "01", title: "Prompt", body: "Describe the product in plain language. Pick a style preset, model, and build mode — the agent plans routes, files, and states for you." },
  { icon: Eye, step: "02", title: "Preview", body: "Watch a live, interactive preview compile in seconds. Every button, form, and route works — iterate with follow-up prompts as patches." },
  { icon: Rocket, step: "03", title: "Ship", body: "Export complete, typed Next.js code with real file-system routing, ready to push to GitHub and deploy anywhere." },
] as const;

const FEATURE_GRID = [
  { icon: Layers, title: "Real multi-page routing", body: "Generated apps use genuine App Router file structure — layouts, nested routes, and navigation that actually navigates." },
  { icon: Palette, title: "Five premium style presets", body: "Modern SaaS, Editorial, Warm, Vibrant, and Glass. Consistent tokens across light and dark mode, never flat gray." },
  { icon: Code2, title: "Production-grade output", body: "Typed TSX, shadcn/ui primitives, working states, empty states, and accessibility baked in from the first render." },
  { icon: Zap, title: "3D & WebGL ready", body: "Three.js with react-three-fiber and drei is supported out of the box — interactive scenes with orbit controls, no stubs." },
  { icon: Sparkles, title: "Agentic self-correction", body: "The agent validates the preview after building and repairs compile or runtime issues in the same run." },
  { icon: Github, title: "GitHub import & remix", body: "Import a public repository into a live chat, preview it instantly, and remix it with prompts." },
] as const;

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-6xl px-4 py-20 md:py-28">
      <Reveal>
        <Badge variant="outline" className="mb-4 rounded-full border-indigo-400/40 px-3 py-1 text-xs text-indigo-300">How it works</Badge>
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-white md:text-5xl">From idea to running app in three steps</h2>
      </Reveal>
      <div className="mt-10 grid gap-4 md:mt-14 md:grid-cols-3 md:gap-6">
        {HOW_IT_WORKS.map((item, index) => (
          <Reveal key={item.step} delay={index * 0.12}>
            <Card className="h-full rounded-2xl border-white/10 bg-white/[0.04] shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:border-white/20">
              <CardContent className="flex h-full flex-col gap-4 p-6">
                <div className="flex items-center justify-between">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300"><item.icon className="size-5" /></span>
                  <span className="text-sm font-semibold tracking-widest text-zinc-600">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-white">{item.title}</h3>
                <p className="text-sm leading-6 text-zinc-400">{item.body}</p>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function FeatureGridSection() {
  return (
    <section id="built-for-production" className="mx-auto w-full max-w-6xl px-4 py-20 md:py-28">
      <Reveal>
        <Badge variant="outline" className="mb-4 rounded-full border-indigo-400/40 px-3 py-1 text-xs text-indigo-300">Built for production</Badge>
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-white md:text-5xl">Not a demo generator. A product builder.</h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-zinc-400">Every generated app compiles first, works second, and looks premium third — with real routing, real states, and real dark mode.</p>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 md:mt-14 lg:grid-cols-3 md:gap-6">
        {FEATURE_GRID.map((item, index) => (
          <Reveal key={item.title} delay={(index % 3) * 0.1}>
            <Card className="h-full rounded-2xl border-white/10 bg-white/[0.04] shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:border-white/20">
              <CardContent className="flex h-full flex-col gap-3 p-6">
                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-white/[0.06] text-indigo-300"><item.icon className="size-5" /></span>
                <h3 className="text-base font-semibold tracking-tight text-white">{item.title}</h3>
                <p className="text-sm leading-6 text-zinc-400">{item.body}</p>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function PoweredBySection() {
  return (
    <section id="powered-by" className="mx-auto w-full max-w-6xl px-4 py-20 md:py-28">
      <Reveal>
        <Card className="overflow-hidden rounded-3xl border-white/10 bg-gradient-to-br from-indigo-500/15 via-transparent to-fuchsia-500/10">
          <CardContent className="flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-12">
            <div className="max-w-xl">
              <Badge variant="outline" className="mb-4 rounded-full border-indigo-400/40 px-3 py-1 text-xs text-indigo-300">Powered by ChinnaLLM</Badge>
              <h2 className="text-2xl font-bold tracking-tight text-white md:text-4xl">Agentic generation with deep thinking, web search, and plan mode</h2>
              <p className="mt-4 text-sm leading-7 text-zinc-400 md:text-base">Choose the model, toggle deep reasoning for complex builds, run plan mode to scope before generating, and let the agent self-correct against the live preview.</p>
            </div>
            <Button asChild size="lg" className="h-12 shrink-0 rounded-xl bg-indigo-500 px-6 text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-400">
              <Link href="#prompt-composer">Start building</Link>
            </Button>
          </CardContent>
        </Card>
      </Reveal>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-white/10 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-zinc-500">Chinna-Coder — Build. Preview. Ship.</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-500">
          <Link href="/gallery" className="transition hover:text-zinc-200">Gallery</Link>
          <Link href="/library" className="transition hover:text-zinc-200">Library</Link>
          <Link href="/settings" className="transition hover:text-zinc-200">Settings</Link>
          <Link href="/dashboard" className="transition hover:text-zinc-200">Dashboard</Link>
        </nav>
      </div>
    </footer>
  );
}

export default function HomePageClient() {
  const context = use(Context);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prompt, setPrompt] = useState("");
  const [buildMode, setBuildMode] = useState<Mode>("agent");
  const [model, setModel] = useState("zai-org/GLM-5");
  const { isEnabled: flagEnabled } = useFeatureFlags();
  const [shadcnEnabled, setShadcnEnabled] = useState(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [deepThinkingEnabled, setDeepThinkingEnabled] = useState(false);
  const [canvasEnabled, setCanvasEnabled] = useState(false);
  const [backendEnabled, setBackendEnabled] = useState(false);
  const [appTypeHint, setAppTypeHint] = useState("");
  const handleAppTypeChange = (id: string) => {
    setAppTypeHint(id);
    if (id === "backend") setBackendEnabled(true);
    else if (appTypeHint === "backend") setBackendEnabled(false);
  };
  const [styleId, setStyleId] = useState<SandboxStyleId>(DEFAULT_STYLE_ID);
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [designDialogOpen, setDesignDialogOpen] = useState(false);
  const [selectedDesignPresetId, setSelectedDesignPresetId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/design-presets", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.presets) setSavedDesigns(data.presets); })
      .catch(() => {});
  }, []);
  const [isSubmitting, startTransition] = useTransition();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [githubDialogOpen, setGithubDialogOpen] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [githubError, setGithubError] = useState("");
  const [isGithubImporting, setIsGithubImporting] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const visibleModels = MODELS.filter((item) => !item.hidden);

  useEffect(() => { let cancelled = false; async function loadBuilderSettings() { try { const response = await fetch("/api/user-settings", { cache: "no-store" }); if (!response.ok) return; const data = await response.json().catch(() => null); const settings = data?.settings; if (!settings || cancelled) return; if (typeof settings.defaultModel === "string") setModel(settings.defaultModel); if (["ask", "plan", "agent"].includes(settings.defaultMode)) setBuildMode(settings.defaultMode); if (typeof settings.shadcnDefault === "boolean") setShadcnEnabled(settings.shadcnDefault); if (typeof settings.webSearchDefault === "boolean") setWebSearchEnabled(settings.webSearchDefault); if (typeof settings.deepThinkingDefault === "boolean") setDeepThinkingEnabled(settings.deepThinkingDefault); if (typeof settings.canvasDefault === "boolean") setCanvasEnabled(settings.canvasDefault); if (typeof settings.backendDefault === "boolean") setBackendEnabled(settings.backendDefault); if (typeof settings.styleDefault === "string") setStyleId(settings.styleDefault as SandboxStyleId); if (typeof settings.githubRepositoryUrl === "string") setGithubUrl(settings.githubRepositoryUrl); } catch {} } loadBuilderSettings(); return () => { cancelled = true; }; }, []);

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
    startTransition(async () => {
      try {
        const appTypeHintText: Record<string, string> = {
          prototype: "Build a fast exploratory prototype: fewer states and edge cases, prioritize speed of iteration over completeness.",
          "web-app": "Build a complete multi-page web application with proper routing between distinct views.",
          "mobile-app": "Build with a mobile-first layout: bottom navigation, large tap targets, safe-area handling, native-app feel.",
          "3d-webgl": "Include an interactive Three.js/WebGL scene as a core part of the experience.",
          "app-stores": "Structure the app to be packageable for iOS/Android app store submission (Capacitor-compatible layout, native-feeling navigation).",
        };
        const featureHints = [
          webSearchEnabled ? "Web search option is enabled. Add source-aware UI states only when real backend data is provided." : "",
          canvasEnabled ? "Canvas option is enabled. Include an editable visual workspace when relevant." : "",
          backendEnabled ? "Backend mode is enabled. Generate Neon/Postgres, Prisma, API routes, and env setup files where the app requires persistence." : "",
          appTypeHint && appTypeHintText[appTypeHint] ? appTypeHintText[appTypeHint] : "",
        ].filter(Boolean);
        const finalPrompt = [cleanPrompt || "Build from the uploaded attachment.", ...featureHints].join("\n\n");
        const aiDetection = requiresAI(finalPrompt);
        const screenshotUrl = attachments.find((item) => item.kind === "image" && item.url)?.url;
        const response = await fetch("/api/create-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: finalPrompt,
            model,
            quality: "high",
            mode: buildMode,
            shadcn: shadcnEnabled,
            styleId,
            designPresetId: selectedDesignPresetId || undefined,
            screenshotUrl,
            attachments,
            aiCapabilities: aiDetection.capabilities,
            backendMode: backendEnabled,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.chatId || !data?.lastMessageId) throw new Error(data?.error || "Please check auth/API configuration.");

        const params = new URLSearchParams({ generate: data.lastMessageId, model, quality: "high" });
        if (deepThinkingEnabled) params.set("reasoning", "1");

        if (aiDetection.detected) {
          context.setStreamPromise(undefined);
          router.push(`/chats/${data.chatId}?${params.toString()}`);
          return;
        }

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
        router.push(`/chats/${data.chatId}?${params.toString()}`);
      } catch (error) {
        toast({ title: "Could not start build", description: error instanceof Error ? error.message : "Please check configuration.", variant: "destructive" });
      }
    });
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

  const heroWordAnimation = prefersReducedMotion
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
    : { initial: { opacity: 0, y: 26 }, animate: { opacity: 1, y: 0 } };

  return (
    <HomeShell>
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <section id="hero" className="relative flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
          <div className="relative flex min-h-dvh w-full flex-col">
            <Header hideLogo />
            <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24 pt-8 md:pb-32">
              <div className="flex w-full max-w-[920px] -translate-y-2 flex-col items-center md:-translate-y-6">
                <motion.div {...heroWordAnimation} transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}>
                  <Badge variant="outline" className="mb-6 rounded-full border-white/15 bg-white/[0.05] px-4 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm">
                    Now with 5 premium output styles & Three.js
                  </Badge>
                </motion.div>
                <h1 className="mb-10 text-center text-[38px] font-bold leading-[1.02] tracking-tight text-foreground sm:text-[44px] md:text-[80px] lg:text-[92px]">
                  {["Build.", "Preview.", "Ship."].map((word, index) => (
                    <motion.span
                      key={word}
                      className={`inline-block ${index === 1 ? "mx-2 text-foreground md:mx-6" : ""}`}
                      {...heroWordAnimation}
                      transition={{ duration: 0.7, delay: prefersReducedMotion ? 0 : 0.1 + index * 0.14, ease: [0.21, 0.47, 0.32, 0.98] }}
                    >
                      {word}
                    </motion.span>
                  ))}
                </h1>
                <motion.p {...heroWordAnimation} transition={{ duration: 0.6, delay: prefersReducedMotion ? 0 : 0.5 }} className="mb-10 max-w-xl text-center text-base leading-7 text-zinc-400 md:text-lg">
                  Describe any product. Get a working, premium, multi-page app with a live preview — in one prompt.
                </motion.p>
                <motion.div id="prompt-composer" className="relative w-full" {...heroWordAnimation} transition={{ duration: 0.7, delay: prefersReducedMotion ? 0 : 0.62, ease: [0.21, 0.47, 0.32, 0.98] }}>
                  <PremiumPromptComposer value={prompt} onValueChange={setPrompt} onSend={handlePromptSend} isLoading={isSubmitting} disabled={isSubmitting || isGithubImporting} model={model} onModelChange={setModel} models={visibleModels} buildMode={buildMode} onBuildModeChange={setBuildMode} shadcnEnabled={shadcnEnabled} onShadcnChange={setShadcnEnabled} webSearchEnabled={webSearchEnabled} onWebSearchChange={setWebSearchEnabled} deepThinkingEnabled={deepThinkingEnabled} onDeepThinkingChange={setDeepThinkingEnabled} canvasEnabled={canvasEnabled} onCanvasChange={setCanvasEnabled} backendEnabled={backendEnabled} onBackendChange={setBackendEnabled} styleId={styleId} onStyleIdChange={(id) => { setStyleId(id); setSelectedDesignPresetId(null); }} savedDesigns={savedDesigns} onOpenDesignDialog={() => setDesignDialogOpen(true)} onSelectSavedDesign={(design) => setSelectedDesignPresetId(design.id)} selectedSavedDesignId={selectedDesignPresetId} onAttach={() => fileInputRef.current?.click()} attachmentReady={attachments.length > 0} onImportGithub={() => setGithubDialogOpen(true)} savedPrompts={savedPrompts} onSavePrompt={saveCurrentPrompt} onUseSavedPrompt={(item) => setPrompt(item.body)} flagEnabled={flagEnabled} />
                  <DesignSystemDialog
                    open={designDialogOpen}
                    onOpenChange={setDesignDialogOpen}
                    onSaved={(design) => {
                      setSavedDesigns((prev) => [design, ...prev]);
                      setSelectedDesignPresetId(design.id);
                    }}
                  />
                  <AppTypeChips value={appTypeHint} onChange={handleAppTypeChange} flagEnabled={flagEnabled} disabled={isSubmitting || isGithubImporting} />
                  <PresetChipsScroller onSelect={setPrompt} />
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        <HowItWorksSection />
        <FeatureGridSection />
        <PoweredBySection />

        {/* Featured templates (existing grid, restyled container) */}
        {flagEnabled("templates") ? (
        <section id="featured-templates" className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-20 pt-4">
          <Reveal>
            <Card className="rounded-3xl border-white/10 bg-white/[0.03] px-4 py-4 shadow-sm backdrop-blur-md md:px-6 md:py-6">
              <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-white">Featured templates</h2>
                  <p className="mt-1 text-sm text-zinc-400">Open a responsive preview, then remix in the builder.</p>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                  <Link href="/gallery">View gallery</Link>
                </Button>
              </div>
              <div className="mt-4"><FeaturedAppsGrid apps={[]} limit={6} compact /></div>
            </Card>
          </Reveal>
        </section>
        ) : null}

        <LandingFooter />
      </div>
      <input ref={fileInputRef} className="hidden" type="file" title="Attach file" aria-label="Attach file" accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md,.json,.csv,.zip" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleAttachmentUpload(file); if (event.currentTarget) event.currentTarget.value = ""; }} />
      <Dialog open={githubDialogOpen} onOpenChange={(open) => { if (!isGithubImporting) setGithubDialogOpen(open); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-xl rounded-3xl border-border/70 bg-background p-0 shadow-2xl">
          <DialogHeader className="border-b border-border/70 px-5 pb-4 pt-5 text-left">
            <DialogTitle className="flex items-center gap-2 text-base"><Github className="size-4" />Import from GitHub</DialogTitle>
            <DialogDescription>Paste a public repository URL. Chinna-Coder will import files, create a chat, and open the live preview.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4 px-5 py-5" onSubmit={(event) => { event.preventDefault(); submitGithubImport(); }}>
            <div className="space-y-2">
              <label htmlFor="github-url" className="text-sm font-medium">Repository URL</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input id="github-url" autoFocus value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} placeholder="https://github.com/pichimail/llamacoder" disabled={isGithubImporting} className="h-11 rounded-xl" />
                <Button type="submit" disabled={isGithubImporting || !githubUrl.trim()} className="h-11 rounded-xl px-5">{isGithubImporting ? <Loader2 className="size-4 animate-spin" /> : null}{isGithubImporting ? "Importing" : "Import"}</Button>
              </div>
              {githubError ? <p className="text-sm text-destructive">{githubError}</p> : null}
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">Supports public GitHub repositories. Private repository import should be connected through account integrations before use.</div>
          </form>
          <DialogFooter className="border-t border-border/70 px-5 py-4">
            <Button type="button" variant="outline" onClick={() => setGithubDialogOpen(false)} disabled={isGithubImporting}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HomeShell>
  );
}
