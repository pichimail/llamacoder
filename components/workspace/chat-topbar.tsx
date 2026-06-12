'use client';

import { useState } from 'react';
import { Share2, GitBranch, Settings, Eye, Code } from 'lucide-react';
import clsx from 'clsx';

interface ChatTopbarProps {
  chatTitle: string;
  mode?: 'preview' | 'code' | 'database' | 'design';
  onModeChange?: (mode: string) => void;
  onShare?: () => void;
  onCreatePR?: () => void;
}

export function ChatTopbar({
  chatTitle,
  mode = 'preview',
  onModeChange,
  onShare,
  onCreatePR,
}: ChatTopbarProps) {
  const modes = [
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'code', label: 'Code', icon: Code },
  ];

  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-foreground truncate max-w-md">
          {chatTitle}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Mode Switcher */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {modes.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => onModeChange?.(m.id)}
                className={clsx(
                  'flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                  mode === m.id
                    ? 'bg-background text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <button
          onClick={onShare}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <button
          onClick={onCreatePR}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <GitBranch className="h-4 w-4" />
          <span className="hidden sm:inline">PR</span>
        </button>

        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>
    </header>
  );
}
