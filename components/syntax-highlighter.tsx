"use client";

import { cn } from "@/lib/utils";

type NeonCodeProps = {
  code: string;
  language?: string;
  className?: string;
};

function highlightHtml(code: string) {
  const htmlTokenRe =
    /(&lt;!--[\s\S]*?--&gt;|&lt;\/?[a-zA-Z][\w:-]*|\/?&gt;|=[\s]*"[^"]*"|=[\s]*'[^']*'|&quot;[^&]*?&quot;|\b(?:\d+(?:\.\d+)?)\b|#[0-9a-fA-F]{3,8}\b|\b(?:true|false|null|undefined)\b|[a-zA-Z_:][-a-zA-Z0-9_:.]*)(?=[^<]*>|[^&]*;|[^"]*"|[^']*'|$)/g;
  const parts: Array<{ text: string; className?: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = htmlTokenRe.exec(code)) !== null) {
    if (match.index > lastIndex) parts.push({ text: code.slice(lastIndex, match.index) });
    const token = match[0];
    const className =
      token.startsWith("&lt;!--")
        ? "text-slate-500"
        : token.startsWith("&lt;")
          ? "text-fuchsia-400"
          : token.startsWith("/&gt;") || token === "&gt;"
            ? "text-fuchsia-400"
            : /^=/.test(token)
              ? "text-sky-300"
              : /^("|'|&quot;)/.test(token)
                ? "text-emerald-300"
                : /^\d/.test(token) || /^#/.test(token)
                  ? "text-cyan-300"
                  : /^(true|false|null|undefined)$/.test(token)
                    ? "text-violet-300"
                    : "text-amber-300";
    parts.push({ text: token, className });
    lastIndex = match.index + token.length;
  }

  if (lastIndex < code.length) parts.push({ text: code.slice(lastIndex) });
  return parts;
}

function NeonCode({ code, language, className }: NeonCodeProps) {
  if ((language || "").toLowerCase() !== "html" && (language || "").toLowerCase() !== "xhtml") {
    return (
      <pre className={cn("overflow-auto rounded-md border border-border bg-zinc-950 px-3 py-2 font-mono text-xs leading-6 text-zinc-100", className)}>
        <code>{code}</code>
      </pre>
    );
  }

  const highlighted = highlightHtml(code.replace(/</g, "&lt;").replace(/>/g, "&gt;"));

  return (
    <pre className={cn("overflow-auto rounded-md border border-fuchsia-500/20 bg-zinc-950 px-3 py-2 font-mono text-xs leading-6 text-zinc-100 shadow-[0_0_0_1px_rgba(217,70,239,0.12),0_0_24px_rgba(34,211,238,0.08)]", className)}>
      <code>
        {highlighted.map((part, index) => (
          <span key={`${part.text}-${index}`} className={part.className}>
            {part.text}
          </span>
        ))}
      </code>
    </pre>
  );
}

export default NeonCode;
