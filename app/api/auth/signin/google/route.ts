import { signIn } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const callbackUrl = url.searchParams.get("callbackUrl") || "/";

  await signIn("google", { redirectTo: callbackUrl });
}
