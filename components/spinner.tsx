"use client";

import { Spinner as UiSpinner } from "@/components/ui/spinner";
import { ReactNode } from "react";

export default function Spinner({
  loading = true,
  children,
  className = "size-3",
}: {
  loading?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  if (!loading) return children;

  const spinner = <UiSpinner className={className} />;

  if (!children) return spinner;

  return (
    <span className="relative flex h-full items-center justify-center">
      <span className="invisible flex">{children}</span>
      <span className="absolute inset-0 flex items-center justify-center">
        {spinner}
      </span>
    </span>
  );
}

export { UiSpinner as Spinner };