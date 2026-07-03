import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { createArtifactPullRequest } from "@/lib/github/create-pr";
import { buildPhaseOneSpec, type BuildMode } from "@/lib/build-engine";
import {
  formatGeneratedCodeIssues,
  validateGeneratedCodeFiles,
} from "@/lib/generated-code-validation";
import {
  authErrorResponse,
  requireChatAccess,
  type AccessLevel,
} from "@/lib/authz";
import { encryptEnvValue, decryptEnvValue, maskEnvValue } from "@/lib/env-encryption";
import { logAudit } from "@/lib/audit";
import { diffWorkspaceFiles, type WorkspaceFileInput } from "@/lib/workspace-files";
import { buildShareToken } from "@/lib/share-links";

type BuildSpecSummary = {
  templateId: string;
  title: string;
  summary: string;
  dependencies: string[];
  envHints: string[];
  routes: string[];
  previewRoute: string;
};

type ValidationSummary = {
  ok: boolean;
  issueCount: number;
  issues: Array<{ path: string; line: number; column: number; message: string }>;
  formatted: string;
};

function accessLevelForAction(action: string): AccessLevel {
  if (action === "validate") return "viewer";
  if (action === "save-env" || action === "connect-github" || action === "create-pr") return "owner";
  return "editor";
}

function inferModeFromMessages(
  messages: Array<{ role: string; content: string }>,
): BuildMode {
  const system = messages.find((message) => message.role === "system")?.content || "";
  if (system.includes("plan mode")) return "plan";
  if (system.includes("ask mode")) return "ask";
  return "agent";
}

function summarizeBuildSpec(chat: {
  prompt: string;
  shadcn: boolean;
  messages?: Array<{ role: string; content: string }>;
}): BuildSpecSummary {
  const spec = buildPhaseOneSpec({
    prompt: chat.prompt,
    mode: inferModeFromMessages(chat.messages ?? []),
    shadcn: chat.shadcn,
  });

  return {
    templateId: spec.templateId,
    title: spec.title,
    summary: spec.summary,
    dependencies: spec.dependencies,
    envHints: spec.envHints,
    routes: spec.routes,
    previewRoute: spec.previewRoute,
  };
}

async function summarizeValidation(files: Array<{ path: string; content: string }>) {
  const issues = await validateGeneratedCodeFiles(
    files.map((file) => ({
      path: file.path,
      content: file.content,
    })),
  );

  return {
    ok: issues.length === 0,
    issueCount: issues.length,
    issues: issues.slice(0, 8).map((issue) => ({
      path: issue.path,
      line: issue.line,
      column: issue.column,
      message: issue.message,
    })),
    formatted: formatGeneratedCodeIssues(issues),
  } satisfies ValidationSummary;
}

async function ensureWorkspace(chatId: string) {
  const prisma = getPrisma();
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      project: true,
      messages: { select: { role: true, content: true }, orderBy: { position: "asc" } },
    },
  });
  if (!chat) return null;
  if (chat.projectId && chat.project) return { prisma, chat, project: chat.project };
  // No auto local user/project creation in production paths.
  // Orphans must be backfilled explicitly via script or will 404 here.
  return null;
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
  const validation = await summarizeValidation(
    projectFiles.map((file) => ({ path: file.path, content: file.content })),
  );
  const buildSpec = summarizeBuildSpec(workspace.chat);

  return {
    project: { id: project.id, name: project.name, description: project.description || "" },
    integrations: integrations.map((integration) => ({ id: integration.id, type: integration.type, connected: true, config: integration.config })),
    envVars: envVars.map((env) => ({ id: env.id, key: env.key, value: maskEnvValue(decryptEnvValue(env.value)) })),
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
    buildSpec,
    validation,
  };
}

