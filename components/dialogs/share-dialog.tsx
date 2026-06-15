'use client';

import { useState } from 'react';
import { Copy, Check, Mail } from 'lucide-react';
import clsx from 'clsx';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ShareDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
  chatId: string;
  title: string;
}

export function ShareDialog({
  isOpen = false,
  onClose,
  chatId,
  title,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${chatId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Share &ldquo;{title}&rdquo;</AlertDialogTitle>
          <AlertDialogDescription>
            Copy a link or share this chat with others.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Share Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-sm text-muted-foreground"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={clsx(
                  'rounded-lg px-3 py-2 transition-colors',
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700',
                )}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Share via Email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter email address"
                className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm placeholder:text-muted-foreground"
              />
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-3 py-2 text-white transition-colors hover:bg-blue-700"
              >
                <Mail className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <label className="mb-2 block text-sm font-medium text-foreground">
              Privacy
            </label>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="privacy" defaultChecked />
                <span className="text-sm text-foreground">
                  Private (shareable link only)
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="privacy" />
                <span className="text-sm text-foreground">
                  Public (visible in gallery)
                </span>
              </label>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}