import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireCurrentUser, authErrorResponse } from "@/lib/authz";
import {
  createMcpServer,
  getUserMcpServers,
  updateMcpServer,
  deleteMcpServer,
  toPublicMcpServer,
  type McpServerInput,
} from "@/lib/mcp";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  url: z.string().url().max(500),
  transport: z.enum(["http", "sse", "stdio"]).optional(),
  authType: z.enum(["none", "bearer", "header", "basic", "token"]).optional(),
  secret: z.string().optional(),
  description: z.string().max(500).optional(),
  projectId: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial().extend({
  enabled: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const servers = await getUserMcpServers(user.id);
    return NextResponse.json({
      servers: servers.map(toPublicMcpServer),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid MCP server payload" }, { status: 400 });
    }

    const input: McpServerInput = {
      name: parsed.data.name,
      url: parsed.data.url,
      transport: parsed.data.transport,
      authType: parsed.data.authType,
      secret: parsed.data.secret,
      description: parsed.data.description,
      projectId: parsed.data.projectId,
    };

    const server = await createMcpServer(user.id, input);
    return NextResponse.json({ server: toPublicMcpServer(server) }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json().catch(() => ({}));
    const { id, ...patch } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing server id" }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(patch);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
    }

    const server = await updateMcpServer(id, user.id, parsed.data as any);
    return NextResponse.json({ server: toPublicMcpServer(server) });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const result = await deleteMcpServer(id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return authErrorResponse(error);
  }
}
