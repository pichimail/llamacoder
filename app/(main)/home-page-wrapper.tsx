"use client";

import dynamic from "next/dynamic";

const HomePageClient = dynamic(() => import("./home-page.client"), {
  ssr: false,
});

export default function HomePageWrapper() {
  return <HomePageClient />;
}
