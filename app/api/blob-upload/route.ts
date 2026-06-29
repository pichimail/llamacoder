import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getCurrentUserOrNull, AuthError, authErrorResponse } from "@/lib/authz";

// Allowed MIME types for uploads
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/zip",
  "text/plain",
  "text/csv",
  "application/json",
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES_PER_REQUEST = 5;

export async function POST(request: Request) {
  try {
    // Require authentication
    const user = await getCurrentUserOrNull();
    if (!user) {
      throw new AuthError("Unauthorized", 401);
    }

    const formData = await request.formData();
    const files = formData.getAll("file");

    // Validate file count
    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }
    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json({ error: `Maximum ${MAX_FILES_PER_REQUEST} files per request.` }, { status: 400 });
    }

    const uploadedBlobs = [];

    // Process each file
    for (const file of files) {
      if (!(file instanceof File)) {
        continue;
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File type "${file.type}" not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}` },
          { status: 400 }
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
          { status: 400 }
        );
      }

      // Upload to blob storage (private access)
      const blob = await put(file.name, file, {
        access: "private",
        addRandomSuffix: true,
      });

      uploadedBlobs.push({
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        filename: file.name,
        size: file.size,
        mimeType: file.type,
      });
    }

    return NextResponse.json({
      files: uploadedBlobs,
      count: uploadedBlobs.length,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }
    console.error("Blob upload failed:", error);
    return NextResponse.json(
      { error: "Blob upload failed." },
      { status: 500 },
    );
  }
}
