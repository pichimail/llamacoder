import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

type ArtifactFileInput = {
  path: string;
  code?: string;
  content?: string;
  language?: string;
};

const LOCAL_USER_ID = "local-workspace-user";

function cleanFiles(files: ArtifactFileInput[] = []) {
  return files
    .map((file) => {
      const path = (file.path || "").replace(/^\/+/, "").trim();
      const content = typeof file.code === "string" ? file.code : file.content || "";
      return { path, content };
    })
    .filter((file) => file.path && !file.path.endsWith(".gitkeep"));
}

async function ensureWorkspace(chatId: string) {
  const prisma = getPrisma();
  const chat = await prisma.chat.findUnique({ where: { id: chatId }, include: { project: true } });
  if (!chat) return null;
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
  return { prisma, chat, project };
}

async function serializeWorkspace(chatId: string) {
  const workspace = await ensureWorkspace(chatId);
  if (!workspace) return null;
  const { prisma, project } = workspace;
  const [integrations, envVars, deployments, shareLinks, projectFiles] = await Promise.all([
    prisma.integration.findMany({ where: { projectId: project.id }, orderBy: { updatedAt: "desc" } }),
    prisma.environmentVariable.findMany({ where: { projectId: project.id }, orderBy: { key: "asc" } }),
    prisma.deployment.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.shareLink.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.projectFile.findMany({ where: { projectId: project.id }, orderBy: { path: "asc" } }),
  ]);

  return {
    project: { id: project.id, name: project.name, description: project.description || "" },
    integrations: integrations.map((integration) => ({ id: integration.id, type: integration.type, connected: true })),
    envVars: envVars.map((env) => ({ id: env.id, key: env.key, value: env.value ? "••••••••" : "" })),
    deployments: deployments.map((deployment) => ({
      id: deployment.id,
      status: deployment.status,
      previewUrl: deployment.previewUrl || "",
      productionUrl: deployment.productionUrl || "",
      createdAt: deployment.createdAt.toISOString(),
    })),
    shareLinks: shareLinks.map((link) => ({ id: link.id, token: link.token, isPublic: link.isPublic })),
    fileCount: projectFiles.length,
    hasGithub: integrations.some((integration) => integration.type === "github"),
  };
}

async function syncFiles(chatId: string, files: ArtifactFileInput[]) {
  const workspace = await ensureWorkspace(chatId);
  if (!workspace) return null;
  const clean = cleanFiles(files);
  await Promise.all(
    clean.map((file) =>
      workspace.prisma.projectFile.upsert({
        where: { projectId_path: { projectId: workspace.project.id, path: file.path } },
        update: { content: file.content },
        create: { projectId: workspace.project.id, path: file.path, content: file.content },
      }),
    ),
  );
  return { workspace, count: clean.length };
}

export async function GET(_: Request, context: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await context.params;
  const workspace = await serializeWorkspace(chatId);
  if (!workspace) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  return NextResponse.json(workspace);
}

export async function POST(request: Request, context: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");

  if (action === "sync") {
    const result = await syncFiles(chatId, body.files || []);
    if (!result) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    return NextResponse.json({ ok: true, fileCount: result.count, workspace: await serializeWorkspace(chatId) });
  }

  const workspace = await ensureWorkspace(chatId);
  if (!workspace) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  const { prisma, project } = workspace;

  if (action === "save-env") {
    const key = String(body.key || "").trim().replace(/[^A-Z0-9_]/gi, "_").toUpperCase();
    if (!key) return NextResponse.json({ error: "Env key is required" }, { status: 400 });
    await prisma.environmentVariable.upsert({
      where: { projectId_key: { projectId: project.id, key } },
      update: { value: String(body.value || "") },
      create: { projectId: project.id, key, value: String(body.value || "") },
    });
    return NextResponse.json({ ok: true, workspace: await serializeWorkspace(chatId) });
  }

  if (action === "connect-github") {
    await prisma.integration.upsert({
      where: { projectId_type: { projectId: project.id, type: "github" } },
      update: { config: { source: "phase-3-action-bar" } },
      create: { projectId: project.id, type: "github", config: { source: "phase-3-action-bar" } },
    });
    return NextResponse.json({ ok: true, workspace: await serializeWorkspace(chatId) });
  }

  if (action === "publish") {
    const messageId = String(body.messageId || "");
    if (!messageId) return NextResponse.json({ error: "Message id is required" }, { status: 400 });
    await syncFiles(chatId, body.files || []);
    const token = `${chatId}-${messageId}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
    await prisma.shareLink.upsert({
      where: { token },
      update: { isPublic: true },
      create: { projectId: project.id, token, isPublic: true },
    });
    await prisma.deployment.create({
      data: { projectId: project.id, status: "published", previewUrl: `/share/v2/${messageId}`, productionUrl: `/share/v2/${messageId}` },
    });
    return NextResponse.json({ ok: true, url: `/share/v2/${messageId}`, workspace: await serializeWorkspace(chatId) });
  }

  if (action === "create-pr") {
    const github = await prisma.integration.findUnique({ where: { projectId_type: { projectId: project.id, type: "github" } } });
    if (!github) return NextResponse.json({ ok: false, reason: "Connect GitHub before creating a PR." }, { status: 409 });
    const result = await syncFiles(chatId, body.files || []);
    await prisma.deployment.create({ data: { projectId: project.id, status: "pull_request_ready" } });
    return NextResponse.json({ ok: true, fileCount: result?.count || 0, workspace: await serializeWorkspace(chatId) });
  }

  return NextResponse.json({ error: "Unknown workspace action" }, { status: 400 });
}

export const runtime = "nodejs";
