import { NextResponse } from "next/server";

const requiredEnvVars = [
  "S3_UPLOAD_KEY",
  "S3_UPLOAD_SECRET",
  "S3_UPLOAD_BUCKET",
  "S3_UPLOAD_REGION",
] as const;

export async function GET() {
  const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);

  return NextResponse.json({
    configured: missingEnvVars.length === 0,
    missingEnvVars,
  });
}
