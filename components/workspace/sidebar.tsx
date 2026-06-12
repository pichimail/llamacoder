'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Plus, Menu } from 'lucide-react';
import { getChatsList } from '@/app/actions/chat';
import clsx from 'clsx';

interface SidebarProps {
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function WorkspaceSidebar({ isCollapsed = false, onCollapsedChange }: SidebarProps) {
  const [showFavorites, setShowFavorites] = useState(true);
  const [showRecent, setShowRecent] = useState(true);

  return (
    <aside
      className={clsx(
        'flex flex-col border-r border-border bg-muted/30 transition-all duration-200',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        {!isCollapsed && (
          <h2 className="text-sm font-semibold text-foreground">Projects</h2>
        )}
        <button
          onClick={() => onCollapsedChange?.(!isCollapsed)}
          className="p-1 hover:bg-accent rounded"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-2">
        <Link
          href="/chats"
          className={clsx(
            'flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 text-sm font-medium',
            isCollapsed && 'justify-center'
          )}
        >
          <Plus className="h-4 w-4" />
          {!isCollapsed && <span>New Chat</span>}
        </Link>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/50 my-2" />

      {/* Favorites Section */}
      <div className="flex-1 overflow-y-auto px-2">
        {!isCollapsed && (
          <div className="mb-4">
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground p-2 w-full"
            >
              <ChevronDown
                className={clsx(
                  'h-3 w-3 transition-transform',
                  !showFavorites && '-rotate-90'
                )}
              />
              <span>Favorites</span>
            </button>
            {showFavorites && (
              <div className="space-y-1 ml-2">
                <div className="text-xs text-muted-foreground py-4 text-center">
                  No favorites yet
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Section */}
        {!isCollapsed && (
          <div>
            <button
              onClick={() => setShowRecent(!showRecent)}
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground p-2 w-full"
            >
              <ChevronDown
                className={clsx(
                  'h-3 w-3 transition-transform',
                  !showRecent && '-rotate-90'
                )}
              />
              <span>Recent</span>
            </button>
            {showRecent && (
              <div className="space-y-1 ml-2">
                <div className="text-xs text-muted-foreground py-4 text-center">
                  No recent chats
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Footer */}
      <div className="border-t border-border p-3">
        {!isCollapsed && (
          <div className="text-xs text-muted-foreground">
            Signed in as user
          </div>
        )}
      </div>
    </aside>
  );
}
