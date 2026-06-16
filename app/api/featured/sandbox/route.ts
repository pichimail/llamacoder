import { NextRequest, NextResponse } from "next/server";
import { getFeaturedAppBySlugAsync } from "@/lib/featured-apps-server";
import { getFilesForFeaturedApp } from "@/lib/featured-app-files";
import { getMotionTemplateBySlug } from "@/lib/motion-templates";

export async function GET(request: NextRequest) {
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const motion = getMotionTemplateBySlug(slug);
  if (motion) {
    return NextResponse.json({ files: [], motion: true, prompt: motion.prompt });
  }

  const app = await getFeaturedAppBySlugAsync(slug);
  if (!app) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const files = await getFilesForFeaturedApp(app);
  return NextResponse.json({ files, slug: app.slug });
}