"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { DotFlow } from "@/components/ui/dot-flow";
import { useAvailableModels } from "@/lib/use-available-models";
import { getVisibleModels, MODELS } from "@/lib/constants";
import { Context } from "../../providers";

export default function NewChatPageClient({
  prompt,
  model: requestedModel,
}: {
  prompt: string | null;
  model: string | null;
}) {
  const router = useRouter();
  const context = use(Context);
  const availableModels = useAvailableModels();
  const [error, setError] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<{ defaultMode?: string; shadcnDefault?: boolean; quality?: string } | null>(null);

  useEffect(() => {
    fetch("/api/user-settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUserSettings(d?.settings ?? {}))
      .catch(() => setUserSettings({}));
  }, []);

  const model = useMemo(() => {
    if (requestedModel) {
      const requested = availableModels?.find(
        (item) => item.value === requestedModel && item.available,
      );
      if (requested) return requested.value;
    }
    const fromAvailable = availableModels?.find((item) => item.available);
    if (fromAvailable) return fromAvailable.value;
    return getVisibleModels().find((item) => !item.hidden)?.value || MODELS[0].value;
  }, [availableModels, requestedModel]);

  useEffect(() => {
    if (!availableModels) return;
    if (userSettings === null) return;
    if (!prompt?.trim()) {
      router.replace("/");
      return;
    }

    let cancelled = false;

    const mode = (userSettings.defaultMode as "ask" | "plan" | "agent") || "agent";
    const shadcn = userSettings.shadcnDefault === true;
    const quality = (userSettings.quality as "low" | "high") || "low";

    const run = async () => {
      try {
        const res = await fetch("/api/create-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt.trim(),
            model,
            quality,
            mode,
            shadcn,
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

        const { chatId, lastMessageId } = await res.json();
        if (cancelled) return;

        const streamPromise = fetch("/api/get-next-completion-stream-promise", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messageId: lastMessageId,
            model,
            reasoning: false,
            quality: "low",
          }),
        }).then(async (streamRes) => {
          if (!streamRes.ok) {
            throw new Error((await streamRes.text()) || "Failed to start generation");
          }
          if (!streamRes.body) throw new Error("No body on response");
          return streamRes.body;
        });
        void streamPromise.catch(() => undefined);
        context.setStreamPromise(streamPromise);

        const params = new URLSearchParams({
          generate: lastMessageId,
          model,
          quality: "low",
        });
        router.replace(`/chats/${chatId}?${params.toString()}`);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to start chat");
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [availableModels, model, prompt, router]);

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
            <DotFlow size={5} label="Checking available models" />
            Checking available models
          </div>
        ) : error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DotFlow size={5} label="Redirecting" />
            Redirecting to the chat page
          </div>
        )}
      </div>
    </main>
  );
}
