"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Terminal,
  TerminalActions,
  TerminalClearButton,
  TerminalContent,
  TerminalCopyButton,
  TerminalHeader,
  TerminalTitle,
} from "@/components/ai-elements/terminal";

type Line = { kind: "in" | "out" | "err"; text: string };

function tokenizeTerminalLine(text: string) {
  const segments: Array<{ text: string; className?: string }> = [];
  const pattern = /(\$|>|✓|✗|\b\d+(?:\.\d+)?\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }

    const token = match[0];
    const className =
      token === "$"
        ? "text-fuchsia-400"
        : token === ">"
          ? "text-cyan-400"
          : token === "✓"
            ? "text-emerald-400"
            : token === "✗"
              ? "text-red-400"
              : "text-sky-400";

    segments.push({ text: token, className });
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return segments;
}

function NeonTerminalLine({ text }: { text: string }) {
  const segments = useMemo(() => tokenizeTerminalLine(text), [text]);
  return (
    <span className="whitespace-pre-wrap break-words">
      {segments.map((segment, index) => (
        <span key={`${segment.text}-${index}`} className={segment.className}>
          {segment.text}
        </span>
      ))}
    </span>
  );
}

export default function BuilderTerminal({
  files,
  onCreateFile,
  onDeleteFile,
  onInstall,
  deps,
}: {
  files: Array<{ path: string; code: string }>;
  onCreateFile: (path: string, code?: string) => void;
  onDeleteFile: (path: string) => void;
  onInstall: (pkg: string, version?: string) => void;
  deps: Record<string, string>;
}) {
  const [lines, setLines] = useState<Line[]>([
    {
      kind: "out",
      text: "chinna-coder sandbox shell — type `help` for commands. Ops apply live to the preview workspace.",
    },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const outputText = useMemo(
    () =>
      lines
        .map((line) =>
          line.kind === "in" ? `➜ ${line.text}` : line.text,
        )
        .join("\n"),
    [lines],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const print = (text: string, kind: Line["kind"] = "out") =>
    setLines((l) => [...l, { kind, text }]);

  const run = (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    setLines((l) => [...l, { kind: "in", text: cmd }]);
    setHistory((h) => [cmd, ...h].slice(0, 50));
    setHistIdx(-1);

    const [name, ...args] = cmd.split(/\s+/);

    switch (name) {
      case "help":
        print(
          [
            "Workspace shell (runs against the live Sandpack preview):",
            "  ls                      list files",
            "  cat <path>              print a file",
            "  touch <path>            create empty file",
            "  mkdir <dir>             create folder (via .gitkeep)",
            "  rm <path>               delete file",
            "  echo <text> > <path>    write text to file",
            "  npm install <pkg>[@v]   add dependency to the preview",
            "  npm ls                  list extra dependencies",
            "  clear                   clear terminal",
          ].join("\n"),
        );
        break;
      case "clear":
        setLines([]);
        break;
      case "ls": {
        if (files.length === 0) print("(empty workspace)");
        else print(files.map((f) => f.path).join("\n"));
        break;
      }
      case "cat": {
        const f = files.find((x) => x.path === args[0]);
        if (!f) print(`cat: ${args[0] || "?"}: no such file`, "err");
        else print(f.code || "(empty)");
        break;
      }
      case "touch": {
        if (!args[0]) return print("usage: touch <path>", "err");
        if (files.some((f) => f.path === args[0]))
          return print(`touch: ${args[0]} exists`, "err");
        onCreateFile(args[0], "");
        print(`created ${args[0]}`);
        break;
      }
      case "mkdir": {
        if (!args[0]) return print("usage: mkdir <dir>", "err");
        const keep = `${args[0].replace(/\/+$/, "")}/.gitkeep`;
        onCreateFile(keep, "");
        print(`created folder ${args[0]}`);
        break;
      }
      case "rm": {
        if (!args[0]) return print("usage: rm <path>", "err");
        if (!files.some((f) => f.path === args[0]))
          return print(`rm: ${args[0]}: no such file`, "err");
        onDeleteFile(args[0]);
        print(`removed ${args[0]}`);
        break;
      }
      case "echo": {
        const gt = args.indexOf(">");
        if (gt === -1 || !args[gt + 1])
          return print("usage: echo <text> > <path>", "err");
        const text = args.slice(0, gt).join(" ");
        onCreateFile(args[gt + 1], text);
        print(`wrote ${args[gt + 1]}`);
        break;
      }
      case "npm":
      case "pnpm":
      case "yarn": {
        const sub = args[0];
        if (sub === "ls" || sub === "list") {
          const entries = Object.entries(deps);
          print(
            entries.length
              ? entries.map(([k, v]) => `${k}@${v}`).join("\n")
              : "(no extra dependencies)",
          );
          break;
        }
        if (sub !== "install" && sub !== "i" && sub !== "add")
          return print(`unsupported: ${name} ${sub || ""}`, "err");
        const pkgs = args.slice(1).filter((a) => !a.startsWith("-"));
        if (pkgs.length === 0) return print("usage: npm install <pkg>", "err");
        for (const p of pkgs) {
          const at = p.lastIndexOf("@");
          const hasVer = at > 0;
          const pkg = hasVer ? p.slice(0, at) : p;
          const ver = hasVer ? p.slice(at + 1) : "latest";
          onInstall(pkg, ver);
          print(`+ ${pkg}@${ver} (preview will reload)`);
        }
        break;
      }
      default:
        print(`command not found: ${name} — try \`help\``, "err");
    }
  };

  return (
    <Terminal
      output={outputText}
      onClear={() => setLines([])}
      className="h-full rounded-none border-0 border-t border-zinc-800"
      onClick={() => inputRef.current?.focus()}
      role="region"
      aria-label="Workspace terminal"
    >
      <TerminalHeader className="border-zinc-800 bg-zinc-950 px-3 py-1.5">
        <TerminalTitle className="text-xs">Workspace shell</TerminalTitle>
        <TerminalActions>
          <TerminalCopyButton />
          <TerminalClearButton />
        </TerminalActions>
      </TerminalHeader>
      <TerminalContent className="max-h-none min-h-0 flex-1 px-3 py-2 text-[12px]">
        {lines.map((line, index) => (
          <div
            key={index}
            className={
              line.kind === "in"
                ? "text-zinc-100"
                : line.kind === "err"
                  ? "whitespace-pre-wrap text-red-400"
                  : "whitespace-pre-wrap text-zinc-400"
            }
          >
            {line.kind === "in" ? (
              <span>
                <span className="text-emerald-400">➜ </span>
                <NeonTerminalLine text={line.text} />
              </span>
            ) : (
              <NeonTerminalLine text={line.text} />
            )}
          </div>
        ))}
        <div ref={endRef} />
      </TerminalContent>
      <div className="flex shrink-0 items-center gap-2 border-t border-zinc-800 bg-zinc-950 px-3 py-1.5">
        <span className="text-emerald-400">➜</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              run(input);
              setInput("");
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              const next = Math.min(histIdx + 1, history.length - 1);
              if (history[next] !== undefined) {
                setHistIdx(next);
                setInput(history[next]);
              }
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              const next = histIdx - 1;
              setHistIdx(next);
              setInput(next >= 0 ? history[next] : "");
            }
          }}
          placeholder="help"
          aria-label="Terminal command input"
          className="w-full bg-transparent text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
        />
      </div>
    </Terminal>
  );
}
