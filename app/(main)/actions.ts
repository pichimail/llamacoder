"use server";

import { getPrisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

type ArtifactFileInput = {
  path: string;
  code?: string;
  content?: string;
  language?: string;
};

const LOCAL_USER_ID = "local-workspace-user";

function cleanFiles(files: ArtifactFileInput[]) {
  return files
    .map((file) => {
      const path = (file.path || "").replace(/^\/+/, "").trim();
      const content = typeof file.code === "string" ? file.code : file.content || "";
      return {
        path,
        content,
        code: content,
        language: file.language || path.split(".").pop() || "tsx",
      };
    })
    .filter((file) => file.path && !file.path.endsWith(".gitkeep"));
}

async function ensureWorkspace(chatId: string) {
  const prisma = getPrisma();
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { project: true },
  });
  if (!chat) notFound();

  if (chat.projectId && chat.project) return { prisma, chat, project: chat.project };

  const user = await prisma.user.upsert({
    where: { id: LOCAL_USER_ID },
    update: {},
    create: {
      id: LOCAL_USER_ID,
      name: "Local Workspace",
      email: "workspace@hyperspeed.local",
      role: "owner",
    },
  });

  const project = await prisma.project.create({
    data: {
      name: chat.title || "Untitled App",
      description: chat.prompt || null,
      userId: user.id,
    },
  });

  await prisma.chat.update({ where: { id: chatId }, data: { projectId: project.id } });
  return { prisma, chat: { ...chat, projectId: project.id }, project };
}

export async function createMessage(
  chatId: string,
  text: string,
  role: "assistant" | "user",
  files?: any[],
) {
  const prisma = getPrisma();
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { messages: true },
  });
  if (!chat) notFound();

  const maxPosition = chat.messages.length
    ? Math.max(...chat.messages.map((m) => m.position))
    : -1;

  const newMessage = await prisma.message.create({
    data: {
      role,
      content: text,
      files: files ? JSON.parse(JSON.stringify(files)) : null,
      position: maxPosition + 1,
      chatId,
    },
  });

  if (files?.length) await syncArtifactFiles(chatId, files);
  return newMessage;
}

export async function getArtifactWorkspace(chatId: string) {
  const { prisma, project } = await ensureWorkspace(chatId);
  const [integrations, envVars, deployments, shareLinks, projectFiles] = await Promise.all([
    prisma.integration.findMany({ where: { projectId: project.id }, orderBy: { updatedAt: "desc" } }),
    prisma.environmentVariable.findMany({ where: { projectId: project.id }, orderBy: { key: "asc" } }),
    prisma.deployment.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.shareLink.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.projectFile.findMany({ where: { projectId: project.id }, orderBy: { path: "asc" } }),
  ]);

  return {
    project: { id: project.id, name: project.name, description: project.description },
    integrations: integrations.map((integration) => ({
      id: integration.id,
      type: integration.type,
      connected: true,
      config: integration.config,
    })),
    envVars: envVars.map((env) => ({ id: env.id, key: env.key, value: env.value ? "••••••••" : "" })),
    deployments: deployments.map((deployment) => ({
      id: deployment.id,
      status: deployment.status,
      previewUrl: deployment.previewUrl,
      productionUrl: deployment.productionUrl,
      createdAt: deployment.createdAt.toISOString(),
    })),
    shareLinks: shareLinks.map((link) => ({ id: link.id, token: link.token, isPublic: link.isPublic })),
    fileCount: projectFiles.length,
    hasGithub: integrations.some((integration) => integration.type === "github"),
  };
}

export async function syncArtifactFiles(chatId: string, files: ArtifactFileInput[]) {
  const clean = cleanFiles(files);
  const { prisma, project } = await ensureWorkspace(chatId);
  await Promise.all(
    clean.map((file) =>
      prisma.projectFile.upsert({
        where: { projectId_path: { projectId: project.id, path: file.path } },
        update: { content: file.content },
        create: { projectId: project.id, path: file.path, content: file.content },
      }),
    ),
  );
  return { ok: true, projectId: project.id, fileCount: clean.length };
}

export async function upsertEnvironmentVariable(chatId: string, key: string, value: string) {
  const name = key.trim().replace(/[^A-Z0-9_]/gi, "_").toUpperCase();
  if (!name) throw new Error("Environment variable key is required");
  const { prisma, project } = await ensureWorkspace(chatId);
  const env = await prisma.environmentVariable.upsert({
    where: { projectId_key: { projectId: project.id, key: name } },
    update: { value },
    create: { projectId: project.id, key: name, value },
  });
  return { id: env.id, key: env.key, value: env.value ? "••••••••" : "" };
}

export async function deleteEnvironmentVariable(chatId: string, key: string) {
  const { prisma, project } = await ensureWorkspace(chatId);
  await prisma.environmentVariable.delete({ where: { projectId_key: { projectId: project.id, key } } });
  return { ok: true };
}

export async function connectIntegration(chatId: string, type: string, config?: Record<string, unknown>) {
  const integrationType = type.trim().toLowerCase();
  if (!integrationType) throw new Error("Integration type is required");
  const { prisma, project } = await ensureWorkspace(chatId);
  const integration = await prisma.integration.upsert({
    where: { projectId_type: { projectId: project.id, type: integrationType } },
    update: { config: config || {} },
    create: { projectId: project.id, type: integrationType, config: config || {} },
  });
  return { id: integration.id, type: integration.type, connected: true };
}

export async function publishArtifact(chatId: string, messageId: string, files: ArtifactFileInput[]) {
  const clean = cleanFiles(files);
  await syncArtifactFiles(chatId, clean);
  const { prisma, project } = await ensureWorkspace(chatId);
  const token = `${chatId}-${messageId}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  const share = await prisma.shareLink.upsert({
    where: { token },
    update: { isPublic: true },
    create: { projectId: project.id, token, isPublic: true },
  });
  const deployment = await prisma.deployment.create({
    data: {
      projectId: project.id,
      status: "published",
      previewUrl: `/share/v2/${messageId}`,
      productionUrl: `/share/v2/${messageId}`,
    },
  });
  return { ok: true, url: `/share/v2/${messageId}`, token: share.token, deploymentId: deployment.id };
}

export async function createGithubPullRequest(chatId: string, files: ArtifactFileInput[]) {
  const clean = cleanFiles(files);
  await syncArtifactFiles(chatId, clean);
  const { prisma, project } = await ensureWorkspace(chatId);
  const github = await prisma.integration.findUnique({
    where: { projectId_type: { projectId: project.id, type: "github" } },
  });
  if (!github) return { ok: false, reason: "Connect GitHub before creating a PR." };
  const deployment = await prisma.deployment.create({
    data: {
      projectId: project.id,
      status: "pull_request_ready",
      previewUrl: null,
      productionUrl: null,
    },
  });
  return { ok: true, deploymentId: deployment.id, status: deployment.status, fileCount: clean.length };
}
