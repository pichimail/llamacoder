import { POST as nextS3UploadPOST } from "next-s3-upload/route";
import { NextRequest, NextResponse } from "next/server";

const requiredEnvVars = [
  "S3_UPLOAD_KEY",
  "S3_UPLOAD_SECRET",
  "S3_UPLOAD_BUCKET",
  "S3_UPLOAD_REGION",
] as const;

export async function POST(request: NextRequest) {
  const missingEnvVars = requiredEnvVars.filter(
    (name) => !process.env[name],
  );

  if (missingEnvVars.length > 0) {
    return NextResponse.json(
      {
        error:
          "S3 upload is not configured in this environment.",
        missingEnvVars,
      },
      { status: 400 },
    );
  }

  const response = await nextS3UploadPOST(request);

  if (response.status >= 400) {
    return NextResponse.json(
      {
        error: "S3 upload failed.",
      },
      { status: response.status },
    );
  }

  return response;
}
