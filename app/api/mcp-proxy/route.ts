import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, authErrorResponse } from "@/lib/authz";
import { getPrisma } from "@/lib/prisma";
import { decryptMcpSecret } from "@/lib/mcp";

/**
 * Generic MCP proxy.
 * POST { serverId, tool, args }
 *
 * Resolves the MCP server config from the user's McpServer records,
 * performs the authenticated call, and returns the result.
 * Never leaks secrets to the client.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json().catch(() => ({}));
    const { serverId, tool, args = {} } = body;

    if (!serverId || !tool) {
      return NextResponse.json({ error: "serverId and tool are required" }, { status: 400 });
    }

    const prisma = getPrisma();
    const server = await prisma.mcpServer.findFirst({
      where: { id: serverId, userId: user.id, enabled: true },
    });

    if (!server) {
      return NextResponse.json({ error: "MCP server not found or not enabled" }, { status: 404 });
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (server.encryptedSecret && server.iv && server.authType !== "none") {
      const secret = decryptMcpSecret(server.encryptedSecret, server.iv);
      if (server.authType === "bearer") headers.Authorization = `Bearer ${secret}`;
      else if (server.authType === "header") headers["X-MCP-Token"] = secret;
      else if (server.authType === "token") headers["X-Access-Token"] = secret;
    }

    // In a full implementation we would speak the MCP protocol (initialize + tools/call).
    // For v1 we forward a simple POST to the MCP server's tool endpoint or root.
    // Many community MCP servers expose /tools or accept JSON-RPC.
    const target = server.url.replace(/\/$/, "") + "/tools/call"; // common convention; fall back gracefully

    let res: Response;
    try {
      res = await fetch(target, {
        method: "POST",
        headers,
        body: JSON.stringify({ tool, arguments: args }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      // Fallback to base URL with the payload
      res = await fetch(server.url, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "call_tool", tool, args }),
        signal: AbortSignal.timeout(15000),
      });
    }

    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return NextResponse.json({
      ok: res.ok,
      server: server.name,
      tool,
      result: data,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
