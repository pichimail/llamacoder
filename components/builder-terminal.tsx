"use client";

import { useEffect, useRef, useState } from "react";

type Line = { kind: "in" | "out" | "err"; text: string };

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
    <div
      className="flex h-full flex-col bg-background font-mono text-[12px]"
      onClick={() => inputRef.current?.focus()}
      role="region"
      aria-label="Workspace terminal"
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {lines.map((l, i) => (
          <div
            key={i}
            className={
              l.kind === "in"
                ? "text-foreground"
                : l.kind === "err"
                  ? "whitespace-pre-wrap text-red-500"
                  : "whitespace-pre-wrap text-muted-foreground"
            }
          >
            {l.kind === "in" ? (
              <span>
                <span className="text-emerald-500">➜ </span>
                {l.text}
              </span>
            ) : (
              l.text
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex shrink-0 items-center gap-2 border-t border-border px-3 py-1.5">
        <span className="text-emerald-500">➜</span>
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
          className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
        />
      </div>
    </div>
  );
}
