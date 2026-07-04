import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  authErrorResponse,
  requireChatAccess,
} from "@/lib/authz";
import { archiveChat, deleteChat, duplicateChat, pinChat, renameChat } from "@/app/actions/chat";
import { moveChatToProject } from "@/app/actions/projects";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  projectId: z.string().min(1).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string };
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    await requireChatAccess(id, "editor");
    let result: unknown = null;

    if (parsed.data.title !== undefined) {
      result = await renameChat(id, parsed.data.title);
    }
    if (parsed.data.isPinned !== undefined) {
      result = await pinChat(id, parsed.data.isPinned);
    }
    if (parsed.data.isArchived !== undefined) {
      result = await archiveChat(id, parsed.data.isArchived);
    }
    if (parsed.data.projectId !== undefined) {
      result = await moveChatToProject(id, parsed.data.projectId);
    }

    return NextResponse.json({ ok: true, chat: result });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string };
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");

  try {
    await requireChatAccess(id, "editor");
    if (action === "duplicate") {
      const chat = await duplicateChat(id);
      return NextResponse.json({ ok: true, chat });
    }
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string };

  try {
    await requireChatAccess(id, "editor");
    await deleteChat(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
