"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  Bot,
  Box,
  Cable,
  Code2,
  Database,
  ExternalLink,
  FileCode2,
  FolderArchive,
  Github,
  Image as ImageIcon,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  LogIn,
  Mic,
  Paperclip,
  Plus,
  Search,
  Send,
  ServerCog,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  UploadCloud,
} from "lucide-react";
import Header from "@/components/header";
import { OptionDropdown } from "@/components/option-dropdown";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { MarketingSections } from "@/components/marketing/marketing-sections";
import { MODELS } from "@/lib/constants";
import { SANDBOX_STYLE_PRESETS, DEFAULT_STYLE_ID, type SandboxStyleId } from "@/lib/sandbox-theme";
import { requiresAI } from "@/lib/ai-detection";
import { toast } from "@/hooks/use-toast";
import { Context } from "./providers";
import { McpServerDialog } from "@/components/mcp/mcp-server-dialog";
import { continueWithGoogle } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { McpServerDialog } from "@/components/mcp/mcp-server-dialog";
import { RichFooter } from "@/components/rich-footer";
import { Textarea } from "@/components/ui/textarea";
import { MODELS, type ModelConfig } from "@/lib/constants";
import { DEFAULT_STYLE_ID, SANDBOX_STYLE_PRESETS, type SandboxStyleId } from "@/lib/sandbox-theme";
import { requiresAI } from "@/lib/ai-detection";
import { BYOK_PROVIDERS, type BYOKProviderId } from "@/lib/chinnallm/provider-catalog";
import { toast } from "@/hooks/use-toast";

type Attachment = { kind: "image" | "file"; filename: string; url?: string; size?: number };
type Mode = "ask" | "plan" | "agent";
type AttachedMcpServer = { id: string; name: string; url?: string; transport?: string };

const appTypeHints = [
  { id: "prototype", label: "Prototype", icon: Sparkles },
  { id: "web-app", label: "Web app", icon: Layers },
  { id: "3d-webgl", label: "WebGL", icon: Box },
  { id: "backend", label: "Backend", icon: Database },
] as const;

const quickPresetPrompts = [
  "Build a polished SaaS dashboard with analytics, filters, and admin states.",
  "Create a premium landing page with strong product imagery, pricing, and docs links.",
  "Build an auth flow with sign in, sign up, reset password, verification, and responsive forms.",
  "Create a 3D/WebGL product viewer with orbit controls and responsive layout.",
  "Build a backend-ready app with Prisma models, API routes, settings, and admin controls.",
] as const;

const modelCategoryDefinitions = [
  {
    title: "Fast and cost-efficient",
    description: "Default for short iterations, fixes, and lightweight prototypes.",
    values: [
      "openrouter/openrouter/free",
      "openrouter/qwen/qwen3-coder-flash",
      "openrouter/deepseek/deepseek-v4-flash",
      "openrouter/minimax/minimax-m3",
      "openrouter/z-ai/glm-5.1",
      "zai-org/GLM-5.1",
    ],
  },
  {
    title: "Best UI/UX and full Responsive Prototypes",
    description: "Stronger visual systems, app shells, responsive states, and polished components.",
    values: [
      "zai-org/GLM-5.2",
      "openrouter/z-ai/glm-5.2",
      "openrouter/anthropic/claude-sonnet-5",
      "openrouter/qwen/qwen3-coder-plus",
      "openrouter/moonshotai/kimi-k2.7-code",
      "openrouter/deepseek/deepseek-v4-pro",
    ],
  },
  {
    title: "Versatile and highly intelligent",
    description: "Balanced choices for multi-page products, planning, and uncertain prompts.",
    values: [
      "openrouter/auto",
      "openrouter/openrouter/fusion",
      "openrouter/qwen/qwen3.7-plus",
      "openrouter/qwen/qwen3.7-max",
      "openrouter/moonshotai/kimi-k2-thinking",
      "openrouter/deepseek/deepseek-v3.2",
    ],
  },
  {
    title: "Best for building 3D, GL, GSAP",
    description: "Use for WebGL scenes, motion-heavy landing pages, and animation systems.",
    values: [
      "openrouter/anthropic/claude-sonnet-5",
      "openrouter/qwen/qwen3-coder-plus",
      "openrouter/moonshotai/kimi-k2.7-code",
      "openrouter/z-ai/glm-5.2",
      "openrouter/deepseek/deepseek-v4-pro",
    ],
  },
  {
    title: "Most powerful at complex tasks",
    description: "Architecture-heavy, backend-heavy, or large refactor builds.",
    values: [
      "openrouter/anthropic/claude-opus-4.8",
      "openrouter/anthropic/claude-opus-4.8-fast",
      "openrouter/anthropic/claude-sonnet-5",
      "openrouter/openrouter/pareto-code",
      "openrouter/qwen/qwen3-max-thinking",
      "openrouter/sakana/fugu-ultra",
    ],
  },
] as const;

const providerUsageGoals = [
  "Chat and app assistants",
  "Code generation",
  "Vision or image workflows",
  "Video, music, or large media tasks",
  "Embeddings, search, and retrieval",
] as const;

const categorizedModelValues = new Set<string>(
  modelCategoryDefinitions.flatMap((category) => [...category.values]),
);

const sections = [
  {
    eyebrow: "01 / Agent workflow",
    title: "The build is visible while it happens.",
    body: "Queue, plan, terminal, reasoning summary, checkpoints, confirmations, and environment variables stay close to the composer so each app request feels inspectable.",
    icon: Bot,
  },
  {
    eyebrow: "02 / Product shape",
    title: "Prompts become routes, not one-screen demos.",
    body: "Dashboards, admin panels, marketing pages, tools, CRMs, and 3D scenes are treated as product structures with real navigation and responsive states.",
    icon: FileCode2,
  },
  {
    eyebrow: "03 / Backend-ready",
    title: "When data matters, the output plans for it.",
    body: "Backend mode can guide Prisma schemas, API routes, env variables, storage, MCP tools, and ChinnaLLM calls through platform-safe seams.",
    icon: Database,
  },
  {
    eyebrow: "04 / Design direction",
    title: "The UI adapts to the requested style.",
    body: "Buttons, inputs, surfaces, and motion patterns shift with the selected design direction instead of repeating the same static generated recipe.",
    icon: Layers,
  },
  {
    eyebrow: "05 / Preview loop",
    title: "Every iteration stays attached to the artifact.",
    body: "Continue from chat, inspect files, restore checkpoints, attach screenshots, and let the builder patch only what needs to change.",
    icon: TerminalSquare,
  },
  {
    eyebrow: "06 / Guardrails",
    title: "Public site is open. Workspace is authenticated.",
    body: "Marketing, docs, privacy, and terms stay public; chats, dashboard, credits, settings, and project workspace access require sign-in.",
    icon: ShieldCheck,
  },
];

function ScrambleText({ children }: { children: string }) {
  const [text, setText] = useState(children);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  function scramble() {
    let frame = 0;
    const total = 12;
    const timer = window.setInterval(() => {
      frame += 1;
      setText(
        children
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (frame > total || index < frame / 1.4) return children[index];
            return alphabet[Math.floor(Math.random() * alphabet.length)];
          })
          .join(""),
      );
      if (frame > total) window.clearInterval(timer);
    }, 28);
  }

  return <span onMouseEnter={scramble}>{text}</span>;
}

function AuthenticatedSiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-lime-300/10 bg-[#070806]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-stone-50">
          <span className="grid size-9 place-items-center rounded-lg border border-lime-300/20 bg-lime-300/10 text-sm font-semibold text-lime-200 shadow-[0_0_32px_rgba(190,242,100,0.12)]">C</span>
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">Chinna-Coder</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-stone-400 md:flex">
          <Link href="/features" className="hover:text-lime-100"><ScrambleText>Features</ScrambleText></Link>
          <Link href="/docs" className="hover:text-lime-100"><ScrambleText>Docs</ScrambleText></Link>
          <Link href="/about" className="hover:text-lime-100"><ScrambleText>About</ScrambleText></Link>
          <Link href="/pricing" className="hover:text-lime-100"><ScrambleText>Pricing</ScrambleText></Link>
        </nav>
        <Link href="/dashboard" className="rounded-lg border border-lime-300/20 px-3 py-2 text-sm font-medium text-lime-100 transition hover:bg-lime-300/10">
          Dashboard
        </Link>
      </div>
    </header>
  );
}

function ModelPickerDialog({
  open,
  onOpenChange,
  selectedModel,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedModel: string;
  onSelect: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const visibleModels = MODELS.filter((item) => !item.hidden);
  const modelMap = new Map(visibleModels.map((item) => [item.value, item]));
  const normalizedQuery = query.trim().toLowerCase();
  const selected = visibleModels.find((item) => item.value === selectedModel);

  const uncategorized = visibleModels.filter((item) => !categorizedModelValues.has(item.value));
  const categories = [
    ...modelCategoryDefinitions.map((category) => ({
      ...category,
      models: category.values.map((value) => modelMap.get(value)).filter((item): item is ModelConfig => Boolean(item)),
    })),
    {
      title: "All other available models",
      description: "Visible fallback and provider-specific models that are currently configured.",
      values: uncategorized.map((item) => item.value),
      models: uncategorized,
    },
  ].map((category) => ({
    ...category,
    models: category.models.filter((item) => {
      if (!item) return false;
      if (!normalizedQuery) return true;
      return [item.label, item.value, item.nativeModel, item.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    }),
  })).filter((category) => category.models.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86dvh] max-w-3xl overflow-hidden rounded-[28px] border-white/12 bg-[#0c0d0b] p-0 text-stone-100 shadow-2xl shadow-black/70">
        <div className="relative">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_26%_0%,rgba(190,242,100,0.20),transparent_60%),radial-gradient(circle_at_78%_8%,rgba(251,191,36,0.16),transparent_55%)]" />
          <div className="relative border-b border-white/10 p-5 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl tracking-tight text-stone-50">Choose the build model</DialogTitle>
              <DialogDescription className="text-stone-400">
                Search live configured models, then pick by task type. Current model: {selected?.label ?? selectedModel}.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 focus-within:border-lime-300/45">
              <Search className="size-4 text-stone-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search models, providers, or use cases..."
                className="min-w-0 flex-1 bg-transparent text-sm text-stone-100 placeholder:text-stone-500 outline-none"
              />
            </div>
          </div>
          <div className="max-h-[58dvh] space-y-5 overflow-y-auto p-4 sm:p-6">
            {categories.map((category) => (
              <section key={category.title} className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-lime-100">{category.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-stone-500">{category.description}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {category.models.map((item) => (
                    <button
                      key={`${category.title}-${item.value}`}
                      type="button"
                      onClick={() => {
                        onSelect(item.value);
                        onOpenChange(false);
                      }}
                      className={`group rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-200/50 ${
                        selectedModel === item.value
                          ? "border-lime-300/55 bg-lime-300/[0.10] shadow-[0_0_34px_rgba(190,242,100,0.10)]"
                          : "border-white/10 bg-white/[0.035] hover:border-amber-200/35 hover:bg-amber-200/[0.055]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-stone-50">{item.label}</p>
                          <p className="mt-1 text-xs text-stone-500">{item.nativeModel}</p>
                        </div>
                        <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-stone-400">
                          {item.provider}
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-stone-400">{item.description ?? "Available through the configured provider route."}</p>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AIIntegrationDialog({
  open,
  onOpenChange,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (integration: { provider: BYOKProviderId | "chinnallm"; model: string; goal: string }) => void;
}) {
  const [providerId, setProviderId] = useState<BYOKProviderId | "chinnallm">("chinnallm");
  const [apiKey, setApiKey] = useState("");
  const [goal, setGoal] = useState<(typeof providerUsageGoals)[number]>(providerUsageGoals[0]);
  const [modelValue, setModelValue] = useState("openrouter/auto");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const selectedProvider = BYOK_PROVIDERS.find((provider) => provider.id === providerId);
  const needsKey = providerId !== "chinnallm";

  async function testKey() {
    if (!needsKey) {
      setResult({ ok: true, message: "ChinnaLLM will use OpenRouter free/auto fallback. No user key required." });
      return;
    }
    setTesting(true);
    setResult(null);
    try {
      const response = await fetch("/api/chinnallm/byok/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId, key: apiKey.trim() }),
      });
      const data = await response.json().catch(() => null);
      setResult({
        ok: response.ok && data?.ok,
        message: data?.message || data?.error || "Could not test this key.",
      });
    } catch {
      setResult({ ok: false, message: "Could not reach the provider key test endpoint." });
    } finally {
      setTesting(false);
    }
  }

  async function saveAndApply() {
    setSaving(true);
    setResult(null);
    try {
      if (needsKey) {
        const response = await fetch("/api/chinnallm/byok", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: providerId,
            key: apiKey.trim(),
            label: `${selectedProvider?.shortName ?? providerId} build key`,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Could not store this provider key.");
      }
      onApply({ provider: providerId, model: modelValue, goal });
      onOpenChange(false);
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : "Could not save this integration." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] max-w-3xl overflow-hidden rounded-[28px] border-white/12 bg-[#0c0d0b] p-0 text-stone-100 shadow-2xl shadow-black/70">
        <div className="relative">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_22%_0%,rgba(190,242,100,0.18),transparent_58%),radial-gradient(circle_at_80%_4%,rgba(251,191,36,0.16),transparent_56%)]" />
          <div className="relative border-b border-white/10 p-5 sm:p-6">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs font-medium text-lime-100">
              <KeyRound className="size-3.5" />
              Provider keys are tested server-side
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl tracking-tight text-stone-50">Add AI integration</DialogTitle>
              <DialogDescription className="text-stone-400">
                Choose ChinnaLLM fallback or bring a provider key. The app will only wire the provider you choose.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="max-h-[58dvh] space-y-5 overflow-y-auto p-5 sm:p-6">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => {
                  setProviderId("chinnallm");
                  setModelValue("openrouter/auto");
                  setResult(null);
                }}
                className={`rounded-2xl border p-3 text-left transition ${providerId === "chinnallm" ? "border-lime-300/50 bg-lime-300/10" : "border-white/10 bg-white/[0.035] hover:border-lime-300/30"}`}
              >
                <span className="grid size-9 place-items-center rounded-xl border border-lime-300/25 bg-lime-300/10 text-sm font-bold text-lime-100">C</span>
                <span className="mt-3 block text-sm font-semibold text-stone-50">ChinnaLLM</span>
                <span className="mt-1 block text-xs text-stone-500">OpenRouter free/auto fallback</span>
              </button>
              {BYOK_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => {
                    setProviderId(provider.id);
                    setModelValue(provider.defaultModel);
                    setResult(null);
                  }}
                  className={`rounded-2xl border p-3 text-left transition ${providerId === provider.id ? "border-lime-300/50 bg-lime-300/10" : "border-white/10 bg-white/[0.035] hover:border-lime-300/30"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={provider.logoUrl} alt="" className="size-9 rounded-xl border border-white/10 bg-white/90 p-1" />
                  <span className="mt-3 block text-sm font-semibold text-stone-50">{provider.shortName}</span>
                  <span className="mt-1 block text-xs text-stone-500">{provider.label}</span>
                </button>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-200/75">Usage goal</label>
                <select value={goal} onChange={(event) => setGoal(event.target.value as (typeof providerUsageGoals)[number])} className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-3 text-sm text-stone-100 outline-none focus:border-lime-300/45">
                  {providerUsageGoals.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-200/75">Preferred model route</label>
                <select value={modelValue} onChange={(event) => setModelValue(event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-3 text-sm text-stone-100 outline-none focus:border-lime-300/45">
                  <option value="openrouter/auto">OpenRouter Auto</option>
                  <option value="openrouter/openrouter/free">OpenRouter Free</option>
                  <option value="openrouter/anthropic/claude-sonnet-5">Claude Sonnet 5</option>
                  <option value="openrouter/qwen/qwen3-coder-plus">Qwen 3 Coder Plus</option>
                  <option value="openrouter/sakana/fugu-ultra">Sakana Fugu Ultra</option>
                  {selectedProvider ? <option value={selectedProvider.defaultModel}>{selectedProvider.defaultModel}</option> : null}
                </select>
              </div>
            </div>

            {needsKey ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="provider-api-key" className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-200/75">API key</label>
                  {selectedProvider ? (
                    <a href={selectedProvider.apiKeyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-amber-100 hover:text-amber-50">
                      Get {selectedProvider.shortName} key <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </div>
                <Input
                  id="provider-api-key"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  type="password"
                  placeholder={selectedProvider?.placeholder ?? "Provider API key"}
                  className="mt-2 h-12 rounded-2xl border-white/10 bg-black/35 text-stone-100 placeholder:text-stone-600 focus-visible:ring-lime-200/35"
                />
                <p className="mt-2 text-xs leading-5 text-stone-500">Keys are stored encrypted through the existing ChinnaLLM BYOK route after you apply.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-lime-300/18 bg-lime-300/[0.07] p-4 text-sm leading-6 text-lime-50">
                ChinnaLLM mode uses OpenRouter free for lightweight replies and OpenRouter auto as fallback. Bigger tasks can still route to stronger OpenRouter models from the model picker.
              </div>
            )}

            {result ? (
              <p className={`rounded-2xl border px-4 py-3 text-sm ${result.ok ? "border-lime-300/25 bg-lime-300/10 text-lime-50" : "border-red-400/25 bg-red-400/10 text-red-100"}`}>
                {result.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2 border-t border-white/10 p-5 sm:grid-cols-[1fr_auto_auto] sm:p-6">
            <Button type="button" variant="outline" className="h-11 rounded-2xl border-white/12 bg-transparent text-stone-200 hover:bg-white/5" onClick={() => onOpenChange(false)} disabled={saving || testing}>
              Skip
            </Button>
            <Button type="button" variant="outline" className="h-11 rounded-2xl border-lime-300/20 bg-transparent text-lime-100 hover:bg-lime-300/10" onClick={testKey} disabled={testing || (needsKey && apiKey.trim().length < 8)}>
              {testing ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              Test key
            </Button>
            <Button type="button" className="h-11 rounded-2xl bg-lime-200 text-stone-950 hover:bg-lime-100" onClick={saveAndApply} disabled={saving || (needsKey && apiKey.trim().length < 8)}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}
              Use integration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProjectImportDialog({
  open,
  onOpenChange,
  onImportZip,
  onImportGit,
  importing,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportZip: (file: File) => void;
  onImportGit: (input: { url: string; accessToken?: string }) => void;
  importing: boolean;
  error: string | null;
}) {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [gitUrl, setGitUrl] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [dragging, setDragging] = useState(false);

  function chooseFile(file?: File | null) {
    if (!file) return;
    setZipFile(file);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] max-w-3xl overflow-hidden rounded-[28px] border-white/12 bg-[#0c0d0b] p-0 text-stone-100 shadow-2xl shadow-black/70">
        <div className="relative">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_18%_0%,rgba(251,191,36,0.17),transparent_58%),radial-gradient(circle_at_82%_10%,rgba(190,242,100,0.16),transparent_56%)]" />
          <div className="relative border-b border-white/10 p-5 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl tracking-tight text-stone-50">Import an existing project</DialogTitle>
              <DialogDescription className="text-stone-400">
                Drop a project zip or paste a GitHub URL. Chinna-Coder creates a chat workspace, detects dependencies, and asks for missing env values.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.05fr_0.95fr]">
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                chooseFile(event.dataTransfer.files?.[0]);
              }}
              className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed p-6 text-center transition ${dragging ? "border-lime-300/65 bg-lime-300/10" : "border-white/14 bg-white/[0.035] hover:border-lime-300/35"}`}
            >
              <UploadCloud className="size-10 text-lime-100" />
              <span className="mt-4 text-base font-semibold text-stone-50">Drop project .zip here</span>
              <span className="mt-2 max-w-xs text-sm leading-6 text-stone-500">Supports source/config files up to 24 MB. Skips node_modules, build output, and generated folders.</span>
              <span className="mt-4 rounded-full border border-white/10 px-3 py-1.5 text-xs text-stone-300">{zipFile ? zipFile.name : "Choose zip file"}</span>
              <input type="file" accept=".zip,application/zip" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0])} />
            </label>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-stone-50">
                  <Github className="size-4 text-amber-100" />
                  Import from Git URL
                </div>
                <Input
                  value={gitUrl}
                  onChange={(event) => setGitUrl(event.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="mt-4 h-11 rounded-2xl border-white/10 bg-black/35 text-stone-100 placeholder:text-stone-600 focus-visible:ring-lime-200/35"
                />
                <Input
                  value={accessToken}
                  onChange={(event) => setAccessToken(event.target.value)}
                  type="password"
                  placeholder="Optional access token"
                  className="mt-3 h-11 rounded-2xl border-white/10 bg-black/35 text-stone-100 placeholder:text-stone-600 focus-visible:ring-lime-200/35"
                />
                <Button type="button" variant="outline" className="mt-4 h-11 w-full rounded-2xl border-amber-200/20 bg-transparent text-amber-100 hover:bg-amber-200/10" disabled={!gitUrl.trim() || importing} onClick={() => onImportGit({ url: gitUrl.trim(), accessToken: accessToken.trim() })}>
                  {importing ? <Loader2 className="size-4 animate-spin" /> : <Github className="size-4" />}
                  Import Git repository
                </Button>
              </div>
              <div className="rounded-[24px] border border-lime-300/15 bg-lime-300/[0.06] p-4 text-sm leading-6 text-lime-50">
                After import, the chat opens with the files loaded. If the app needs `DATABASE_URL`, API keys, or other secrets, the composer environment panel will ask for them before the agent runs provider-dependent features.
              </div>
              {error ? <p className="rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
            </div>
          </div>
          <div className="grid gap-2 border-t border-white/10 p-5 sm:grid-cols-[1fr_auto] sm:p-6">
            <Button type="button" variant="outline" className="h-11 rounded-2xl border-white/12 bg-transparent text-stone-200 hover:bg-white/5" onClick={() => onOpenChange(false)} disabled={importing}>
              Cancel
            </Button>
            <Button type="button" className="h-11 rounded-2xl bg-lime-200 px-5 text-stone-950 hover:bg-lime-100" disabled={!zipFile || importing} onClick={() => zipFile && onImportZip(zipFile)}>
              {importing ? <Loader2 className="size-4 animate-spin" /> : <FolderArchive className="size-4" />}
              Import zip project
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PromptComposer({
  prompt,
  setPrompt,
  onSend,
  isSubmitting,
  model,
  setModel,
  mode,
  setMode,
  styleId,
  setStyleId,
  backendEnabled,
  setBackendEnabled,
  selectedType,
  setSelectedType,
  attachments,
  mcpServers,
  onAttach,
  onOpenGithubImport,
  onOpenProjectImport,
  onOpenAIIntegration,
  onOpenMcpConnect,
}: {
  prompt: string;
  setPrompt: (value: string) => void;
  onSend: () => void;
  isSubmitting: boolean;
  model: string;
  setModel: (value: string) => void;
  mode: Mode;
  setMode: (value: Mode) => void;
  styleId: SandboxStyleId;
  setStyleId: (value: SandboxStyleId) => void;
  backendEnabled: boolean;
  setBackendEnabled: (value: boolean) => void;
  selectedType: string;
  setSelectedType: (value: string) => void;
  attachments: Attachment[];
  mcpServers: AttachedMcpServer[];
  onAttach: () => void;
  onOpenGithubImport: () => void;
  onOpenProjectImport: () => void;
  onOpenAIIntegration: () => void;
  onOpenMcpConnect: () => void;
}) {
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const activeStyle = SANDBOX_STYLE_PRESETS.find((style) => style.id === styleId);
  const selectedModel = MODELS.find((item) => item.value === model);
  const canSend = prompt.trim().length > 0 || attachments.length > 0;
  const selectedTypeLabel = appTypeHints.find((item) => item.id === selectedType)?.label ?? "Web app";

  function appendPrompt(text: string) {
    const next = prompt.trim() ? `${prompt.trim()}\n\n${text}` : text;
    setPrompt(next);
  }

  function chooseBuildType(type: string, text?: string) {
    setSelectedType(type);
    if (type === "backend") setBackendEnabled(true);
    if (text) appendPrompt(text);
  }

  return (
    <div className="relative mx-auto w-full max-w-5xl space-y-4" id="prompt-composer">
      <div aria-hidden="true" className="absolute -inset-8 -z-10 rounded-[40px] bg-[radial-gradient(circle_at_16%_20%,rgba(190,242,100,0.18),transparent_38%),radial-gradient(circle_at_88%_45%,rgba(251,191,36,0.13),transparent_34%),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,auto,56px_56px,56px_56px] opacity-80 blur-[0.2px]" />
      <div className="relative rounded-[28px] p-px shadow-[0_28px_90px_rgba(0,0,0,0.62)]">
        <div aria-hidden="true" className="absolute inset-0 rounded-[28px] bg-[linear-gradient(135deg,rgba(255,255,255,0.20),rgba(190,242,100,0.28),rgba(251,191,36,0.14),rgba(255,255,255,0.08))] opacity-75" />
        <div className="relative overflow-hidden rounded-[27px] border border-white/10 bg-[#0a0b0d]/88 backdrop-blur-2xl">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),transparent)]" />
        <Textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
          placeholder="Build a 3D solar system viewer with Three.js and orbit controls..."
          className="relative min-h-[168px] resize-none border-0 bg-transparent p-5 text-base leading-7 text-stone-100 placeholder:text-stone-500 focus-visible:ring-0 sm:p-7 sm:text-lg"
        />
        <div className="border-t border-white/12 bg-black/20 p-3 sm:p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex size-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.045] text-stone-300 transition hover:border-lime-300/45 hover:bg-lime-300/10 hover:text-lime-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-200/40"
                    aria-label="Open prompt actions"
                  >
                    <Plus className="size-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80 rounded-2xl border-white/12 bg-[#0c0d0b] p-2 text-stone-100 shadow-2xl shadow-black/60">
                  <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-lime-200/75">
                    Build actions
                  </DropdownMenuLabel>
                  <DropdownMenuGroup>
                    <DropdownMenuItem className="gap-3 rounded-xl px-3 py-2.5 focus:bg-lime-300/10 focus:text-lime-100" onSelect={onAttach}>
                      <Paperclip className="size-4" />
                      Attach file or screenshot
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-3 rounded-xl px-3 py-2.5 focus:bg-lime-300/10 focus:text-lime-100" onSelect={onOpenProjectImport}>
                      <FolderArchive className="size-4" />
                      Import project zip or URL
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-3 rounded-xl px-3 py-2.5 focus:bg-lime-300/10 focus:text-lime-100" onSelect={onOpenGithubImport}>
                      <Github className="size-4" />
                      Import from GitHub
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-3 rounded-xl px-3 py-2.5 focus:bg-lime-300/10 focus:text-lime-100" onSelect={onOpenMcpConnect}>
                      <Cable className="size-4" />
                      Connect MCP server
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuGroup>
                    <DropdownMenuItem className="gap-3 rounded-xl px-3 py-2.5 focus:bg-lime-300/10 focus:text-lime-100" onSelect={onOpenAIIntegration}>
                      <BrainCircuit className="size-4" />
                      Add AI integration
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-3 rounded-xl px-3 py-2.5 focus:bg-lime-300/10 focus:text-lime-100" onSelect={() => chooseBuildType("backend", "Include backend logic with database schema, API routes, environment variables, and admin settings where needed.")}>
                      <Database className="size-4" />
                      Backend scaffold
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-3 rounded-xl px-3 py-2.5 focus:bg-lime-300/10 focus:text-lime-100" onSelect={() => chooseBuildType("3d-webgl", "Include an interactive Three.js/WebGL scene with responsive controls and non-blank canvas verification.")}>
                      <Box className="size-4" />
                      3D/WebGL scene
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-3 rounded-xl px-3 py-2.5 focus:bg-lime-300/10 focus:text-lime-100" onSelect={() => chooseBuildType("prototype", "Build this as a fast prototype with polished visible states and working interactions.")}>
                      <Sparkles className="size-4" />
                      Prototype mode
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-3 rounded-xl px-3 py-2.5 focus:bg-lime-300/10 focus:text-lime-100" onSelect={() => appendPrompt("Generate image/video-ready UI states and ask for required media provider keys only when needed.")}>
                      <ImageIcon className="size-4" />
                      Image or video app
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                onClick={() => setModelPickerOpen(true)}
                className="inline-flex h-11 min-w-0 max-w-[13rem] items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.045] px-3 text-sm text-stone-200 transition hover:border-lime-300/40 hover:text-lime-100 sm:max-w-none"
              >
                <BrainCircuit className="size-4 text-lime-200" />
                <span className="truncate">{selectedModel?.label ?? model}</span>
              </button>
              <select value={mode} onChange={(event) => setMode(event.target.value as Mode)} className="h-11 rounded-2xl border border-white/12 bg-white/[0.045] px-3 text-sm text-stone-200 outline-none transition hover:border-lime-300/35 focus:border-lime-300/50">
                <option value="agent">Agent</option>
                <option value="plan">Plan</option>
                <option value="ask">Ask</option>
              </select>
              <select value={styleId} onChange={(event) => setStyleId(event.target.value as SandboxStyleId)} className="h-11 max-w-[11rem] rounded-2xl border border-white/12 bg-white/[0.045] px-3 text-sm text-stone-200 outline-none transition hover:border-lime-300/35 focus:border-lime-300/50 sm:max-w-none">
                {SANDBOX_STYLE_PRESETS.map((style) => <option key={style.id} value={style.id}>{style.label}</option>)}
              </select>
              <button type="button" onClick={() => setBackendEnabled(!backendEnabled)} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.045] px-3 text-sm text-stone-300 transition hover:border-lime-300/40 hover:text-lime-100">
                <Code2 className="size-3.5" />
                {backendEnabled ? "Backend on" : "Backend off"}
              </button>
              <button type="button" className="inline-flex size-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.045] text-stone-400 transition hover:border-amber-200/35 hover:text-amber-100" aria-label="Voice input">
                <Mic className="size-4" />
              </button>
              <span className="hidden text-xs text-stone-500 2xl:inline">
                {selectedTypeLabel} · {activeStyle?.label ?? "Style"} · {attachments.length ? `${attachments.length} attached` : "No files"} · {mcpServers.length ? `${mcpServers.length} MCP` : "No MCP"}
              </span>
            </div>

            <Button disabled={!canSend || isSubmitting} onClick={onSend} className="h-12 rounded-2xl bg-lime-200 px-5 text-stone-950 shadow-[0_0_48px_rgba(190,242,100,0.22)] hover:bg-lime-100 md:min-w-32">
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              <span className="hidden sm:inline">Build now</span>
            </Button>
          </div>
        </div>
        </div>
      </div>

      <div className="relative flex flex-wrap justify-center gap-2 sm:gap-3">
        {appTypeHints.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => chooseBuildType(item.id)}
            className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm transition ${selectedType === item.id ? "border-lime-300/50 bg-lime-300/10 text-lime-100 shadow-[0_0_22px_rgba(190,242,100,0.10)]" : "border-white/12 bg-black/20 text-stone-400 hover:border-lime-300/30 hover:text-lime-100"}`}
          >
            <item.icon className="size-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="relative mx-auto flex max-w-4xl flex-wrap justify-center gap-2">
        {mcpServers.map((server) => (
          <span key={server.id} className="inline-flex items-center gap-1.5 rounded-full border border-lime-300/20 bg-lime-300/[0.07] px-3 py-1.5 text-xs text-lime-100">
            <ServerCog className="size-3.5" />
            {server.name}
          </span>
        ))}
        {quickPresetPrompts.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => appendPrompt(preset)}
            className="rounded-2xl border border-amber-200/15 bg-amber-200/[0.055] px-3 py-2 text-xs leading-5 text-stone-300 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:border-amber-200/35 hover:bg-amber-200/10 hover:text-amber-50"
          >
            {preset.length > 52 ? `${preset.slice(0, 52)}...` : preset}
          </button>
        ))}
      </div>
      <ModelPickerDialog open={modelPickerOpen} onOpenChange={setModelPickerOpen} selectedModel={model} onSelect={setModel} />
    </div>
  );
}

export default function HomePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const context = use(Context);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(MODELS.find((item) => item.recommended && !item.hidden)?.value ?? MODELS[0]?.value ?? "zai-org/GLM-5");
  const [mode, setMode] = useState<Mode>("agent");
  const [styleId, setStyleId] = useState<SandboxStyleId>(DEFAULT_STYLE_ID);
  const [backendEnabled, setBackendEnabled] = useState(false);
  const [selectedType, setSelectedType] = useState("web-app");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [mcpServers, setMcpServers] = useState<AttachedMcpServer[]>([]);
  const [authOverlayOpen, setAuthOverlayOpen] = useState(false);
  const [githubImportOpen, setGithubImportOpen] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [githubAccessToken, setGithubAccessToken] = useState("");
  const [githubImporting, setGithubImporting] = useState(false);
  const [githubImportError, setGithubImportError] = useState<string | null>(null);
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [aiIntegrationOpen, setAiIntegrationOpen] = useState(false);
  const [aiIntegration, setAiIntegration] = useState<{ provider: BYOKProviderId | "chinnallm"; model: string; goal: string } | null>(null);
  const [projectImportOpen, setProjectImportOpen] = useState(false);
  const [projectImporting, setProjectImporting] = useState(false);
  const [projectImportError, setProjectImportError] = useState<string | null>(null);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -120]);

  useEffect(() => {
    const incomingPrompt = searchParams.get("prompt");
    if (incomingPrompt) setPrompt(incomingPrompt);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      const response = await fetch("/api/user-settings", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const data = await response.json().catch(() => null);
      const settings = data?.settings;
      if (!settings || cancelled) return;
      if (typeof settings.defaultModel === "string") setModel(settings.defaultModel);
      if (["ask", "plan", "agent"].includes(settings.defaultMode)) setMode(settings.defaultMode);
      if (typeof settings.backendDefault === "boolean") setBackendEnabled(settings.backendDefault);
      if (typeof settings.styleDefault === "string") setStyleId(settings.styleDefault as SandboxStyleId);
    }
    void loadSettings();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("pendingBuild");
    if (!raw) return;
    (async () => {
      const session = await fetch("/api/auth/session", { cache: "no-store" }).then((response) => response.json().catch(() => null)).catch(() => null);
      if (!session?.user) return;
      sessionStorage.removeItem("pendingBuild");
      await createBuild(JSON.parse(raw));
    })().catch(() => sessionStorage.removeItem("pendingBuild"));
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("pendingGithubImport");
    if (!raw) return;
    (async () => {
      const session = await fetch("/api/auth/session", { cache: "no-store" }).then((response) => response.json().catch(() => null)).catch(() => null);
      if (!session?.user) return;
      sessionStorage.removeItem("pendingGithubImport");
      await importGithubRepo(JSON.parse(raw));
    })().catch(() => sessionStorage.removeItem("pendingGithubImport"));
  }, []);

  async function createBuild(data: {
    rawPrompt: string;
    model: string;
    mode: Mode;
    styleId: SandboxStyleId;
    backendMode: boolean;
    selectedType: string;
    attachments: Attachment[];
    mcpServers: AttachedMcpServer[];
    aiIntegration?: { provider: BYOKProviderId | "chinnallm"; model: string; goal: string } | null;
  }) {
    const appTypeHintText: Record<string, string> = {
      prototype: "Build a fast exploratory prototype while keeping all visible controls functional.",
      "web-app": "Build a complete multi-page web application with real routing and responsive states.",
      backend: "Backend mode is enabled. Include backend-ready API routes, Prisma/database guidance, and environment variables where required.",
      "3d-webgl": "Include an interactive Three.js/WebGL scene as a core part of the requested experience.",
    };
    const finalPrompt = [
      data.rawPrompt || "Build from the uploaded attachment.",
      appTypeHintText[data.selectedType] || "",
      data.backendMode ? appTypeHintText.backend : "",
      data.aiIntegration?.provider === "chinnallm"
        ? "Use ChinnaLLM for AI features with OpenRouter free for lightweight replies and OpenRouter auto/stronger OpenRouter models as fallback for bigger tasks."
        : data.aiIntegration
          ? `Wire AI features only to ${data.aiIntegration.provider}. Preferred route: ${data.aiIntegration.model}. Goal: ${data.aiIntegration.goal}. Ask for missing env vars before calling provider APIs.`
          : "",
    ].filter(Boolean).join("\n\n");
    const aiDetection = requiresAI(finalPrompt);
    const screenshotUrl = data.attachments.find((item) => item.kind === "image" && item.url)?.url;

    const response = await fetch("/api/create-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: finalPrompt,
        model: data.model,
        quality: "high",
        mode: data.mode,
        shadcn: true,
        styleId: data.styleId,
        screenshotUrl,
        attachments: data.attachments,
        aiCapabilities: aiDetection.capabilities,
        aiIntegration: data.aiIntegration,
        backendMode: data.backendMode,
        mcpServers: data.mcpServers,
      }),
    });
    const created = await response.json().catch(() => null);
    if (!response.ok || !created?.chatId || !created?.lastMessageId) throw new Error(created?.error || "Could not create chat.");

    const params = new URLSearchParams({ generate: created.lastMessageId, model: data.model, quality: "high" });
    if (aiDetection.detected) {
      context.setStreamPromise(undefined);
      router.push(`/chats/${created.chatId}?${params.toString()}`);
      return;
    }

    const streamPromise = fetch("/api/get-next-completion-stream-promise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: created.lastMessageId, model: data.model, reasoning: data.mode === "agent", quality: "high" }),
    }).then(async (streamResponse) => {
      if (!streamResponse.ok) throw new Error((await streamResponse.text()) || "Failed to start generation");
      if (!streamResponse.body) throw new Error("No response body");
      return streamResponse.body;
    });
    void streamPromise.catch(() => undefined);
    context.setStreamPromise(streamPromise);
    router.push(`/chats/${created.chatId}?${params.toString()}`);
  }

  const handlePromptSend = (value?: string) => {
    const cleanPrompt = (value ?? prompt).trim();
    if (!cleanPrompt && attachments.length === 0) return;

    startTransition(async () => {
      try {
        // If auth is required but user not signed in, save the prompt intent and show auth overlay.
        // After sign-in, the useEffect below will pick it up and auto-launch the build.
        try {
          const pub = await fetch("/api/public-settings", { cache: "no-store" }).then((r) => r.json().catch(() => null));
          // Strict gating: require sign-in whenever Google auth is available,
          // not only in saasMode. Keeps open-build environments unaffected.
          const authEnforced = !!pub?.googleAuth;
          if (authEnforced) {
            const sess = await fetch("/api/auth/session", { cache: "no-store" }).then((r) => r.json().catch(() => null));
            if (!sess?.user) {
              const buildData = {
                rawPrompt: cleanPrompt,
                model,
                quality: "high",
                mode: buildMode,
                shadcn: shadcnEnabled,
                styleId,
                designPresetId: selectedDesignPresetId || undefined,
                screenshotUrl: attachments.find((item) => item.kind === "image" && item.url)?.url,
                attachments,
                backendMode: backendEnabled,
                mcpServers: selectedMcpServers,
                deepThinkingEnabled,
                appTypeHint,
                webSearchEnabled,
                canvasEnabled,
              };
              sessionStorage.setItem("pendingBuild", JSON.stringify(buildData));
              setAuthOverlayOpen(true);
              return;
            }
          }
        } catch {
          // fall through to create (it will 401/ error if auth still required)
        }
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
            mcpServers: selectedMcpServers,
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
      } finally {
        setIsSubmitting(false);
      }
    });
  }

  async function handleAttachmentUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/blob-upload", { method: "POST", body: formData }).catch(() => null);
    const data = await response?.json().catch(() => null);
    if (!response?.ok || !data?.url) {
      toast({ title: "Upload failed", description: data?.error || "Could not upload the file.", variant: "destructive" });
      return;
    }
    setAttachments((items) => [...items, { kind: file.type.startsWith("image/") ? "image" : "file", filename: file.name, url: data.url, size: file.size }]);
    if (!prompt.trim()) setPrompt("Build from this uploaded file or screenshot.");
    event.currentTarget.value = "";
  }

  async function importGithubRepo(input: { url: string; accessToken?: string }) {
    const response = await fetch("/api/import-github-repo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: input.url,
        accessToken: input.accessToken || undefined,
      }),
    });
    const data = await response.json().catch(() => null);
    if (response.status === 401) {
      throw new Error("AUTH_REQUIRED");
    }
    if (!response.ok || !data?.chatId) {
      throw new Error(data?.error || "Could not import this GitHub repository.");
    }
    toast({
      title: "GitHub repository imported",
      description: `${data.fileCount ?? 0} files loaded. Opening the generated workspace.`,
    });
    router.push(`/chats/${data.chatId}`);
  }

  function handleGithubImport() {
    const url = githubUrl.trim();
    if (!url) {
      setGithubImportError("Paste a GitHub repository URL first.");
      return;
    }
    setGithubImporting(true);
    setGithubImportError(null);
    void (async () => {
      try {
        await importGithubRepo({ url, accessToken: githubAccessToken.trim() });
        setGithubImportOpen(false);
        setGithubUrl("");
        setGithubAccessToken("");
      } catch (error) {
        if (error instanceof Error && error.message === "AUTH_REQUIRED") {
          sessionStorage.setItem("pendingGithubImport", JSON.stringify({ url, accessToken: githubAccessToken.trim() }));
          sessionStorage.setItem("pendingBuild", JSON.stringify({
            rawPrompt: `Import and preview this GitHub repository: ${url}`,
            model,
            mode,
            styleId,
            backendMode: true,
            selectedType: "web-app",
            attachments: [],
            mcpServers,
          }));
          setGithubImportOpen(false);
          setAuthOverlayOpen(true);
          return;
        }
        setGithubImportError(error instanceof Error ? error.message : "Could not import this repository.");
      } finally {
        setGithubImporting(false);
      }
    })();
  }

  function handleApplyAiIntegration(integration: { provider: BYOKProviderId | "chinnallm"; model: string; goal: string }) {
    setAiIntegration(integration);
    if (integration.provider === "chinnallm") {
      setModel("openrouter/auto");
      setPrompt((current) => {
        const text = "Add AI features with ChinnaLLM using OpenRouter free for smaller replies and OpenRouter auto fallback for larger generation tasks.";
        return current.trim() ? `${current.trim()}\n\n${text}` : text;
      });
      toast({ title: "ChinnaLLM attached", description: "AI features will use OpenRouter free/auto fallback where needed." });
      return;
    }
    setPrompt((current) => {
      const text = `Add AI features using ${integration.provider}. Preferred model/route: ${integration.model}. Ask for required environment variables before provider calls.`;
      return current.trim() ? `${current.trim()}\n\n${text}` : text;
    });
    toast({ title: "AI integration attached", description: `${integration.provider} will be used for this build.` });
  }

  function handleProjectZipImport(file: File) {
    setProjectImporting(true);
    setProjectImportError(null);
    void (async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/import-project", { method: "POST", body: formData });
        const data = await response.json().catch(() => null);
        if (response.status === 401) {
          setProjectImportOpen(false);
          setAuthOverlayOpen(true);
          throw new Error("Sign in first, then upload the zip again. Browser security does not allow preserving local files across auth redirects.");
        }
        if (!response.ok || !data?.chatId) {
          throw new Error(data?.error || "Could not import this project zip.");
        }
        toast({
          title: "Project zip imported",
          description: `${data.fileCount ?? 0} files loaded${data.envVars?.length ? `, ${data.envVars.length} env vars detected` : ""}.`,
        });
        setProjectImportOpen(false);
        router.push(`/chats/${data.chatId}`);
      } catch (error) {
        setProjectImportError(error instanceof Error ? error.message : "Could not import this project.");
      } finally {
        setProjectImporting(false);
      }
    })();
  }

  function handleProjectGitImport(input: { url: string; accessToken?: string }) {
    setProjectImporting(true);
    setProjectImportError(null);
    void (async () => {
      try {
        await importGithubRepo(input);
        setProjectImportOpen(false);
      } catch (error) {
        if (error instanceof Error && error.message === "AUTH_REQUIRED") {
          sessionStorage.setItem("pendingGithubImport", JSON.stringify(input));
          setProjectImportOpen(false);
          setAuthOverlayOpen(true);
          return;
        }
        setProjectImportError(error instanceof Error ? error.message : "Could not import this Git repository.");
      } finally {
        setProjectImporting(false);
      }
    })();
  }

  function handleAttachMcpServer(server: any) {
    const attached = {
      id: String(server.id),
      name: String(server.name || "MCP server"),
      url: typeof server.url === "string" ? server.url : undefined,
      transport: typeof server.transport === "string" ? server.transport : undefined,
    };
    setMcpServers((items) => items.some((item) => item.id === attached.id) ? items : [...items, attached]);
    setPrompt((current) => {
      const text = `Use the connected MCP server "${attached.name}" when it helps the build.`;
      return current.trim() ? `${current.trim()}\n\n${text}` : text;
    });
  }

  return (
    <HomeShell>
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <section id="hero" className="relative flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
          {/* Exceptional premium rich gradient background — multi-layered, 
              deeply dimensional, responsive, and luxurious. Purely decorative. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#050507]">
            {/* Deep rich base gradient — near-black with a faint emerald cast */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_18%,#04100c_0%,#04070a_45%,#020403_100%)]" />

            {/* Primary emerald aurora orb (top center) */}
            <div className="absolute -top-[28%] left-1/2 h-[82vh] w-[115vw] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,#065f46_0%,#064e3b_35%,transparent_70%)] opacity-[0.6] blur-[110px] sm:blur-[130px] md:blur-[170px] lg:blur-[210px]" />

            {/* Teal accent (left) */}
            <div className="absolute top-[4%] -left-[20%] h-[66vh] w-[72vw] rounded-[50%] bg-[radial-gradient(ellipse_at_center,#0f766e_0%,transparent_65%)] opacity-[0.42] blur-[90px] sm:blur-[110px] md:blur-[140px]" />

            {/* Lime/spring-green accent (right) for the aurora shift */}
            <div className="absolute bottom-[-12%] right-[-16%] h-[72vh] w-[76vw] rounded-[50%] bg-[radial-gradient(ellipse_at_center,#3f6212_0%,#134e2a_32%,transparent_72%)] opacity-[0.34] blur-[95px] sm:blur-[120px] md:blur-[160px]" />

            {/* Cool cyan highlight for depth */}
            <div className="absolute top-[24%] right-[8%] h-[38vh] w-[46vw] rounded-[50%] bg-[radial-gradient(ellipse_at_center,#083344_0%,transparent_75%)] opacity-[0.22] blur-[130px]" />

            {/* Responsive fine grid with premium mask */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[size:clamp(28px,2.8vw,72px)_clamp(28px,2.8vw,72px)] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_25%,#000_25%,transparent_85%)]" />

            {/* Elegant soft vignette for depth */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_95%_75%_at_50%_35%,transparent_25%,rgba(0,0,0,0.75)_85%)]" />

            {/* Very slow, luxurious animated gradient sweep (subtle premium motion) */}
            <div className="hero-premium-bg absolute inset-0 bg-[linear-gradient(115deg,transparent_15%,rgba(255,255,255,0.025)_48%,transparent_82%)] bg-[length:220%_100%] animate-[premium-sweep_28s_ease-in-out_infinite] [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]" />
          </div>
          <div className="relative flex min-h-dvh w-full flex-col">
            <Header hideLogo />
            <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24 pt-8 md:pb-32">
              <div className="flex w-full max-w-[920px] -translate-y-2 flex-col items-center md:-translate-y-6">
                <h1 className="mb-10 text-center text-[38px] font-bold leading-[1.02] tracking-tight text-white sm:text-[44px] md:text-[80px] lg:text-[92px]">
                  {["Build.", "Preview.", "Ship."].map((word, index) => (
                    <motion.span
                      key={word}
                      className={`inline-block ${index === 1 ? "mx-2 bg-gradient-to-b from-emerald-200 to-teal-400 bg-clip-text text-transparent md:mx-6" : ""}`}
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
                  <PremiumPromptComposer value={prompt} onValueChange={setPrompt} onSend={handlePromptSend} isLoading={isSubmitting} disabled={isSubmitting || isGithubImporting} model={model} onModelChange={setModel} models={visibleModels} buildMode={buildMode} onBuildModeChange={setBuildMode} shadcnEnabled={shadcnEnabled} onShadcnChange={setShadcnEnabled} webSearchEnabled={webSearchEnabled} onWebSearchChange={setWebSearchEnabled} deepThinkingEnabled={deepThinkingEnabled} onDeepThinkingChange={setDeepThinkingEnabled} canvasEnabled={canvasEnabled} onCanvasChange={setCanvasEnabled} backendEnabled={backendEnabled} onBackendChange={setBackendEnabled} styleId={styleId} onStyleIdChange={(id) => { setStyleId(id); setSelectedDesignPresetId(null); }} savedDesigns={savedDesigns} onOpenDesignDialog={() => setDesignDialogOpen(true)} onSelectSavedDesign={(design) => setSelectedDesignPresetId(design.id)} selectedSavedDesignId={selectedDesignPresetId} onAttach={() => fileInputRef.current?.click()} attachmentReady={attachments.length > 0} onImportGithub={() => setGithubDialogOpen(true)} savedPrompts={savedPrompts} onSavePrompt={saveCurrentPrompt} onUseSavedPrompt={(item) => setPrompt(item.body)} flagEnabled={flagEnabled} selectedMcpServers={selectedMcpServers} onMcpChange={setSelectedMcpServers} onMcpOpenDialog={() => setMcpDialogOpen(true)} />
                  <DesignSystemDialog
                    open={designDialogOpen}
                    onOpenChange={setDesignDialogOpen}
                    onSaved={(design) => {
                      setSavedDesigns((prev) => [design, ...prev]);
                      setSelectedDesignPresetId(design.id);
                    }}
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        <MarketingSections />

        <section className="mx-auto grid max-w-7xl gap-4 px-5 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
        {["Agent sees the queue", "You see the files", "Preview stays live"].map((item, index) => (
          <motion.div key={item} initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ delay: index * 0.08 }} className="rounded-xl border border-lime-300/10 bg-white/[0.035] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-200/80">Signal {index + 1}</p>
            <h2 className="mt-3 text-xl font-semibold text-stone-50">{item}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-400">A restrained surface for build progress, no fake chrome, no mystery status.</p>
          </motion.div>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((item, index) => (
            <motion.article key={item.title} initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ delay: index * 0.05 }} className="group rounded-xl border border-lime-300/10 bg-[#0d0f0a] p-5 transition hover:border-lime-300/30 hover:shadow-[0_0_44px_rgba(190,242,100,0.08)]">
              <div className="flex items-start gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-lime-300/20 bg-lime-300/10 text-lime-100">
                  <item.icon className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-200/70">{item.eyebrow}</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-50">{item.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-stone-400">{item.body}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-amber-300/15 bg-[linear-gradient(135deg,rgba(251,191,36,0.10),rgba(190,242,100,0.05),rgba(255,255,255,0.03))] p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-100/80">Launch path</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-stone-50 sm:text-4xl">Start public. Continue authenticated. Keep the exact prompt alive.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-300">
                If a visitor sends a prompt before signing in, Chinna-Coder stores the intent, opens auth, then creates the chat and starts the build after sign-in.
              </p>
            </div>
            <Link href="/docs/getting-started" className="inline-flex rounded-lg border border-amber-200/30 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-200/10">
              Read the workflow <ArrowRight className="ml-2 size-4" />
            </Link>
          </div>
        </div>
      </section>

      <RichFooter />
      <input ref={fileInputRef} type="file" className="hidden" accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md,.json,.csv,.zip" onChange={handleAttachmentUpload} aria-label="Attach a file" />

      <AIIntegrationDialog
        open={aiIntegrationOpen}
        onOpenChange={setAiIntegrationOpen}
        onApply={handleApplyAiIntegration}
      />

      <ProjectImportDialog
        open={projectImportOpen}
        onOpenChange={setProjectImportOpen}
        importing={projectImporting}
        error={projectImportError}
        onImportZip={handleProjectZipImport}
        onImportGit={handleProjectGitImport}
      />

      <Dialog open={githubImportOpen} onOpenChange={setGithubImportOpen}>
        <DialogContent className="max-w-lg overflow-hidden rounded-2xl border-lime-300/18 bg-[#0d0f0a] p-0 text-stone-100 shadow-2xl shadow-black/50">
          <div className="relative p-6">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.16),transparent_62%)]" />
            <div className="relative">
              <div className="mb-5 grid size-12 place-items-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-100">
                <Github className="size-5" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-2xl tracking-tight text-stone-50">Import from GitHub</DialogTitle>
                <DialogDescription className="text-stone-400">
                  Paste a public repository URL. Chinna-Coder imports the files, creates a project, and opens the generated workspace.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="github-url" className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-200/75">Repository URL</label>
                  <Input
                    id="github-url"
                    value={githubUrl}
                    onChange={(event) => {
                      setGithubUrl(event.target.value);
                      setGithubImportError(null);
                    }}
                    placeholder="https://github.com/owner/repo"
                    className="mt-2 h-11 border-white/10 bg-black/30 text-stone-100 placeholder:text-stone-600 focus-visible:ring-lime-200/35"
                  />
                </div>
                <div>
                  <label htmlFor="github-token" className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Access token optional</label>
                  <Input
                    id="github-token"
                    value={githubAccessToken}
                    onChange={(event) => setGithubAccessToken(event.target.value)}
                    type="password"
                    placeholder="Only needed for private or rate-limited repos"
                    className="mt-2 h-11 border-white/10 bg-black/30 text-stone-100 placeholder:text-stone-600 focus-visible:ring-lime-200/35"
                  />
                  <p className="mt-2 text-xs leading-5 text-stone-500">The token is used for this import request and is not stored as an app secret.</p>
                </div>
                {githubImportError ? (
                  <p className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{githubImportError}</p>
                ) : null}
              </div>

              <div className="mt-6 grid gap-2 sm:grid-cols-[1fr_auto]">
                <Button type="button" variant="outline" className="h-11 rounded-lg border-lime-300/20 bg-transparent text-lime-100 hover:bg-lime-300/10" onClick={() => setGithubImportOpen(false)} disabled={githubImporting}>
                  Cancel
                </Button>
                <Button type="button" className="h-11 rounded-lg bg-lime-200 px-5 text-stone-950 hover:bg-lime-100" onClick={handleGithubImport} disabled={githubImporting}>
                  {githubImporting ? <Loader2 className="size-4 animate-spin" /> : <Github className="size-4" />}
                  Import repository
                </Button>
              </div>
            </div>
          </div>
        </section>

        <MarketingSections />
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

      <McpServerDialog
        open={mcpDialogOpen}
        onOpenChange={setMcpDialogOpen}
        title="Connect MCP server"
        onSaved={(server) => {
          toast({ title: "MCP server saved", description: "You can attach it to the next build from the prompt composer." });
          handleAttachMcpServer(server);
        }}
        onAttachToGeneration={handleAttachMcpServer}
      />

      <Dialog open={authOverlayOpen} onOpenChange={setAuthOverlayOpen}>
        <DialogContent className="max-w-md overflow-hidden rounded-2xl border-lime-300/18 bg-[#0d0f0a] p-0 text-stone-100 shadow-2xl shadow-black/50">
          <div className="relative p-6">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_50%_0%,rgba(190,242,100,0.18),transparent_62%)]" />
            <div className="relative">
              <div className="mb-5 grid size-12 place-items-center rounded-xl border border-lime-300/20 bg-lime-300/10 text-lime-100">
                <Lock className="size-5" />
              </div>
          <DialogHeader>
            <DialogTitle className="text-2xl tracking-tight text-stone-50">Sign in to build your app</DialogTitle>
            <DialogDescription className="text-stone-400">
              Your prompt is saved. After Google sign-in, Chinna-Coder opens the chat and starts building exactly what you asked for.
            </DialogDescription>
          </DialogHeader>
          <form action={continueWithGoogle} className="mt-6">
            <Button type="submit" className="h-11 w-full rounded-lg bg-lime-200 text-stone-950 hover:bg-lime-100">
              <LogIn className="size-4" />
              Continue with Google
            </Button>
          </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
