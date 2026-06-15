'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Pin,
  PinOff,
  Trash2,
  Copy,
  MessageSquare,
} from 'lucide-react';
import { ConfirmAlertDialog } from '@/components/confirm-alert-dialog';
import { toast } from '@/hooks/use-toast';
import {
  renameChat,
  deleteChat,
  pinChat,
  duplicateChat,
} from '@/app/actions/chat';
interface Chat {
  id: string;
  title: string;
  prompt: string;
  createdAt: Date;
  isPinned: boolean;
  isArchived: boolean;
}

interface ChatsListProps {
  chats: Chat[];
  onUpdate?: () => void;
}

export function ChatsList({ chats, onUpdate }: ChatsListProps) {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const pinnedChats = chats.filter((c) => c.isPinned && !c.isArchived);
  const recentChats = chats.filter((c) => !c.isPinned && !c.isArchived);

  const handleRename = async (chatId: string) => {
    if (!newTitle.trim()) return;
    try {
      await renameChat(chatId, newTitle);
      setRenaming(null);
      onUpdate?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to rename chat',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteChat(deleteTarget);
      setDeleteTarget(null);
      onUpdate?.();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete chat',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePin = async (chatId: string, isPinned: boolean) => {
    try {
      await pinChat(chatId, !isPinned);
      onUpdate?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to pin chat',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async (chatId: string) => {
    try {
      await duplicateChat(chatId);
      toast({
        title: 'Success',
        description: 'Chat duplicated',
      });
      onUpdate?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to duplicate chat',
        variant: 'destructive',
      });
    }
  };

  const ChatItem = ({ chat }: { chat: Chat }) => (
    <div
      key={chat.id}
      className="group relative flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-4 hover:bg-muted/50 transition-colors"
      onMouseEnter={() => setSelectedChat(chat.id)}
      onMouseLeave={() => setSelectedChat(null)}
    >
      <Link href={`/chats/${chat.id}`} className="flex-1 min-w-0">
        <div className="flex items-start gap-3 min-w-0">
          <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            {renaming === chat.id ? (
              <input
                autoFocus
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(chat.id);
                  if (e.key === 'Escape') setRenaming(null);
                }}
                className="w-full bg-background border border-border rounded px-2 py-1 text-sm"
                onClick={(e) => e.preventDefault()}
              />
            ) : (
              <h3 className="font-medium text-foreground truncate text-sm">
                {chat.title}
              </h3>
            )}
            <p className="text-xs text-muted-foreground truncate mt-1">
              {chat.prompt.slice(0, 60)}...
            </p>
          </div>
        </div>
      </Link>

      {selectedChat === chat.id && (
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => handlePin(chat.id, chat.isPinned)}
            className="p-2 hover:bg-accent rounded"
            title={chat.isPinned ? 'Unpin' : 'Pin'}
          >
            {chat.isPinned ? (
              <PinOff className="h-4 w-4" />
            ) : (
              <Pin className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => {
              setRenaming(chat.id);
              setNewTitle(chat.title);
            }}
            className="p-2 hover:bg-accent rounded text-xs"
            title="Rename"
          >
            ✏️
          </button>
          <button
            onClick={() => handleDuplicate(chat.id)}
            className="p-2 hover:bg-accent rounded"
            title="Duplicate"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(chat.id)}
            className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
    <ConfirmAlertDialog
      open={deleteTarget !== null}
      onOpenChange={(open) => {
        if (!open && !isDeleting) setDeleteTarget(null);
      }}
      title="Delete chat?"
      description="This action cannot be undone. The chat and all of its messages will be permanently removed."
      confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
      cancelLabel="Cancel"
      destructive
      onConfirm={handleDeleteConfirm}
    />
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Pinned Section */}
        {pinnedChats.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Pinned
            </h2>
            <div className="space-y-3">
              {pinnedChats.map((chat) => (
                <ChatItem key={chat.id} chat={chat} />
              ))}
            </div>
          </div>
        )}

        {/* Recent Section */}
        {recentChats.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Recent
            </h2>
            <div className="space-y-3">
              {recentChats.map((chat) => (
                <ChatItem key={chat.id} chat={chat} />
              ))}
            </div>
          </div>
        )}

        {chats.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No chats yet
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Create your first chat to get started
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create Chat
            </Link>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
