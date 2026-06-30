"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

import { cn } from "@/lib/utils";

type BrowserSpeechRecognition = {
  lang?: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { resultIndex: number; results: any }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event?: { error?: string }) => void) | null;
};

function getRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

function resolveAutoSpeechLanguage() {
  if (typeof navigator === "undefined") return "en-US";
  return navigator.language || navigator.languages?.[0] || "en-US";
}

function transcriptJoin(current: string, next: string) {
  const clean = next.trim();
  if (!clean) return current;
  if (!current.trim()) return clean;
  return `${current}${/[\s\n]$/.test(current) ? "" : " "}${clean}`;
}

export function VoiceInputButton({
  onTranscript,
  disabled,
  className,
  iconClassName,
  label = "Voice input",
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
  iconClassName?: string;
  label?: string;
}) {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const [lastError, setLastError] = useState("");

  useEffect(() => {
    setSupported(Boolean(getRecognitionConstructor()));
    return () => recognitionRef.current?.abort();
  }, []);

  const stop = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  const start = () => {
    if (disabled || !supported) return;
    const Recognition = getRecognitionConstructor();
    if (!Recognition) {
      setSupported(false);
      return;
    }

    setLastError("");
    const recognition = new Recognition() as BrowserSpeechRecognition;
    recognition.lang = resolveAutoSpeechLanguage();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result?.isFinal) finalTranscript += result[0]?.transcript ?? "";
      }
      if (finalTranscript.trim()) onTranscript(finalTranscript.trim());
    };
    recognition.onerror = (event) => {
      setLastError(event?.error ? `Voice input stopped: ${event.error}` : "Voice input stopped.");
      setRecording(false);
    };
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  const tooltip = !supported
    ? "Voice input is not supported in this browser"
    : lastError || (recording ? "Listening" : label);

  if (recording) {
    return (
      <button
        type="button"
        onClick={stop}
        disabled={disabled || !supported}
        aria-label="Stop voice input"
        aria-pressed="true"
        title={tooltip}
        className={cn(
          "relative inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40",
          "border-red-400/50 bg-red-500/15 text-red-200 before:absolute before:inset-[-3px] before:rounded-full before:border before:border-red-400/25 before:animate-pulse",
          className,
        )}
      >
        <MicOff className={cn("size-4", iconClassName)} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled || !supported}
      aria-label={label}
      aria-pressed="false"
      title={tooltip}
      className={cn(
        "relative inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
    >
      <Mic className={cn("size-4", iconClassName)} />
    </button>
  );
}

export { transcriptJoin };
