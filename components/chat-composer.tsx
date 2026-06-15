'use client';

import { useRef, useState, useEffect } from 'react';
import { Send, Loader2, Plus } from 'lucide-react';
import clsx from 'clsx';

interface ChatComposerProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatComposer({
  onSubmit,
  isLoading = false,
  placeholder = 'Type your message here...',
}: ChatComposerProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(
        textareaRef.current.scrollHeight,
        200
      ) + 'px';
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    onSubmit(message);
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border bg-background p-4"
    >
      <div className="flex items-end gap-3">
        <button
          type="button"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors flex-shrink-0"
          title="Add attachment"
        >
          <Plus className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className={clsx(
              'w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm',
              'placeholder:text-muted-foreground transition-colors focus:border-foreground/20 focus:outline-none focus:ring-0',
              'resize-none max-h-[200px]',
              isLoading && 'opacity-60 cursor-not-allowed'
            )}
            rows={1}
          />
        </div>

        <button
          type="submit"
          disabled={!message.trim() || isLoading}
          className={clsx(
            'p-2 rounded-lg transition-colors flex-shrink-0',
            message.trim() && !isLoading
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Shift + Enter for new line
      </p>
    </form>
  );
}
