"use client";

import type { ReactNode } from "react";
import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { PanelLeftOpen } from "lucide-react";

export type BuilderMode = "preview" | "code" | "design" | "database" | "canvas";

export function BackendSetupPanel({
  envKeys,
  onConfigure,
}: {
  envKeys: string[];
  onConfigure: () => void;
}) {
  return (
    <div className="border-b border-border/60 px-4 py-3">
      <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Database className="size-4 text-muted-foreground" aria-hidden="true" /> Backend setup
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Neon/Postgres + Prisma files are enabled for this build. Add required variables before
              deploy.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 rounded-lg"
            onClick={onConfigure}
          >
            Configure
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {envKeys.map((key) => (
            <span
              key={key}
              className="rounded-md border border-border/70 px-2 py-1 font-mono text-[11px] text-muted-foreground"
            >
              {key}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BuilderModeButton({
  mode,
  current,
  label,
  icon,
  onClick,
  compact,
}: {
  mode: BuilderMode;
  current: BuilderMode;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  compact?: boolean;
}) {
  const active = current === mode;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
        active
          ? "border-fuchsia-400/35 bg-[linear-gradient(135deg,rgba(244,114,182,0.2),rgba(168,85,247,0.16),rgba(251,191,36,0.1))] text-zinc-50 shadow-[0_0_18px_rgba(244,114,182,0.16)]"
          : "border-transparent text-muted-foreground hover:border-violet-400/20 hover:bg-zinc-900 hover:text-zinc-100"
      } ${compact ? "w-full" : ""}`}
      title={label}
    >
      <span aria-hidden="true" className={active ? "text-amber-300" : "text-violet-300"}>
        {icon}
      </span>
      <span className={compact ? "sr-only" : "hidden lg:inline"}>{label}</span>
    </button>
  );
}

export function ProjectMenuItem({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? "text-red-400" : "text-foreground"
      }`}
    >
      <span className={danger ? "text-red-400" : "text-muted-foreground"}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

export function SheetAction({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 rounded-md border border-fuchsia-500/15 bg-zinc-950/80 px-3 py-2 text-left text-xs text-foreground shadow-[0_0_0_1px_rgba(168,85,247,0.08)] transition hover:border-violet-400/25 hover:bg-zinc-900 disabled:opacity-40"
    >
      <span className="text-amber-300">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export function OpenAppMenuAction({ onOpen }: { onOpen: () => void }) {
  const { setOpenMobile } = useSidebar();

  return (
    <SheetAction
      icon={<PanelLeftOpen className="size-4" />}
      label="Main app menu"
      onClick={() => {
        onOpen();
        setOpenMobile(true);
      }}
    />
  );
}
