"use client";

import dynamic from "next/dynamic";

const HomePageClient = dynamic(
  () => import("./home-page.client").then((mod) => mod.HomePageClient),
  { ssr: false },
);

export default function HomePageWrapper() {
  return <HomePageClient featuredApps={[]} />;
}
