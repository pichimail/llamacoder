import { memo } from "react";

import Link from "next/link";
import AuthButton from "@/components/auth-button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

type HeaderProps = {
  hideLogo?: boolean;
  showSidebarTrigger?: boolean;
};

function Header({ hideLogo = false, showSidebarTrigger = false }: HeaderProps) {
  return (
    <header
      className={`relative mx-auto flex w-full shrink-0 items-center px-4 py-6 sm:px-6 ${hideLogo && !showSidebarTrigger ? "justify-end" : "justify-between"}`}
    >
      {showSidebarTrigger ? (
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1 inline-flex rounded-lg border border-white/8 bg-white/5 text-[#F4F4F5]/80 shadow-sm transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white/10 hover:text-white" />
          <Separator orientation="vertical" className="mr-1 hidden h-4 md:block" />
        </div>
      ) : null}
      {!hideLogo ? (
        <Link href="/" className="inline-flex items-center justify-center">
          <img src="/chinna-coder-logo.svg" alt="Chinna-Coder" className="h-9 w-auto object-contain sm:h-10 dark:hidden" />
          <img src="/chinna-coder-logo-dark.svg" alt="Chinna-Coder" className="hidden h-9 w-auto object-contain sm:h-10 dark:block" />
        </Link>
      ) : null}
      <div className="flex items-center gap-2">
        <AuthButton />
      </div>
    </header>
  );
}

export default memo(Header);
