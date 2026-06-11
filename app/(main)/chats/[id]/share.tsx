"use client";

import ShareIcon from "@/components/icons/share-icon";
import { toast } from "@/hooks/use-toast";
import { Message } from "@prisma/client";

export function Share({ message }: { message?: Message }) {
  async function shareAction() {
    if (!message) return;

    const baseUrl = window.location.href;
    const shareUrl = new URL(`/share/v2/${message.id}`, baseUrl);

    toast({
      title: "App Published!",
      description: `App URL copied to clipboard: ${shareUrl.href}`,
      variant: "default",
    });

    await navigator.clipboard.writeText(shareUrl.href);
  }

  return (
    <form action={shareAction} className="flex">
      <button
        type="submit"
        disabled={!message}
        className="inline-flex items-center gap-1 rounded border border-gray-400 px-1.5 py-0.5 text-sm text-gray-700 enabled:hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:enabled:hover:bg-zinc-800" aria-label="Share published app link"
      >
        <ShareIcon className="size-3" />
        Share
      </button>
    </form>
  );
}
