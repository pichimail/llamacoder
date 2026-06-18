import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  url: z.string().url(),
  accessToken: z.string().optional(),
});

type GithubFileSpec = {
  owner: string;
  repo: string;
  ref: string;
  path: string;
  filename: string;
  rawUrl: string;
};

function parseGithubFileUrl(input: string): GithubFileSpec | null {
  try {
    const parsed = new URL(input);
    const parts = parsed.pathname.split("/").filter(Boolean);

    if (parsed.hostname === "raw.githubusercontent.com") {
      if (parts.length < 4) return null;
      const [owner, repo, ref, ...rest] = parts;
      const path = rest.join("/");
      if (!path) return null;
      return {
        owner,
        repo,
        ref,
        path,
        filename: rest.at(-1) || "github-file",
        rawUrl: input,
      };
    }

    if (parsed.hostname !== "github.com") return null;
    if (parts.length < 5) return null;
    const [owner, repo, mode, ref, ...rest] = parts;
    if (mode !== "blob" && mode !== "raw") return null;
    const path = rest.join("/");
    if (!path) return null;
    return {
      owner,
      repo,
      ref,
      path,
      filename: rest.at(-1) || "github-file",
      rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`,
    };
  } catch {
    return null;
  }
}

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

    const spec = parseGithubFileUrl(parsed.data.url);
    if (!spec) {
      return NextResponse.json(
        { error: "Paste a GitHub file URL, not a repository homepage." },
        { status: 400 },
      );
    }

    if (parsed.data.accessToken && new URL(parsed.data.url).hostname === "github.com") {
      const apiUrl = `https://api.github.com/repos/${spec.owner}/${spec.repo}/contents/${spec.path}?ref=${encodeURIComponent(spec.ref)}`;
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${parsed.data.accessToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      if (!response.ok) {
        const message = await response.text();
        return NextResponse.json(
          { error: message || "GitHub import failed" },
          { status: response.status },
        );
      }

      const data = (await response.json()) as {
        content?: string;
        encoding?: string;
        name?: string;
      };
      if (!data.content || data.encoding !== "base64") {
        return NextResponse.json(
          { error: "Unsupported GitHub content payload." },
          { status: 422 },
        );
      }

      const bytes = Buffer.from(data.content.replaceAll("\n", ""), "base64");
      return new NextResponse(bytes, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `inline; filename="${data.name || spec.filename}"`,
          "X-Filename": data.name || spec.filename,
          "X-Source-Url": parsed.data.url,
        },
      });
    }

    const response = await fetch(spec.rawUrl);
    if (!response.ok || !response.body) {
      return NextResponse.json(
        { error: "Unable to fetch the GitHub file." },
        { status: response.status || 502 },
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${spec.filename}"`,
        "X-Filename": spec.filename,
        "X-Source-Url": parsed.data.url,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to import GitHub content.",
      },
      { status: 500 },
    );
  }
}
