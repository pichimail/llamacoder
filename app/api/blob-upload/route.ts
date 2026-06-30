import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/authz";
import { getPrisma } from "@/lib/prisma";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB tighter
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
  "text/csv",
  "application/zip",
]);

function safeFilename(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "upload";
}

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Blob storage is not configured." }, { status: 500 });
  }

  const user = await requireCurrentUser();

  try {
    await rateLimitOrThrow(`blob-upload:${user.id}`, { limit: 30, windowSeconds: 60 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Rate limited" }, { status: 429 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File is too large. Maximum size is 8 MB." }, { status: 413 });
  }

  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 415 });
  }

  // Monthly quota rough (count uploads last 30d)
  const prisma = getPrisma();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const count = await prisma.fileUpload.count({ where: { userId: user.id, createdAt: { gte: since } } });
  if (count >= 200) {
    return NextResponse.json({ error: "Monthly upload quota exceeded" }, { status: 429 });
  }

  const filename = safeFilename(file.name);
  const blob = await put(`uploads/${user.id}/${Date.now()}-${filename}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  const upload = await prisma.fileUpload.create({
    data: {
      userId: user.id,
      blobUrl: blob.url,
      pathname: blob.pathname,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    },
  });

  await logAudit({ userId: user.id, action: "blob-upload", resource: "fileUpload", resourceId: upload.id });

  return NextResponse.json({
    url: blob.url,
    pathname: blob.pathname,
    uploadId: upload.id,
    contentType: file.type || "application/octet-stream",
    size: file.size,
    filename: file.name,
  });
}

export const runtime = "nodejs";
