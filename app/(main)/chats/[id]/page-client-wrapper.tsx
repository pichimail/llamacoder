"use client";

import dynamic from "next/dynamic";

import type { Chat, SidebarChat } from "./page";

const PageClient = dynamic(() => import("./page.client"), {
  ssr: false,
});

export default function PageClientWrapper({
  chat,
  sidebarChats,
}: {
  chat: Chat;
  sidebarChats: SidebarChat[];
}) {
  return <PageClient chat={chat} sidebarChats={sidebarChats} />;
}
