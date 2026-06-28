import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const callbackUrl = url.searchParams.get("callbackUrl") || "/";
  redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
}
