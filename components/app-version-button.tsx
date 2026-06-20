import ArrowLeftIcon from "@/components/icons/arrow-left";
import { toTitleCase } from "@/lib/utils";

export function AppVersionButton({
  version,
  filename,
  fileCount,
  appTitle,
  generating,
  disabled,
  onClick,
  isActive,
}: {
  version: number;
  filename?: { name: string; extension: string };
  fileCount?: number;
  appTitle?: string;
  generating?: boolean;
  disabled: boolean;
  onClick?: () => void;
  isActive?: boolean;
}) {
  return (
    <div className="my-4">
      <button
        disabled={disabled}
        className={`inline-flex w-full items-center gap-2 rounded-xl border p-2 text-foreground shadow-[0_0_0_1px_rgba(217,70,239,0.12),0_12px_32px_rgba(0,0,0,0.28)] transition ${
          generating
            ? "animate-pulse border-fuchsia-500/40 bg-zinc-950/90"
            : isActive !== undefined
              ? isActive
                ? "border-fuchsia-500/35 bg-[linear-gradient(135deg,rgba(244,114,182,0.16),rgba(168,85,247,0.14),rgba(251,191,36,0.08))]"
                : "border-border/70 bg-zinc-950/80 hover:border-violet-400/30 hover:bg-zinc-900"
              : "border-border/70 bg-zinc-950/90"
        }`}
        onClick={onClick}
      >
        <div
          className={`flex size-10 items-center justify-center rounded-lg border font-bold ${
            isActive !== undefined
              ? isActive
                ? "border-fuchsia-400/30 bg-fuchsia-500/12 text-fuchsia-200 shadow-[0_0_18px_rgba(244,114,182,0.22)]"
                : "border-violet-400/20 bg-violet-500/10 text-violet-200"
              : "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100"
          }`} aria-hidden="true"
        >
          V{version}
        </div>
        <div className="flex flex-col gap-0.5 text-left leading-none">
          {generating ? (
            <div className="text-sm font-medium leading-none">
              Generating...
            </div>
          ) : fileCount ? (
            <>
              <div className="text-sm font-medium leading-none text-zinc-50">
                Version {version}
                {appTitle ? ` - ${appTitle}` : ""}
              </div>
              <div className="text-xs leading-none text-zinc-400">
                {fileCount} file{fileCount !== 1 ? "s" : ""} edited
              </div>
            </>
          ) : filename ? (
            <>
              <div className="text-sm font-medium leading-none text-zinc-50">
                {toTitleCase(filename.name)} {version !== 1 && `v${version}`}
              </div>
              <div className="text-xs leading-none text-zinc-400">
                {filename.name}
                {version !== 1 && `-v${version}`}
                {"."}
                {filename.extension}
              </div>
            </>
          ) : null}
        </div>
        {!generating && (
          <div className="ml-auto text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.32)]">
            {isActive ? (
              <ArrowLeftIcon />
            ) : (
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11 0.5L11 11M5.16667 2.25L8.66667 5.75M8.66667 5.75L5.16667 9.25M8.66667 5.75L0.5 5.75"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        )}
      </button>
    </div>
  );
}
