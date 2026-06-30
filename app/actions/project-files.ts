"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getPrisma } from "@/lib/prisma";
import { getMonacoLanguage } from "@/lib/utils";
import { requireChatAccess } from "@/lib/authz";

export type WorkspaceFile = {
  path: string;
  code: string;
  language: string;
  updatedAt?: string;
};

const FOLDER_MARKER = ".gitkeep";

function normalizePath(path: string) {
  const cleaned = path
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");

  if (!cleaned || cleaned === "." || cleaned.includes("..")) {
    throw new Error("Use a valid workspace path.");
  }

  return cleaned;
}

function toWorkspaceFile(file: { path: string; content: string; updatedAt: Date }): WorkspaceFile {
  const extension = file.path.split(".").pop() || "tsx";
  return {
    path: file.path,
    code: file.content,
    language: getMonacoLanguage(extension),
    updatedAt: file.updatedAt.toISOString(),
  };
}

function normalizeSeedFiles(files: Array<{ path: string; code?: string; content?: string; language?: string }>) {
  const seen = new Set<string>();
  return files
    .map((file) => ({
      path: normalizePath(file.path),
      content: file.code ?? file.content ?? "",
    }))
    .filter((file) => {
      if (seen.has(file.path)) return false;
      seen.add(file.path);
      return true;
    });
}

async function ensureProjectForChat(chatId: string) {
  const { prisma } = await requireChatAccess(chatId, "editor");
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { id: true, title: true, projectId: true },
  });

  if (!chat) throw new Error("Chat not found.");
  if (chat.projectId) return chat.projectId;

  // Projects are created at chat creation time with owner.
  throw new Error("Chat has no project. Ownership required.");
}

async function listFiles(projectId: string) {
  const prisma = getPrisma();
  const files = await prisma.projectFile.findMany({
    where: { projectId },
    orderBy: { path: "asc" },
    select: { path: true, content: true, updatedAt: true },
  });

  return files.map(toWorkspaceFile);
}

export async function syncWorkspaceFiles(
  chatId: string,
  seedFiles: Array<{ path: string; code?: string; content?: string; language?: string }> = [],
) {
  const prisma = getPrisma();
  const projectId = await ensureProjectForChat(chatId);
  const normalized = normalizeSeedFiles(seedFiles);

  if (normalized.length > 0) {
    await prisma.projectFile.createMany({
      data: normalized.map((file) => ({
        projectId,
        path: file.path,
        content: file.content,
      })),
      skipDuplicates: true,
    });
  }

  return listFiles(projectId);
}

export async function refreshWorkspaceFiles(chatId: string) {
  const projectId = await ensureProjectForChat(chatId);
  return listFiles(projectId);
}

export async function createWorkspaceFile(chatId: string, path: string, content = "") {
  const prisma = getPrisma();
  const projectId = await ensureProjectForChat(chatId);
  const normalizedPath = normalizePath(path);

  await prisma.projectFile.create({
    data: {
      projectId,
      path: normalizedPath,
      content,
    },
  });

  revalidatePath(`/chats/${chatId}`);
  return listFiles(projectId);
}

export async function createWorkspaceFolder(chatId: string, path: string) {
  const folderPath = normalizePath(path).replace(/\/+$/, "");
  return createWorkspaceFile(chatId, `${folderPath}/${FOLDER_MARKER}`, "");
}

export async function copyWorkspaceFile(chatId: string, sourcePath: string, targetPath: string) {
  const prisma = getPrisma();
  const projectId = await ensureProjectForChat(chatId);
  const normalizedSource = normalizePath(sourcePath);
  const normalizedTarget = normalizePath(targetPath);

  const source = await prisma.projectFile.findUnique({
    where: { projectId_path: { projectId, path: normalizedSource } },
    select: { content: true },
  });

  if (!source) throw new Error("Source file not found.");

  await prisma.projectFile.create({
    data: {
      projectId,
      path: normalizedTarget,
      content: source.content,
    },
  });

  revalidatePath(`/chats/${chatId}`);
  return listFiles(projectId);
}

export async function saveWorkspaceFiles(chatId: string, files: Array<{ path: string; code: string; language?: string }>) {
  const prisma = getPrisma();
  const projectId = await ensureProjectForChat(chatId);
  const normalized = normalizeSeedFiles(files);
  const incomingPaths = normalized.map((file) => file.path);

  // Never wipe the entire workspace if caller accidentally passes empty list.
  // Only perform destructive replace when we have a concrete non-empty set to commit.
  if (normalized.length > 0) {
    await prisma.$transaction([
      prisma.projectFile.deleteMany({
        where: {
          projectId,
          path: { notIn: incomingPaths },
        },
      }),
      ...normalized.map((file) =>
        prisma.projectFile.upsert({
          where: { projectId_path: { projectId, path: file.path } },
          update: { content: file.content },
          create: {
            projectId,
            path: file.path,
            content: file.content,
          },
        }),
      ),
    ] as Prisma.PrismaPromise<unknown>[]);
  }

  revalidatePath(`/chats/${chatId}`);
  return listFiles(projectId);
}
