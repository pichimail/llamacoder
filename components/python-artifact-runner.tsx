"use client";

import { useMemo } from "react";
import type { ArtifactRuntime } from "@/lib/artifact-runtime";

type ArtifactFile = { path: string; content: string };

function parseStreamlitPreview(code: string) {
  const title = code.match(/st\.title\(\s*["'`]([^"'`]+)["'`]/);
  const header = code.match(/st\.header\(\s*["'`]([^"'`]+)["'`]/);
  const metrics = [...code.matchAll(/st\.metric\(\s*["'`]([^"'`]+)["'`]\s*,\s*["'`]?([^"'`),\n]+)/g)];
  const buttons = [...code.matchAll(/st\.button\(\s*["'`]([^"'`]+)["'`]/g)];
  const writes = [...code.matchAll(/st\.write\(\s*["'`]([^"'`]+)["'`]/g)];

  return {
    title: title?.[1] || header?.[1] || "Streamlit App",
    metrics: metrics.map((match) => ({ label: match[1], value: match[2] })),
    buttons: buttons.map((match) => match[1]),
    writes: writes.map((match) => match[1]),
  };
}

export default function PythonArtifactRunner({
  files,
  runtime,
  stack,
}: {
  files: ArtifactFile[];
  runtime: ArtifactRuntime;
  stack?: any;
}) {
  const primary = files.find((file) => file.path.endsWith(".py")) ?? files[0];
  const preview = useMemo(
    () => (runtime === "streamlit" ? parseStreamlitPreview(primary?.content || "") : null),
    [primary?.content, runtime],
  );

  return (
    <div className="flex h-full min-h-[420px] flex-col gap-0 md:flex-row">
      <div className="min-h-0 flex-1 overflow-auto border-b border-border/70 bg-[#0d1117] p-4 font-mono text-xs text-[#c9d1d9] md:border-b-0 md:border-r">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          {primary?.path || "app.py"}
        </div>
        <pre className="whitespace-pre-wrap">{primary?.content || "# No Python source"}</pre>
      </div>
      <div className="flex min-h-[280px] flex-1 flex-col bg-background p-5">
        <div className="mb-3 text-xs text-muted-foreground">
          {runtime === "streamlit" ? "Streamlit preview (simulated)" : "Python artifact"}
          {stack && <span className="ml-2 text-[10px] opacity-60">• {stack.stack}</span>}
        </div>
        {runtime === "streamlit" && preview ? (
          <div className="space-y-4 rounded-xl border border-border/70 bg-card p-5">
            <h2 className="text-2xl font-semibold tracking-tight">{preview.title}</h2>
            {preview.metrics.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {preview.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-lg border border-border/70 px-3 py-2"
                  >
                    <div className="text-xs text-muted-foreground">{metric.label}</div>
                    <div className="mt-1 text-lg font-semibold">{metric.value}</div>
                  </div>
                ))}
              </div>
            ) : null}
            {preview.writes.map((line) => (
              <p key={line} className="text-sm text-muted-foreground">
                {line}
              </p>
            ))}
            <div className="flex flex-wrap gap-2">
              {preview.buttons.map((label) => (
                <button
                  key={label}
                  type="button"
                  disabled
                  title="Simulated Streamlit preview — buttons are visual placeholders only"
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground opacity-80"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
            Python scripts run outside the React sandbox. Use the generated <strong>bootstrap.sh</strong> or <strong>RUN.md</strong> (auto-created on Git import) for the exact commands (pip install, uvicorn, etc). Paste Git URL to auto-detect + generate.
          </div>
        )}
        {stack?.devCommand && <div className="text-[10px] mt-1 font-mono opacity-70">Detected: {stack.devCommand}</div>}
        <p className="mt-auto pt-4 text-[11px] text-muted-foreground">
          Tip: ask the agent for a Streamlit dashboard with `st.title`, `st.metric`, and `st.button` widgets.
        </p>
      </div>
    </div>
  );
}