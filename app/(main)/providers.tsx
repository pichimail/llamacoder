"use client";

import { createContext, ReactNode, useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";

export const Context = createContext<{
  streamPromise?: Promise<ReadableStream>;
  setStreamPromise: (v: Promise<ReadableStream> | undefined) => void;
}>({
  setStreamPromise: () => {},
});

export default function Providers({ children }: { children: ReactNode }) {
  const [streamPromise, setStreamPromise] = useState<Promise<ReadableStream>>();

  return (
    <ThemeProvider>
      <Context value={{ streamPromise, setStreamPromise }}>{children}</Context>
    </ThemeProvider>
  );
}
