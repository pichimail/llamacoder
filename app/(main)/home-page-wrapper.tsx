import { Suspense } from "react";

import { HomePageClient } from "./home-page.client";

function HomeFallback() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background text-foreground">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" aria-label="Loading home" />
    </main>
  );
}

export default function HomePageWrapper() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomePageClient featuredApps={[]} />
    </Suspense>
  );
}
