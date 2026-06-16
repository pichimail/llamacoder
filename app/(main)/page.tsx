import { Suspense } from "react";
import HomePageClient from "./home-page.client";

export const runtime = "nodejs";
export const maxDuration = 60;

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageClient />
    </Suspense>
  );
}