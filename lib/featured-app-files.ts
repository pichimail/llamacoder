import "server-only";

import { getPrisma } from "@/lib/prisma";
import { examples } from "@/lib/shadcn-examples";
import { extractAllCodeBlocks } from "@/lib/utils";
import type { FeaturedApp } from "@/lib/featured-apps";

function normalizeSandboxPath(path: string) {
  return path.replace(/^\/+/, "").replace(/^src\//, "");
}

export function getSandboxFilesFromExample(exampleKey: string) {
  const example = examples[exampleKey as keyof typeof examples];
  if (!example) return [];

  return extractAllCodeBlocks(example.response).map((file) => ({
    path: normalizeSandboxPath(file.path),
    content: file.code,
  }));
}

export async function getFilesForFeaturedApp(app: FeaturedApp) {
  if (app.messageId) {
    const prisma = getPrisma();
    const message = await prisma.message.findUnique({
      where: { id: app.messageId },
      select: { content: true, files: true },
    });

    if (message) {
      const stored = message.files as Array<{ path: string; code?: string; content?: string }> | null;
      if (stored?.length) {
        return stored.map((file) => ({
          path: normalizeSandboxPath(file.path),
          content: file.code ?? file.content ?? "",
        }));
      }

      return extractAllCodeBlocks(message.content).map((file) => ({
        path: normalizeSandboxPath(file.path),
        content: file.code,
      }));
    }
  }

  if (app.exampleKey) {
    return getSandboxFilesFromExample(app.exampleKey);
  }

  return [];
}