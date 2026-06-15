import Providers from "@/app/(main)/providers";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as RadixToaster } from "@/components/ui/toaster";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <div className="flex min-h-full flex-col">
        {children}
        <Toaster richColors closeButton position="top-right" />
        <RadixToaster />
      </div>
    </Providers>
  );
}
