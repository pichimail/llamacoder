import { getPrisma } from "@/lib/prisma";

const LOCAL_WORKSPACE_USER_ID = "local-workspace-user";

function normalizePath(path: string) {
  const cleaned = path.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
  if (!cleaned || cleaned === "." || cleaned.includes("..")) {
    throw new Error("Use a valid workspace path.");
  }
  return cleaned;
}

async function ensureLocalUser() {
  const prisma = getPrisma();
  await prisma.user.upsert({
    where: { id: LOCAL_WORKSPACE_USER_ID },
    update: {},
    create: {
      id: LOCAL_WORKSPACE_USER_ID,
      email: "local-workspace@llamacoder.local",
      name: "Local Workspace",
      role: "system",
    },
  });
  return LOCAL_WORKSPACE_USER_ID;
}

async function ensureProject(chatId: string, title: string, prompt: string) {
  const prisma = getPrisma();
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { id: true, projectId: true },
  });
  if (!chat) throw new Error("Chat not found.");
  if (chat.projectId) return chat.projectId;

  const userId = await ensureLocalUser();
  const project = await prisma.project.create({
    data: {
      name: title || "Untitled workspace",
      description: prompt || null,
      userId,
    },
    select: { id: true },
  });

  await prisma.chat.update({
    where: { id: chat.id },
    data: { projectId: project.id },
  });

  return project.id;
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
