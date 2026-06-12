'use client';

import { useEffect, useRef } from 'react';
import { Copy, RefreshCw, Edit2 } from 'lucide-react';
import clsx from 'clsx';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
  files?: any;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
}

export function ChatMessages({ messages, isLoading = false }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-6 space-y-4 bg-background"
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-center">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No messages yet
            </h3>
            <p className="text-sm text-muted-foreground">
              Start a conversation by typing a message below
            </p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                🤖
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div
      className={clsx(
        'flex gap-3 group',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div
        className={clsx(
          'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm',
          isUser ? 'bg-blue-600 text-white' : 'bg-muted'
        )}
      >
        {isUser ? '👤' : '🤖'}
      </div>

      <div className={clsx('flex-1 max-w-2xl', isUser && 'flex flex-col items-end')}>
        <div
          className={clsx(
            'rounded-lg px-4 py-3 text-sm',
            isUser
              ? 'bg-blue-600 text-white rounded-br-none'
              : 'bg-muted/50 text-foreground rounded-bl-none'
          )}
        >
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </p>
        </div>

        {!isUser && (
          <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Copy"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Regenerate"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Edit"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
