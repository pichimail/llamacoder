"use client";

import { useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function ScrambleText({ text, className = "" }: { text: string; className?: string }) {
  const [display, setDisplay] = useState(text);

  const scramble = () => {
    let iterations = 0;
    const interval = setInterval(() => {
      setDisplay(
        text
          .split("")
          .map((char, index) => {
            if (index < iterations) return text[index];
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("")
      );
      iterations += 1 / 3;
      if (iterations >= text.length) {
        clearInterval(interval);
        setDisplay(text);
      }
    }, 30);
  };

  return (
    <span
      className={className}
      onMouseEnter={scramble}
      style={{ cursor: "default" }}
    >
      {display}
    </span>
  );
}
