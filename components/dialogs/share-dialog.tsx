'use client';

import { useState } from 'react';
import { Copy, Check, Link as LinkIcon, Mail } from 'lucide-react';
import clsx from 'clsx';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg border border-border max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Share &ldquo;{title}&rdquo;
        </h2>

        <div className="space-y-4">
          {/* Link Sharing */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Share Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm font-mono text-muted-foreground"
              />
              <button
                onClick={handleCopy}
                className={clsx(
                  'px-3 py-2 rounded-lg transition-colors',
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
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

          {/* Email Sharing */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Share via Email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter email address"
                className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm placeholder:text-muted-foreground"
              />
              <button className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Mail className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="border-t border-border pt-4">
            <label className="text-sm font-medium text-foreground block mb-2">
              Privacy
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="privacy" defaultChecked />
                <span className="text-sm text-foreground">Private (shareable link only)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="privacy" />
                <span className="text-sm text-foreground">Public (visible in gallery)</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
