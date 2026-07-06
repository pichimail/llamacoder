'use client';

import { useRef, useState, useEffect } from 'react';
import { Send, Loader2, Plus, Paperclip, Mic, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DotFlow } from '@/components/ui/dot-flow';

interface ChatComposerProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  /** Show Claude-style streaming status with single-word artifact steps */
  isStreaming?: boolean;
  streamingWord?: string;
  onAttach?: () => void;
  onVoice?: () => void;
}

/**
 * Sleek v0.app-style chat composer, fully shadcn/ui based.
 * Rich contrast in dark, clean rounded surfaces, minimal chrome.
 * Supports Claude-like dotted loader + unique build words when streaming.
 */
export function ChatComposer({
  onSubmit,
  isLoading = false,
  placeholder = 'Describe the change or ask anything…',
  isStreaming = false,
  streamingWord,
  onAttach,
  onVoice,
}: ChatComposerProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const next = Math.min(textareaRef.current.scrollHeight, 220);
      textareaRef.current.style.height = next + 'px';
    }
  }, [message]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || isLoading || isStreaming) return;

    onSubmit(message.trim());
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const disabled = !message.trim() || isLoading || isStreaming;

  // Claude-style single unique words for building artifacts
  const buildWords = [
    'Scaffolding', 'Architecting', 'Composing', 'Wiring', 'Styling',
    'Refining', 'Polishing', 'Validating', 'Optimizing', 'Assembling'
  ];
  const currentWord = streamingWord || (isStreaming ? buildWords[Math.floor(Date.now() / 900) % buildWords.length] : '');

  return (
    <div className="chat-composer w-full">
      <form
        onSubmit={handleSubmit}
        className={cn(
          "relative rounded-2xl border border-border/80 bg-background/95 shadow-sm backdrop-blur",
          "focus-within:border-foreground/30 focus-within:shadow-md transition-all"
        )}
      >
        {/* Top subtle status row — Claude / v0 style */}
        {(isStreaming || isLoading) && (
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground">
            <DotFlow size={4} className="text-foreground/70" />
            <span className="font-medium tracking-tight text-foreground/80">
              {currentWord || 'Building'}
            </span>
            <span className="text-[10px] opacity-60">artifact</span>
            <div className="ml-auto flex items-center gap-1 text-[10px] opacity-50">Shift+Enter for newline</div>
          </div>
        )}

        <div className="flex items-end gap-2 px-3 pt-2.5 pb-2">
          {/* Left toolbar — shadcn buttons */}
          <div className="flex items-center gap-0.5 pb-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={onAttach}
              disabled={isLoading || isStreaming}
              aria-label="Attach file or image"
            >
              <Paperclip className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={onVoice}
              disabled={isLoading || isStreaming}
              aria-label="Voice input"
            >
              <Mic className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              disabled
              aria-label="Sparkle suggestions"
            >
              <Sparkles className="size-4" />
            </Button>
          </div>

          {/* Main input area */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading || isStreaming}
              className={cn(
                'w-full resize-none bg-transparent px-1 py-2 text-[15px] leading-snug placeholder:text-muted-foreground',
                'focus:outline-none min-h-[44px] max-h-[220px] text-foreground',
                (isLoading || isStreaming) && 'opacity-75'
              )}
              rows={1}
            />
          </div>

          {/* Send — rich contrast v0 style */}
          <Button
            type="submit"
            size="icon"
            disabled={disabled}
            className={cn(
              'mb-1 size-9 shrink-0 rounded-xl transition-all',
              !disabled
                ? 'bg-foreground text-background hover:bg-foreground/90 active:scale-[0.985]'
                : 'bg-muted text-muted-foreground'
            )}
            aria-label={isStreaming || isLoading ? 'Generating' : 'Send message'}
          >
            {isStreaming || isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>

        {/* Bottom hint row */}
        <div className="flex items-center justify-between border-t border-border/60 px-3 py-1 text-[10px] text-muted-foreground/70">
          <div>Model-aware • Context preserved</div>
          <div className="hidden sm:block">v0-style • rich dark</div>
        </div>
      </form>
    </div>
  );
}
