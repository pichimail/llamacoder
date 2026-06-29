"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Languages, Mic, MicOff } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { resultIndex: number; results: any }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event?: { error?: string }) => void) | null;
};

type VoiceLanguage = { code: string; label: string; native?: string };

const STORAGE_KEY = "chinna-coder-voice-language";

const INDIAN_LANGUAGES: VoiceLanguage[] = [
  { code: "en-IN", label: "English", native: "India" },
  { code: "hi-IN", label: "Hindi", native: "हिन्दी" },
  { code: "te-IN", label: "Telugu", native: "తెలుగు" },
  { code: "ta-IN", label: "Tamil", native: "தமிழ்" },
  { code: "kn-IN", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml-IN", label: "Malayalam", native: "മലയാളം" },
  { code: "mr-IN", label: "Marathi", native: "मराठी" },
  { code: "gu-IN", label: "Gujarati", native: "ગુજરાતી" },
  { code: "bn-IN", label: "Bengali", native: "বাংলা" },
  { code: "pa-IN", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ur-IN", label: "Urdu", native: "اردو" },
  { code: "or-IN", label: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "as-IN", label: "Assamese", native: "অসমীয়া" },
  { code: "ne-IN", label: "Nepali", native: "नेपाली" },
];

const INTERNATIONAL_LANGUAGES: VoiceLanguage[] = [
  { code: "en-US", label: "English", native: "US" },
  { code: "en-GB", label: "English", native: "UK" },
  { code: "es-ES", label: "Spanish", native: "Español" },
  { code: "fr-FR", label: "French", native: "Français" },
  { code: "de-DE", label: "German", native: "Deutsch" },
  { code: "it-IT", label: "Italian", native: "Italiano" },
  { code: "pt-BR", label: "Portuguese", native: "Brasil" },
  { code: "ar-SA", label: "Arabic", native: "العربية" },
  { code: "zh-CN", label: "Chinese", native: "中文" },
  { code: "ja-JP", label: "Japanese", native: "日本語" },
  { code: "ko-KR", label: "Korean", native: "한국어" },
  { code: "ru-RU", label: "Russian", native: "Русский" },
  { code: "id-ID", label: "Indonesian", native: "Indonesia" },
  { code: "th-TH", label: "Thai", native: "ไทย" },
  { code: "vi-VN", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "tr-TR", label: "Turkish", native: "Türkçe" },
];

function getRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

function findLanguage(code: string) {
  if (code === "auto") return { code: "auto", label: "Auto", native: "Browser" };
  return [...INDIAN_LANGUAGES, ...INTERNATIONAL_LANGUAGES].find((item) => item.code === code) ?? { code, label: code };
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
  showLanguageMenu = true,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
  iconClassName?: string;
  label?: string;
  showLanguageMenu?: boolean;
}) {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const [language, setLanguage] = useState("auto");
  const [lastError, setLastError] = useState("");

  useEffect(() => {
    setSupported(Boolean(getRecognitionConstructor()));
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored) setLanguage(stored);
    return () => recognitionRef.current?.abort();
  }, []);

  const selectedLanguage = useMemo(() => findLanguage(language), [language]);

  const changeLanguage = (nextLanguage: string) => {
    if (recording) recognitionRef.current?.stop();
    setRecording(false);
    setLanguage(nextLanguage);
    setLastError("");
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, nextLanguage);
  };

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
    recognition.lang = language === "auto" ? navigator.language || "en-US" : language;
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
    : lastError || (recording ? `Listening · ${selectedLanguage.label}` : `${label} · ${selectedLanguage.label}`);

  return (
    <span className="inline-flex items-center gap-0.5" title={tooltip}>
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={disabled || !supported}
        aria-label={recording ? "Stop voice input" : label}
        aria-pressed={recording}
        className={cn(
          "relative inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40",
          recording && "border-red-400/50 bg-red-500/15 text-red-200 before:absolute before:inset-[-3px] before:rounded-full before:border before:border-red-400/25 before:animate-pulse",
          className,
        )}
      >
        {recording ? <MicOff className={cn("size-4", iconClassName)} /> : <Mic className={cn("size-4", iconClassName)} />}
      </button>

      {showLanguageMenu && supported ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={disabled || recording}
              className="inline-flex h-7 items-center gap-1 rounded-full px-1.5 text-[11px] text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
              aria-label="Select voice input language"
            >
              <Languages className="size-3.5" aria-hidden="true" />
              <ChevronDown className="size-3" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[min(420px,80vh)] w-72 overflow-y-auto rounded-2xl p-2">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Speech language</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => changeLanguage("auto")} className="justify-between rounded-xl">
              <span>Auto · Browser language</span>
              {language === "auto" ? <Check className="size-4" /> : null}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Indian regional</DropdownMenuLabel>
            {INDIAN_LANGUAGES.map((item) => (
              <DropdownMenuItem key={item.code} onClick={() => changeLanguage(item.code)} className="justify-between rounded-xl">
                <span className="min-w-0 truncate">{item.label} <span className="text-muted-foreground">· {item.native}</span></span>
                {language === item.code ? <Check className="size-4" /> : null}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">International</DropdownMenuLabel>
            {INTERNATIONAL_LANGUAGES.map((item) => (
              <DropdownMenuItem key={item.code} onClick={() => changeLanguage(item.code)} className="justify-between rounded-xl">
                <span className="min-w-0 truncate">{item.label} <span className="text-muted-foreground">· {item.native}</span></span>
                {language === item.code ? <Check className="size-4" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </span>
  );
}

export { transcriptJoin };
