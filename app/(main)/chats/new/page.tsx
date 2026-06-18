"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { useAvailableModels } from "@/lib/use-available-models";
import { getVisibleModels, MODELS } from "@/lib/constants";

export default function NewChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const availableModels = useAvailableModels();
  const [error, setError] = useState<string | null>(null);

  const model = useMemo(() => {
    const requested = searchParams.get("model");
    if (requested) {
      const requestedModel = availableModels?.find((item) => item.value === requested && item.available);
      if (requestedModel) return requestedModel.value;
    }
    const fromAvailable = availableModels?.find((item) => item.available);
    if (fromAvailable) return fromAvailable.value;
    const anyAvailable = availableModels?.find((item) => item.available);
    if (anyAvailable) return anyAvailable.value;
    return getVisibleModels().find((item) => !item.hidden)?.value || MODELS[0].value;
  }, [availableModels, searchParams]);

  useEffect(() => {
    if (!availableModels) return;

    const prompt = searchParams.get("prompt")?.trim();
    if (!prompt) {
      router.replace("/");
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch("/api/create-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            model,
            quality: "low",
            mode: "agent",
            shadcn: true,
          }),
        });

        if (!res.ok) {
          let message = "Failed to start chat";
          try {
            const body = await res.json();
            if (body?.error) message = body.error;
          } catch {}
          throw new Error(message);
        }

        const { chatId } = await res.json();
        if (cancelled) return;
        router.replace(`/chats/${chatId}`);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to start chat");
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [availableModels, model, router, searchParams]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-[28px] border border-border/70 bg-card/70 px-6 py-8 text-center shadow-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-background">
          <Sparkles className="size-5 text-emerald-500" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Creating your chat</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Preparing the workspace and sending you into the builder.
          </p>
        </div>
        {!availableModels ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Checking available models
          </div>
        ) : error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Redirecting to the chat page
          </div>
        )}
      </div>
    </main>
  );
}
