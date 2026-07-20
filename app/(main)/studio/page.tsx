"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Clapperboard,
  Download,
  ImageIcon,
  KeyRound,
  Loader2,
  Music2,
  RefreshCcw,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type StudioKind = "image" | "video" | "music";

type Generation = {
  id: string;
  kind: StudioKind;
  provider: string;
  prompt: string;
  status: "pending" | "generating" | "success" | "failed";
  resultUrls: string[] | null;
  title: string | null;
  errorMessage: string | null;
  createdAt: string;
};

const KIND_META: Record<StudioKind, { label: string; icon: typeof ImageIcon }> = {
  image: { label: "Image", icon: ImageIcon },
  video: { label: "Video", icon: Clapperboard },
  music: { label: "Music", icon: Music2 },
};

export default function StudioPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [kind, setKind] = useState<StudioKind>("image");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [quality, setQuality] = useState<"speed" | "pro">("speed");
  const [videoProvider, setVideoProvider] = useState<"kling" | "seedance">("kling");
  const [duration, setDuration] = useState<"5" | "10">("5");
  const [musicStyle, setMusicStyle] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const pollTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const loadHistory = useCallback(async () => {
    const response = await fetch("/api/studio", { cache: "no-store" }).catch(() => null);
    if (!response?.ok) return;
    const data = await response.json().catch(() => null);
    if (Array.isArray(data?.generations)) setGenerations(data.generations);
  }, []);

  useEffect(() => {
    fetch("/api/studio/config", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { configured: false }))
      .then((data) => setConfigured(Boolean(data.configured)))
      .catch(() => setConfigured(false));
    void loadHistory();
  }, [loadHistory]);

  const pollGeneration = useCallback((id: string) => {
    const timers = pollTimers.current;
    if (timers.has(id)) return;
    const tick = async () => {
      const response = await fetch(`/api/studio/${id}`, { cache: "no-store" }).catch(() => null);
      const data = await response?.json().catch(() => null);
      if (data && data.id) {
        setGenerations((current) => current.map((item) => (item.id === id ? { ...item, ...data } : item)));
        if (data.status === "generating" || data.status === "pending") {
          timers.set(id, setTimeout(tick, 4000));
          return;
        }
      }
      timers.delete(id);
    };
    timers.set(id, setTimeout(tick, 3000));
  }, []);

  useEffect(() => {
    return () => {
      pollTimers.current.forEach((timer) => clearTimeout(timer));
      pollTimers.current.clear();
    };
  }, []);

  async function handleGenerate() {
    if (!prompt.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const body =
        kind === "image"
          ? { kind, prompt: prompt.trim(), aspectRatio, quality }
          : kind === "video"
            ? { kind, provider: videoProvider, prompt: prompt.trim(), aspectRatio, duration }
            : { kind, prompt: prompt.trim(), title: musicTitle || undefined, style: musicStyle || undefined, instrumental };

      const response = await fetch("/api/studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to start generation.");

      setGenerations((current) => [
        {
          id: data.id,
          kind,
          provider: kind === "video" ? videoProvider : kind === "image" ? "grok-imagine" : "suno",
          prompt: prompt.trim(),
          status: "generating",
          resultUrls: null,
          title: null,
          errorMessage: null,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
      pollGeneration(data.id);
      setPrompt("");
    } catch (error) {
      toast({
        title: "Could not start generation",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
        <Sparkles className="size-3.5" />
        Studio
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Generate image, video, and music</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        Real generations via kie.ai — Grok Imagine for images, Kling and Seedance for video, Suno for music.
      </p>

      {configured === false ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
          <KeyRound className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Studio generation is not configured</p>
            <p className="mt-1 text-amber-900/80 dark:text-amber-100/80">
              Add a <code className="rounded bg-amber-500/15 px-1 py-0.5">KIE_AI_API_KEY</code> environment variable to enable image, video, and music generation.
            </p>
          </div>
        </div>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>New generation</CardTitle>
          <CardDescription>Pick a media type, describe what to create, and generate.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={kind}
            onValueChange={(value) => {
              const next = value as StudioKind;
              setKind(next);
              setAspectRatio(next === "video" ? "16:9" : "1:1");
            }}
          >
            <TabsList className="grid w-full grid-cols-3">
              {(Object.keys(KIND_META) as StudioKind[]).map((value) => {
                const meta = KIND_META[value];
                return (
                  <TabsTrigger key={value} value={value} className="gap-2">
                    <meta.icon className="size-4" />
                    {meta.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="studio-prompt">Prompt</Label>
                <Textarea
                  id="studio-prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder={
                    kind === "image"
                      ? "A neon-lit cyberpunk street market at night, cinematic lighting..."
                      : kind === "video"
                        ? "A drone shot flying over a misty mountain range at sunrise..."
                        : "An upbeat synthwave track with driving bass and dreamy pads..."
                  }
                  className="mt-2 min-h-24"
                />
              </div>

              <TabsContent value="image" className="mt-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Aspect ratio</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["1:1", "2:3", "3:2", "16:9", "9:16"].map((value) => (
                          <SelectItem key={value} value={value}>{value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quality</Label>
                    <Select value={quality} onValueChange={(value) => setQuality(value as "speed" | "pro")}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="speed">Speed</SelectItem>
                        <SelectItem value="pro">Pro (higher quality)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="video" className="mt-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label>Provider</Label>
                    <Select value={videoProvider} onValueChange={(value) => setVideoProvider(value as "kling" | "seedance")}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kling">Kling</SelectItem>
                        <SelectItem value="seedance">Seedance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Aspect ratio</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].map((value) => (
                          <SelectItem key={value} value={value}>{value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Duration</Label>
                    <Select value={duration} onValueChange={(value) => setDuration(value as "5" | "10")}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 seconds</SelectItem>
                        <SelectItem value="10">10 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="music" className="mt-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="studio-music-title">Title (optional)</Label>
                    <Input id="studio-music-title" value={musicTitle} onChange={(event) => setMusicTitle(event.target.value)} className="mt-2" placeholder="Midnight Drive" />
                  </div>
                  <div>
                    <Label htmlFor="studio-music-style">Style (optional)</Label>
                    <Input id="studio-music-style" value={musicStyle} onChange={(event) => setMusicStyle(event.target.value)} className="mt-2" placeholder="Synthwave, upbeat, 120bpm" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInstrumental((value) => !value)}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition",
                    instrumental ? "border-primary bg-primary/10 text-primary" : "border-input bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Music2 className="size-3.5" />
                  {instrumental ? "Instrumental only" : "Include vocals"}
                </button>
              </TabsContent>
            </div>
          </Tabs>

          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isSubmitting || configured === false}
            className="mt-6 w-full sm:w-auto"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Generate {KIND_META[kind].label.toLowerCase()}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">History</h2>
          <Button variant="ghost" size="sm" onClick={() => void loadHistory()}>
            <RefreshCcw className="size-3.5" />
            Refresh
          </Button>
        </div>

        {generations.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No generations yet. Your image, video, and music results will appear here.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {generations.map((generation) => (
              <GenerationCard key={generation.id} generation={generation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GenerationCard({ generation }: { generation: Generation }) {
  const meta = KIND_META[generation.kind];
  return (
    <Card className="overflow-hidden">
      <div className="flex aspect-video items-center justify-center bg-muted">
        {generation.status === "success" && generation.resultUrls?.[0] ? (
          generation.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={generation.resultUrls[0]} alt={generation.prompt} className="size-full object-cover" />
          ) : generation.kind === "video" ? (
            <video src={generation.resultUrls[0]} controls className="size-full object-cover" />
          ) : (
            <audio src={generation.resultUrls[0]} controls className="w-[90%]" />
          )
        ) : generation.status === "failed" ? (
          <div className="px-4 text-center text-xs text-destructive">{generation.errorMessage || "Generation failed."}</div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-xs">Generating…</span>
          </div>
        )}
      </div>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <meta.icon className="size-3" />
            {generation.provider}
          </Badge>
          <Badge
            variant={generation.status === "success" ? "default" : "outline"}
            className={generation.status === "failed" ? "border-destructive/40 text-destructive" : undefined}
          >
            {generation.status}
          </Badge>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{generation.title || generation.prompt}</p>
        {generation.status === "success" && generation.resultUrls?.[0] ? (
          <a
            href={generation.resultUrls[0]}
            download
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Download className="size-3.5" />
            Download
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}
