"use client";

import { useEffect, useState } from "react";
import { X, Share, PlusSquare, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "chinna-coder:install-prompt-dismissed";
const DISMISS_DAYS = 14;

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Mobile-only "Add to Home Screen" banner. Uses the native beforeinstallprompt
 * flow on Android/Chrome for a real one-tap install. iOS Safari doesn't expose
 * that API, so we show short manual instructions instead (Share > Add to
 * Home Screen) — this is the only way to offer install guidance on iOS.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const dismissedAt = Number(raw);
        const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
        if (daysSince < DISMISS_DAYS) return;
      }
    } catch {
      // localStorage unavailable — proceed as not dismissed.
    }

    setDismissed(false);

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (dismissed) return null;
  if (!deferredPrompt && !isIos()) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  const handleInstall = async () => {
    if (isIos()) {
      setShowIosInstructions((v) => !v);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  return (
    <div
      className="fixed inset-x-3 z-50 flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-lg md:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">Install Chinna-Coder</p>
          <p className="truncate text-xs text-muted-foreground">Add to your home screen for the full app experience</p>
        </div>
        <Button size="sm" onClick={handleInstall} className="shrink-0">
          Install
        </Button>
        <button
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {showIosInstructions && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Share className="h-3.5 w-3.5 shrink-0" />
            <span>1. Tap the Share button in Safari's toolbar</span>
          </div>
          <div className="flex items-center gap-2">
            <PlusSquare className="h-3.5 w-3.5 shrink-0" />
            <span>2. Scroll down and tap &quot;Add to Home Screen&quot;</span>
          </div>
        </div>
      )}
    </div>
  );
}
