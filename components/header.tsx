import { memo } from "react";

import Link from "next/link";
import AuthButton from "@/components/auth-button";

type HeaderProps = {
  hideLogo?: boolean;
  showSidebarTrigger?: boolean;
};

function Header({ hideLogo = false }: HeaderProps) {
  return (
    <header
      className={`relative mx-auto flex w-full shrink-0 items-center px-4 py-6 sm:px-6 ${hideLogo ? "justify-end" : "justify-between"}`}
    >
      {!hideLogo ? (
        <Link href="/" className="inline-flex items-center justify-center">
          <img src="/chinna-coder-logo.svg" alt="Chinna-Coder" loading="lazy" decoding="async" className="h-9 w-auto object-contain sm:h-10 dark:hidden" />
          <img src="/chinna-coder-logo-dark.svg" alt="Chinna-Coder" loading="lazy" decoding="async" className="hidden h-9 w-auto object-contain sm:h-10 dark:block" />
        </Link>
      ) : null}
      <div className="flex items-center gap-2">
        <AuthButton />
      </div>
    </header>
  );
}

export default memo(Header);
