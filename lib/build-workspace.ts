import { getPrisma } from "@/lib/prisma";

function normalizePath(path: string) {
  const cleaned = path.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
  if (!cleaned || cleaned === "." || cleaned.includes("..")) {
    throw new Error("Use a valid workspace path.");
  }
  return cleaned;
}

async function ensureProject(chatId: string, title: string, prompt: string) {
  const prisma = getPrisma();
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { id: true, projectId: true },
  });
  if (!chat) throw new Error("Chat not found.");
  if (chat.projectId) return chat.projectId;

  // In production auth paths, project must be pre-created by create-chat.
  // Do not create placeholder user/project automatically.
  throw new Error("No project associated with chat. Use explicit owner project creation.");
}

export async function seedBuildArtifacts(
  chatId: string,
  title: string,
  prompt: string,
  files: Array<{ path: string; code: string }>,
) {
  const prisma = getPrisma();
  const projectId = await ensureProject(chatId, title, prompt);
  const seen = new Set<string>();
  const clean = files
    .map((file) => ({ path: normalizePath(file.path), code: file.code }))
    .filter((file) => {
      if (seen.has(file.path)) return false;
      seen.add(file.path);
      return true;
    });

  if (clean.length === 0) return { projectId, fileCount: 0 };

  await prisma.$transaction(
    clean.map((file) =>
      prisma.projectFile.upsert({
        where: { projectId_path: { projectId, path: file.path } },
        update: { content: file.code },
        create: { projectId, path: file.path, content: file.code },
      }),
    ),
  );

  return { projectId, fileCount: clean.length };
}