async function syncFiles(chatId: string, files: WorkspaceFileInput[]) {
  const workspace = await ensureWorkspace(chatId);
  if (!workspace) return null;
  const existingPaths = (await workspace.prisma.projectFile.findMany({
    where: { projectId: workspace.project.id },
    select: { path: true },
  })).map((file) => file.path);
  const { clean, deletedPaths } = diffWorkspaceFiles(existingPaths, files);
  await workspace.prisma.$transaction([
    ...(deletedPaths.length > 0
      ? [
          workspace.prisma.projectFile.deleteMany({
            where: { projectId: workspace.project.id, path: { in: deletedPaths } },
          }),
        ]
      : []),
    ...clean.map((file) =>
      workspace.prisma.projectFile.upsert({
        where: { projectId_path: { projectId: workspace.project.id, path: file.path } },
        update: { content: file.content },
        create: { projectId: workspace.project.id, path: file.path, content: file.content },
      }),
    ),
  ]);
  const validation = await summarizeValidation(clean);
  return { workspace, count: clean.length, files: clean, deletedPaths, validation };
}

export async function GET(_: Request, context: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await context.params;
  try {
    await requireChatAccess(chatId, "viewer");
  } catch (error) {
    return authErrorResponse(error);
  }

  const workspace = await serializeWorkspace(chatId);
  if (!workspace) return NextResponse.json({ error: "Chat not found or no project workspace" }, { status: 404 });
  return NextResponse.json(workspace);
}

