"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Tip } from "@/components/ui/tooltip";

type SpeechRecognitionConstructor = new () => SpeechRecognition;
type SpeechRecognition = EventTarget & {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type SpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTextRef = useRef("");
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => recognitionRef.current?.abort();
  }, []);

  const stop = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  const start = () => {
    if (disabled || !supported || typeof window === "undefined") return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setSupported(false);
      return;
    }

    finalTextRef.current = "";
    const recognition = new Recognition();
    recognition.lang = navigator.language || "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result?.isFinal) finalTranscript += result[0]?.transcript ?? "";
      }
      if (finalTranscript.trim()) {
        finalTextRef.current += `${finalTranscript.trim()} `;
        onTranscript(finalTranscript.trim());
      }
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  const tooltip = !supported
    ? "Voice input is not supported in this browser"
    : recording
      ? "Stop voice input"
      : `${label} · any browser-supported language`;

  return (
    <Tip label={tooltip}>
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={disabled || !supported}
        aria-label={recording ? "Stop voice input" : label}
        aria-pressed={recording}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40",
          recording && "border-red-400/50 bg-red-500/15 text-red-200",
          className,
        )}
      >
        {recording ? <MicOff className={cn("size-4", iconClassName)} /> : <Mic className={cn("size-4", iconClassName)} />}
      </button>
    </Tip>
  );
}
