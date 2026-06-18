"use client";

import { cn } from "@/lib/utils";

type TextColorWord = {
  text: string;
  foregroundClass: string;
  backgroundClass: string;
  offsetClass?: string;
};

const DEFAULT_WORDS: TextColorWord[] = [
  {
    text: "Build.",
    foregroundClass: "from-gradient-1-start to-gradient-1-end animate-gradient-foreground-1",
    backgroundClass: "before:animate-gradient-background-1 before:bottom-4 sm:before:top-0",
  },
  {
    text: "Preview.",
    foregroundClass: "from-gradient-2-start to-gradient-2-end animate-gradient-foreground-2",
    backgroundClass: "before:animate-gradient-background-2 sm:before:top-0",
  },
  {
    text: "Ship.",
    foregroundClass: "from-gradient-3-start to-gradient-3-end animate-gradient-foreground-3",
    backgroundClass: "before:animate-gradient-background-3 before:bottom-1 sm:before:top-0",
  },
];

function AnimatedWord({ text, foregroundClass, backgroundClass, offsetClass }: TextColorWord) {
  return (
    <span
      data-content={text}
      className={cn(
        "relative before:absolute before:left-0 before:top-0 before:z-0 before:w-full before:px-2 before:content-[attr(data-content)] before:text-slate-900 dark:before:text-white",
        backgroundClass,
        offsetClass,
      )}
    >
      <span
        className={cn(
          "relative z-[1] bg-gradient-to-r bg-clip-text px-2 text-transparent sm:px-5",
          foregroundClass,
        )}
      >
        {text}
      </span>
    </span>
  );
}

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
          className="relative flex select-none flex-col px-3 py-2 text-center text-5xl font-extrabold leading-none tracking-tighter sm:text-7xl md:flex-col lg:flex-row lg:justify-center"
        >
          {words.map((word) => (
            <AnimatedWord key={word.text} {...word} />
          ))}
        </h1>
      </div>
    </div>
  );
}
