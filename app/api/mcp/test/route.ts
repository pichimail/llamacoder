import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireCurrentUser, authErrorResponse } from "@/lib/authz";
import { getMcpServerById, testMcpConnection } from "@/lib/mcp";

const testSchema = z.object({
  id: z.string().optional(),
  // Allow ad-hoc test without saving
  url: z.string().url().optional(),
  authType: z.enum(["none", "bearer", "header", "basic", "token"]).optional(),
  secret: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json().catch(() => ({}));
    const parsed = testSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid test payload" }, { status: 400 });
    }

    let serverForTest: any;

    if (parsed.data.id) {
      const dbServer = await getMcpServerById(parsed.data.id, user.id);
      if (!dbServer) {
        return NextResponse.json({ error: "Server not found" }, { status: 404 });
      }
      serverForTest = dbServer;
    } else if (parsed.data.url) {
      // Ad-hoc test (secret provided in plaintext for test only — never stored here)
      serverForTest = {
        url: parsed.data.url,
        authType: parsed.data.authType || "none",
        encryptedSecret: null,
        iv: null,
        _plaintextSecret: parsed.data.secret,
      };
    } else {
      return NextResponse.json({ error: "Provide id or url" }, { status: 400 });
    }

    const result = await testMcpConnection({
      url: serverForTest.url,
      authType: serverForTest.authType,
      encryptedSecret: serverForTest.encryptedSecret,
      iv: serverForTest.iv,
      plaintextSecret: (serverForTest as any)._plaintextSecret,
    });
    return NextResponse.json(result);
  } catch (error) {
    return authErrorResponse(error);
  }
}
