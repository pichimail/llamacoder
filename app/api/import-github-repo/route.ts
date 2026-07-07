import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { getMainCodingPrompt } from "@/lib/prompts";
import {
  fetchGithubRepoFiles,
  filesToImportMarkdown,
  parseGithubRepoUrl,
} from "@/lib/github-repo-import";
import { extractPreviewDependencies } from "@/lib/package-deps";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { requireCurrentUser } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  url: z.string().url(),
  accessToken: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request body" },
        { status: 400 },
      );
    }

    const user = await requireCurrentUser();

    const spec = parseGithubRepoUrl(parsed.data.url);
    if (!spec) {
      return NextResponse.json(
        {
          error:
            "Paste a public GitHub repository URL (for example https://github.com/owner/repo).",
        },
        { status: 400 },
      );
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Server misconfiguration: missing database URL" }, { status: 500 });
    }

    await rateLimitOrThrow(`github-repo-import:${user.id}`, {
      limit: 10,
      windowSeconds: 60,
    });

    const imported = await fetchGithubRepoFiles(spec, {
      accessToken: parsed.data.accessToken,
    });

    const packageFile = imported.files.find((file) => file.path === "package.json");
    const previewDependencies = packageFile
      ? extractPreviewDependencies(packageFile.code)
      : {};

    const title = `${spec.repo} (GitHub import)`;
    const userPrompt = `Import and preview this public GitHub repository live in the sandbox:\n${parsed.data.url}`;
    const assistantIntro = [
      `Imported **${spec.owner}/${spec.repo}** @ \`${imported.ref}\`.`,
      `${imported.files.length} files loaded for live Sandpack preview.`,
      Object.keys(previewDependencies).length
        ? `${Object.keys(previewDependencies).length} dependencies detected from package.json.`
        : "No extra runtime dependencies detected in package.json.",
      imported.readme
        ? "\n\nREADME summary available — use the repo instructions when iterating."
        : "",
    ].join(" ");

    let markdown = `${assistantIntro}\n\n${filesToImportMarkdown(imported.files)}`;

    // Inject auto-generated dynamic bootstrap artifacts for any stack
    if (imported.bootstrapScript) {
      markdown += `\n\n\`\`\`bash{path=bootstrap.sh}\n${imported.bootstrapScript}\n\`\`\``;
    }
    if (imported.runMarkdown) {
      markdown += `\n\n\`\`\`md{path=RUN.md}\n${imported.runMarkdown}\n\`\`\``;
    }
    if (imported.stack) {
      markdown += `\n\n<!-- Detected stack: ${imported.stack.stack} (${imported.stack.language}) -->`;
    }

    const prisma = getPrisma();
    const project = await prisma.project.create({
      data: {
        name: title,
        description: userPrompt,
        userId: user.id,
      },
    });

    const chat = await prisma.chat.create({
      data: {
        model: "openrouter/auto",
        quality: "low",
        prompt: userPrompt,
        title,
        shadcn: false,
        project: { connect: { id: project.id } },
        messages: {
          create: [
            {
              role: "system",
              content: getMainCodingPrompt("agent", false, false, userPrompt, false),
              position: 0,
            },
            {
              role: "user",
              content: userPrompt,
              position: 1,
              files: [
                {
                  kind: "file",
                  filename: "github-repo",
                  url: imported.repoUrl,
                },
              ],
            },
            {
              role: "assistant",
              content: markdown,
              position: 2,
              files: imported.files,
            },
          ],
        },
      },
    });

    await logAudit({ userId: user.id, action: "import-github", resource: "chat", resourceId: chat.id });

    return NextResponse.json({
      id: chat.id,
      chatId: chat.id,
      fileCount: imported.files.length,
      ref: imported.ref,
      repoUrl: imported.repoUrl,
      dependencies: previewDependencies,
      hasReadme: Boolean(imported.readme),
      // Rich dynamic data
      stack: imported.stack,
      hasBootstrap: !!imported.bootstrapScript,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to import GitHub repository.",
      },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 120;
