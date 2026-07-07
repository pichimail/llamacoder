/**
 * MCP (Model Context Protocol) support.
 * Types, helpers, and server-safe utilities for storing and using MCP servers.
 *
 * MCP servers let generated apps (and the platform) call external tools/context
 * in a standardized way (inspired by Anthropic's MCP + community OSS servers).
 */

import "server-only";

import { getPrisma } from "@/lib/prisma";
import { encrypt, decrypt, maskKey } from "@/lib/chinnallm/encryption";

// ====================== Types ======================

export type McpTransport = "http" | "sse" | "stdio";

export type McpAuthType = "none" | "bearer" | "header" | "basic" | "token";

export interface McpToolSchema {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

// Our application view of an MCP server (Prisma returns looser strings for enums/Json)
export interface McpServer {
  id: string;
  userId: string;
  projectId?: string | null;
  name: string;
  url: string;
  transport: McpTransport;
  authType: McpAuthType;
  encryptedSecret?: string | null;
  iv?: string | null;
  enabled: boolean;
  description?: string | null;
  toolSchema?: McpToolSchema[] | null;
  createdAt: Date;
  updatedAt: Date;
}

// Prisma generated type (for internal casts)
import type { McpServer as PrismaMcpServer } from "@prisma/client";

// Helper to map Prisma row -> our stricter McpServer
function mapPrismaMcpServer(row: PrismaMcpServer): McpServer {
  return {
    ...row,
    transport: row.transport as McpTransport,
    toolSchema: row.toolSchema as McpToolSchema[] | null,
  } as McpServer;
}

export interface McpServerInput {
  name: string;
  url: string;
  transport?: McpTransport;
  authType?: McpAuthType;
  secret?: string; // plaintext when creating/updating
  description?: string;
  projectId?: string | null;
}

export interface SelectedMcpServer {
  id: string;
  name: string;
  url?: string;
  transport?: McpTransport;
  // Secrets are NEVER stored in the snapshot on Chat.
  // They are resolved server-side when generating the app or proxying calls.
}

export interface PublicMcpServer {
  id: string;
  name: string;
  url: string;
  transport: McpTransport;
  authType: McpAuthType;
  enabled: boolean;
  description?: string | null;
  hasSecret: boolean;
  maskedSecret?: string;
  toolSchema?: McpToolSchema[] | null;
  createdAt: string;
  updatedAt: string;
}

// ====================== Encryption wrappers ======================

export function encryptMcpSecret(secret: string): { encrypted: string; iv: string } {
  return encrypt(secret);
}

export function decryptMcpSecret(encrypted: string, iv: string): string {
  return decrypt(encrypted, iv);
}

export function maskMcpSecret(secret?: string | null): string {
  if (!secret) return "";
  return maskKey(secret);
}

// ====================== Public / masked views ======================

export function toPublicMcpServer(server: McpServer): PublicMcpServer {
  const hasSecret = Boolean(server.encryptedSecret && server.iv);
  return {
    id: server.id,
    name: server.name,
    url: server.url,
    transport: (server.transport as McpTransport) || "http",
    authType: (server.authType as McpAuthType) || "bearer",
    enabled: server.enabled,
    description: server.description,
    hasSecret,
    maskedSecret: hasSecret ? maskMcpSecret("dummy") : undefined, // never leak
    toolSchema: server.toolSchema as McpToolSchema[] | null,
    createdAt: server.createdAt.toISOString(),
    updatedAt: server.updatedAt.toISOString(),
  };
}

export function toSelectedSnapshot(server: McpServer | PublicMcpServer): SelectedMcpServer {
  return {
    id: server.id,
    name: server.name,
    url: "url" in server ? server.url : undefined,
    transport: "transport" in server ? (server.transport as McpTransport) : undefined,
  };
}

// ====================== DB access (server only) ======================

export async function getUserMcpServers(userId: string, includeDisabled = false): Promise<McpServer[]> {
  const prisma = getPrisma();
  const rows = await prisma.mcpServer.findMany({
    where: {
      userId,
      ...(includeDisabled ? {} : { enabled: true }),
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapPrismaMcpServer);
}

export async function getProjectMcpServers(projectId: string, userId?: string): Promise<McpServer[]> {
  const prisma = getPrisma();
  const rows = await prisma.mcpServer.findMany({
    where: {
      projectId,
      ...(userId ? { userId } : {}),
      enabled: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapPrismaMcpServer);
}

export async function getMcpServerById(id: string, userId: string): Promise<McpServer | null> {
  const prisma = getPrisma();
  const row = await prisma.mcpServer.findFirst({
    where: { id, userId },
  });
  if (!row) return null;
  return mapPrismaMcpServer(row);
}

export async function createMcpServer(userId: string, input: McpServerInput): Promise<McpServer> {
  const prisma = getPrisma();

  let encryptedSecret: string | undefined;
  let iv: string | undefined;

  if (input.secret && input.authType !== "none") {
    const enc = encryptMcpSecret(input.secret);
    encryptedSecret = enc.encrypted;
    iv = enc.iv;
  }

  const created = await prisma.mcpServer.create({
    data: {
      userId,
      projectId: input.projectId ?? null,
      name: input.name.trim(),
      url: input.url.trim(),
      transport: input.transport || "http",
      authType: input.authType || "bearer",
      encryptedSecret,
      iv,
      description: input.description?.trim() || null,
      enabled: true,
    },
  });
  return mapPrismaMcpServer(created);
}

export async function updateMcpServer(
  id: string,
  userId: string,
  patch: Partial<McpServerInput> & { enabled?: boolean }
): Promise<McpServer> {
  const prisma = getPrisma();
  const existing = await getMcpServerById(id, userId);
  if (!existing) throw new Error("MCP server not found");

  let encryptedSecret = existing.encryptedSecret;
  let iv = existing.iv;

  if (patch.secret !== undefined) {
    if (patch.secret && (patch.authType || existing.authType) !== "none") {
      const enc = encryptMcpSecret(patch.secret);
      encryptedSecret = enc.encrypted;
      iv = enc.iv;
    } else {
      encryptedSecret = null;
      iv = null;
    }
  }

  const updated = await prisma.mcpServer.update({
    where: { id },
    data: {
      name: patch.name?.trim() ?? existing.name,
      url: patch.url?.trim() ?? existing.url,
      transport: patch.transport ?? existing.transport,
      authType: patch.authType ?? existing.authType,
      encryptedSecret,
      iv,
      description: patch.description !== undefined ? (patch.description?.trim() || null) : existing.description,
      enabled: patch.enabled !== undefined ? patch.enabled : existing.enabled,
      projectId: patch.projectId !== undefined ? patch.projectId : existing.projectId,
      updatedAt: new Date(),
    },
  });
  return mapPrismaMcpServer(updated);
}

export async function deleteMcpServer(id: string, userId: string): Promise<{ success: boolean }> {
  const prisma = getPrisma();
  await prisma.mcpServer.deleteMany({
    where: { id, userId },
  });
  return { success: true };
}

export interface McpConnectionTestInput {
  url: string;
  authType?: string;
  encryptedSecret?: string | null;
  iv?: string | null;
  /** For ad-hoc testing only (never persisted) */
  plaintextSecret?: string;
}

export async function testMcpConnection(input: McpConnectionTestInput): Promise<{
  ok: boolean;
  message: string;
  tools?: McpToolSchema[];
}> {
  // Lightweight test: attempt to reach the MCP server root or a standard endpoint.
  // Real MCP handshake (initialize) would be better in production.
  // For now we do a simple fetch + optional auth header.

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    let secret: string | undefined;

    if (input.plaintextSecret) {
      secret = input.plaintextSecret;
    } else if (input.authType !== "none" && input.encryptedSecret && input.iv) {
      secret = decryptMcpSecret(input.encryptedSecret, input.iv);
    }

    if (secret && (input.authType || "bearer") !== "none") {
      const auth = input.authType || "bearer";
      if (auth === "bearer") {
        headers.Authorization = `Bearer ${secret}`;
      } else if (auth === "header") {
        headers["X-MCP-Token"] = secret;
      } else if (auth === "token") {
        headers["X-Access-Token"] = secret;
      }
      // basic would require username:password encoding etc. — extend as needed
    }

    // Try a simple GET to the base URL or a conventional /mcp or root.
    const testUrl = input.url.endsWith("/") ? input.url : `${input.url}/`;
    const res = await fetch(testUrl, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(8000),
    });

    const text = await res.text().catch(() => "");
    const ok = res.ok || res.status < 500;

    // Very naive: if the server returns JSON with "tools" or "capabilities", capture it.
    let tools: McpToolSchema[] | undefined;
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json.tools)) tools = json.tools;
      if (Array.isArray(json.capabilities)) {
        tools = json.capabilities.map((c: any) => ({ name: c.name || c, description: c.description }));
      }
    } catch {}

    return {
      ok,
      message: ok
        ? `Connected successfully (${res.status}). ${tools ? `${tools.length} tools discovered.` : ""}`
        : `Server responded with ${res.status}. ${text.slice(0, 120)}`,
      tools,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Connection failed: ${err?.message || "Unknown error"}. Check URL, network, and credentials.`,
    };
  }
}

// ====================== Snapshot helpers for Chat ======================

export function selectedMcpServersToJson(servers: SelectedMcpServer[]): any {
  return servers.map((s) => ({ id: s.id, name: s.name, url: s.url, transport: s.transport }));
}

export function parseSelectedMcpServers(raw: any): SelectedMcpServer[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((x) => x && typeof x.id === "string" && typeof x.name === "string")
      .map((x) => ({
        id: x.id,
        name: x.name,
        url: x.url,
        transport: x.transport,
      }));
  }
  return [];
}

// ====================== Prompt helpers (used by generation) ======================

export function formatMcpServersForPrompt(selected: SelectedMcpServer[]): string {
  if (!selected.length) return "";
  return selected
    .map((s, i) => `${i + 1}. **${s.name}** (${s.transport || "http"}) — ${s.url || "configured server"}`)
    .join("\n");
}
