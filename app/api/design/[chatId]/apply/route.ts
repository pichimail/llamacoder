import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireChatAccess } from "@/lib/authz";
import { getPrisma } from "@/lib/prisma";
import { validateGeneratedCodeFiles, formatGeneratedCodeIssues } from "@/lib/generated-code-validation";
import { createTextWithFallback } from "@/lib/providers/generation";
import { getFallbackModel } from "@/lib/constants";
import { patchModeSystemHint } from "@/lib/code-patch";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const applySchema = z.object({
  instruction: z.string().min(1).max(2000),
  selected: z.object({
    tag: z.string(),
    className: z.string().optional(),
    text: z.string().optional(),
    filePath: z.string().optional(),
  }).optional(),
  files: z.array(z.object({ path: z.string(), content: z.string() })).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  let access;
  try {
    access = await requireChatAccess(chatId, "editor");
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = applySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  try {
    await rateLimitOrThrow(`design-apply:${access.user.id}`, { limit: 20, windowSeconds: 60 });
  } catch (e) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const prisma = getPrisma();
  const { instruction, selected, files: incoming } = parsed.data;

  const project = await prisma.project.findFirst({ where: { chats: { some: { id: chatId } } } });
  if (!project) return NextResponse.json({ error: "No project" }, { status: 404 });

  let currentFiles = incoming && incoming.length
    ? incoming
    : (await prisma.projectFile.findMany({ where: { projectId: project.id } })).map(f => ({ path: f.path, content: f.content }));

  // Build patch instruction for LLM
  const context = selected ? `Target element: <${selected.tag} class="${selected.className || ''}">${selected.text || ''}</${selected.tag}> in ${selected.filePath || 'multiple'}` : "";
  const sys = `You are a precise design patcher. Given current files and a natural language instruction + optional selected element, output ONLY changed full file contents in format:\n\n\`\`\`path=app/page.tsx\n<full new file>\n\`\`\`\nApply minimal targeted Tailwind/JSX changes. Keep functionality. ${patchModeSystemHint}`;

  const promptText = `${context}\n\nINSTRUCTION: ${instruction}\n\nCURRENT FILES (summary):\n${currentFiles.slice(0, 6).map(f => `${f.path}:\n${f.content.slice(0, 1200)}`).join("\n---\n")}`;

  let patched: any[] = [];
  try {
    const res = await createTextWithFallback({
      model: getFallbackModel().value,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: promptText },
      ],
      temperature: 0.1,
      maxTokens: 6000,
    });
    // naive parse ```path=xxx \n code ```
    const text = res.content;
    const fileRegex = /```(?:\w+)?\s*path=([^\n]+)\n([\s\S]*?)```/g;
    let m;
    while ((m = fileRegex.exec(text)) !== null) {
      patched.push({ path: m[1].trim(), content: m[2].trim() });
    }
    if (patched.length === 0) {
      // fallback: simple string replace on first
      if (selected && selected.filePath) {
        const f = currentFiles.find(ff => ff.path === selected.filePath);
        if (f) {
          let nc = f.content;
          if (selected.className) nc = nc.replace(selected.className, selected.className + ' ' + instruction.replace(/[^a-z0-9:-]/gi,' ').trim());
          patched = [{ path: f.path, content: nc }];
        }
      }
    }
  } catch (e) {
    // fallback simple
    patched = currentFiles;
  }

  if (patched.length === 0) patched = currentFiles;

  // validate
  const issues = await validateGeneratedCodeFiles(patched, access.chat.styleId);
  if (issues.length > 0) {
    return NextResponse.json({ ok: false, validation: { ok: false, issues: issues.slice(0,5), formatted: formatGeneratedCodeIssues(issues) } }, { status: 400 });
  }

  // save transactionally
  await prisma.$transaction(
    patched.map((f) =>
      prisma.projectFile.upsert({
        where: { projectId_path: { projectId: project.id, path: f.path } },
        update: { content: f.content },
        create: { projectId: project.id, path: f.path, content: f.content },
      })
    )
  );

  await logAudit({ userId: access.user.id, action: "design-apply", resource: "chat", resourceId: chatId });

  return NextResponse.json({ ok: true, changed: patched.length, files: patched });
}
