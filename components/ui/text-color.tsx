"use client";

import { cn } from "@/lib/utils";

type TextColorWord = {
  text: string;
  className: string;
};

const DEFAULT_WORDS: TextColorWord[] = [
  { text: "Build.", className: "text-[#159A55]" },
  { text: "Preview.", className: "text-[#9F2459]" },
  { text: "Ship.", className: "text-[#071124]" },
];

type TextColorProps = {
  className?: string;
  words?: TextColorWord[];
};

export function TextColor({ className, words = DEFAULT_WORDS }: TextColorProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="relative w-full px-2">
        <h1
          id="hero-headline"
          className="relative flex select-none flex-col items-center justify-center gap-0 px-3 py-2 text-center text-5xl font-extrabold leading-none tracking-tighter drop-shadow-[0_14px_32px_rgba(15,23,42,0.12)] sm:text-7xl md:flex-row md:gap-4"
        >
          {words.map((word) => (
            <span key={word.text} className={cn("px-1.5 sm:px-2", word.className)}>
              {word.text}
            </span>
          ))}
        </h1>
      </div>
    </div>
  );
}
