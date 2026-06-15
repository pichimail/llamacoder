import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

export function Typography({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("typography", className)} {...props} />;
}

export function TypographyH1({ className, ...props }: ComponentPropsWithoutRef<"h1">) {
  return (
    <h1
      className={cn(
        "scroll-m-20 text-4xl font-extrabold tracking-tight text-balance",
        className,
      )}
      {...props}
    />
  );
}

export function TypographyH2({ className, ...props }: ComponentPropsWithoutRef<"h2">) {
  return (
    <h2
      className={cn(
        "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
        className,
      )}
      {...props}
    />
  );
}

export function TypographyH3({ className, ...props }: ComponentPropsWithoutRef<"h3">) {
  return (
    <h3
      className={cn("scroll-m-20 text-2xl font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function TypographyH4({ className, ...props }: ComponentPropsWithoutRef<"h4">) {
  return (
    <h4
      className={cn("scroll-m-20 text-xl font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function TypographyP({ className, ...props }: ComponentPropsWithoutRef<"p">) {
  return (
    <p className={cn("leading-7 [&:not(:first-child)]:mt-6", className)} {...props} />
  );
}

export function TypographyBlockquote({
  className,
  ...props
}: ComponentPropsWithoutRef<"blockquote">) {
  return (
    <blockquote className={cn("mt-6 border-l-2 pl-6 italic", className)} {...props} />
  );
}

export function TypographyList({ className, ...props }: ComponentPropsWithoutRef<"ul">) {
  return <ul className={cn("my-6 ml-6 list-disc [&>li]:mt-2", className)} {...props} />;
}

export function TypographyInlineCode({
  className,
  ...props
}: ComponentPropsWithoutRef<"code">) {
  return (
    <code
      className={cn(
        "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
        className,
      )}
      {...props}
    />
  );
}

export function TypographyLead({ className, ...props }: ComponentPropsWithoutRef<"p">) {
  return <p className={cn("text-xl text-muted-foreground", className)} {...props} />;
}

export function TypographyLarge({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("text-lg font-semibold", className)} {...props} />;
}

export function TypographySmall({ className, ...props }: ComponentPropsWithoutRef<"small">) {
  return (
    <small className={cn("text-sm leading-none font-medium", className)} {...props} />
  );
}

export function TypographyMuted({ className, ...props }: ComponentPropsWithoutRef<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function TypographyTable({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("my-6 w-full overflow-y-auto", className)} {...props} />
  );
}