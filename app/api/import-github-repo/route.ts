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
import { getCurrentUserOrNull, AuthError, authErrorResponse } from "@/lib/authz";

const schema = z.object({
  url: z.string().url(),
  accessToken: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUserOrNull();
    if (!user) {
      throw new AuthError("Unauthorized", 401);
    }

    const json = await request.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request body" },
        { status: 400 },
      );
    }

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

    const markdown = `${assistantIntro}\n\n${filesToImportMarkdown(imported.files)}`;

    const prisma = getPrisma();

    // Create a project for the authenticated user
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
        shadcn: true,
        projectId: project.id,
        messages: {
          create: [
            {
              role: "system",
              content: getMainCodingPrompt("agent", false, false, userPrompt, true),
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

    return NextResponse.json({
      chatId: chat.id,
      fileCount: imported.files.length,
      ref: imported.ref,
      repoUrl: imported.repoUrl,
      dependencies: previewDependencies,
      hasReadme: Boolean(imported.readme),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }
    console.error("GitHub import error:", error);
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
