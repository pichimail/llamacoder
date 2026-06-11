import { memo } from "react";

import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";

function Header() {
  return (
    <header className="relative mx-auto flex w-full shrink-0 items-center justify-between px-4 py-6 sm:px-6">
      <Link href="/" className="inline-flex items-center justify-center">
        <img
          src="/chinna-coder-logo.svg"
          alt="Chinna-Coder"
          className="h-9 w-auto object-contain sm:h-10 dark:hidden"
        />
        <img
          src="/chinna-coder-logo-dark.svg"
          alt="Chinna-Coder"
          className="hidden h-9 w-auto object-contain sm:h-10 dark:block"
        />
      </Link>
      <ThemeToggle />
    </header>
  );
}

export default memo(Header);