export async function POST(request: Request, context: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");

  let accessUser: any;
  try {
    const acc = await requireChatAccess(chatId, accessLevelForAction(action));
    accessUser = acc.user;
  } catch (error) {
    return authErrorResponse(error);
  }

  if (action === "sync") {
    const result = await syncFiles(chatId, body.files || []);
    if (!result) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    return NextResponse.json({
      ok: true,
      fileCount: result.count,
      validation: result.validation,
      workspace: await serializeWorkspace(chatId),
    });
  }

  const workspace = await ensureWorkspace(chatId);
  if (!workspace) return NextResponse.json({ error: "Chat not found or no associated project" }, { status: 404 });
  const { prisma, project, chat } = workspace;

  if (action === "save-env") {
    const key = String(body.key || "").trim().replace(/[^A-Z0-9_]/gi, "_").toUpperCase();
    if (!key) return NextResponse.json({ error: "Env key is required" }, { status: 400 });
    const rawValue = String(body.value || "");
    const encrypted = encryptEnvValue(rawValue);
    await prisma.environmentVariable.upsert({
      where: { projectId_key: { projectId: project.id, key } },
      update: { value: encrypted },
      create: { projectId: project.id, key, value: encrypted },
    });
    await logAudit({ userId: accessUser.id, action: "save-env", resource: "project", resourceId: project.id, metadata: { key } });
    return NextResponse.json({ ok: true, workspace: await serializeWorkspace(chatId) });
  }

  if (action === "update-project") {
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 160) : "";
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 2000) : "";
    await prisma.project.update({
      where: { id: project.id },
      data: {
        ...(name ? { name } : {}),
        description: description || null,
      },
    });
    if (name) {
      await prisma.chat.update({
        where: { id: chat.id },
        data: { title: name },
      });
    }
    await logAudit({ userId: accessUser.id, action: "update-project", resource: "project", resourceId: project.id });
    return NextResponse.json({ ok: true, workspace: await serializeWorkspace(chatId) });
  }

  if (action === "install-integration") {
    const type = String(body.type || "").toLowerCase().trim();
    if (!type) {
      return NextResponse.json({ error: "Integration type is required" }, { status: 400 });
    }
    const config = {
      ...(body.config || {}),
      installed: true,
      installedAt: new Date().toISOString(),
    };
    const integration = await prisma.integration.upsert({
      where: { projectId_type: { projectId: project.id, type } },
      update: { config: config as any },
      create: { projectId: project.id, type, config: config as any },
    });
    await logAudit({
      userId: accessUser.id,
      action: "install-integration",
      resource: "project",
      resourceId: project.id,
      metadata: { type },
    });
    return NextResponse.json({ ok: true, integration, workspace: await serializeWorkspace(chatId) });
  }

  if (action === "bootstrap") {
    const spec = buildPhaseOneSpec({
      prompt: chat.prompt,
      mode: inferModeFromMessages(chat.messages),
      shadcn: chat.shadcn,
    });
    const hasFiles = await prisma.projectFile.count({ where: { projectId: project.id } });
    if (hasFiles > 0 && !body.force) {
      return NextResponse.json({
        ok: false,
        reason: "Workspace already contains files. Pass force=true to reseed the scaffold.",
        workspace: await serializeWorkspace(chatId),
      }, { status: 409 });
    }
    const result = await syncFiles(chatId, spec.artifactFiles);
    await logAudit({ userId: accessUser.id, action: "bootstrap", resource: "project", resourceId: project.id });
    return NextResponse.json({
      ok: true,
      fileCount: result?.count || spec.artifactFiles.length,
      validation: result?.validation,
      workspace: await serializeWorkspace(chatId),
    });
  }

  if (action === "validate") {
    const candidateFiles = diffWorkspaceFiles([], body.files || []).clean;
    const files =
      candidateFiles.length > 0
        ? candidateFiles
        : (
            await prisma.projectFile.findMany({
              where: { projectId: project.id },
              orderBy: { path: "asc" },
            })
          ).map((file) => ({ path: file.path, content: file.content }));

    const validation = await summarizeValidation(files);
    return NextResponse.json({
      ok: validation.ok,
      validation,
      workspace: await serializeWorkspace(chatId),
    });
  }

  if (action === "connect-github") {
    await prisma.integration.upsert({
      where: { projectId_type: { projectId: project.id, type: "github" } },
      update: { config: { source: "workspace-action", repository: process.env.GITHUB_REPOSITORY || null } },
      create: { projectId: project.id, type: "github", config: { source: "workspace-action", repository: process.env.GITHUB_REPOSITORY || null } },
    });
    return NextResponse.json({ ok: true, workspace: await serializeWorkspace(chatId) });
  }

  if (action === "publish") {
    const messageId = String(body.messageId || "");
    if (!messageId) return NextResponse.json({ error: "Message id is required" }, { status: 400 });
    const syncResult = await syncFiles(chatId, body.files || []);
    if (syncResult && !syncResult.validation.ok) {
      return NextResponse.json({
        ok: false,
        reason: "Validation failed. Fix the generated files before publishing.",
        validation: syncResult.validation,
        workspace: await serializeWorkspace(chatId),
      }, { status: 409 });
    }
    const token = buildShareToken(chatId, messageId);
    await prisma.shareLink.upsert({
      where: { token },
      update: { isPublic: true },
      create: { projectId: project.id, token, isPublic: true },
    });
    await logAudit({ userId: accessUser.id, action: "publish", resource: "project", resourceId: project.id });
    const url = `/share/v2/${messageId}`;
    const existingDeployment = await prisma.deployment.findFirst({
      where: { projectId: project.id, status: "published", productionUrl: url },
    });
    if (!existingDeployment) {
      await prisma.deployment.create({
        data: { projectId: project.id, status: "published", previewUrl: url, productionUrl: url },
      });
    }
    return NextResponse.json({
      ok: true,
      url,
      workspace: await serializeWorkspace(chatId),
      duplicateProtected: Boolean(existingDeployment),
    });
  }

  if (action === "create-pr") {
    const github = await prisma.integration.findUnique({ where: { projectId_type: { projectId: project.id, type: "github" } } });
    if (!github) return NextResponse.json({ ok: false, reason: "Connect GitHub before creating a PR." }, { status: 409 });
    const result = await syncFiles(chatId, body.files || []);
    if (result && !result.validation.ok) {
      return NextResponse.json({
        ok: false,
        reason: "Validation failed. Fix the generated files before creating a PR.",
        validation: result.validation,
        workspace: await serializeWorkspace(chatId),
      }, { status: 409 });
    }
    const pr = await createArtifactPullRequest({
      title: `${chat.title || project.name || "HyperSpeed app"} update`,
      files: result?.files || [],
    });
    await prisma.deployment.create({
      data: {
        projectId: project.id,
        status: pr.ok ? "pull_request_created" : "pull_request_failed",
        previewUrl: pr.ok ? pr.url : undefined,
        productionUrl: pr.ok ? pr.url : undefined,
      },
    });
    await logAudit({ userId: accessUser.id, action: "create-pr", resource: "project", resourceId: project.id });
    if (!pr.ok) return NextResponse.json({ ok: false, reason: pr.reason, workspace: await serializeWorkspace(chatId) }, { status: 409 });
    return NextResponse.json({ ok: true, prUrl: pr.url, branch: pr.branch, fileCount: result?.count || 0, workspace: await serializeWorkspace(chatId) });
  }

  return NextResponse.json({ error: "Unknown workspace action" }, { status: 400 });
}

export const runtime = "nodejs";
