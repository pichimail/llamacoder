import type { Metadata } from "next";
import PlausibleProvider from "next-plausible";
import { GlobalAppShell } from "@/components/global-app-shell";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { Public_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const publicSans = Public_Sans({subsets:['latin'],variable:'--font-sans'});

let title = "Chinna-Coder";
let description = "Turn ideas into apps with Chinna-Coder.";
let url = "https://llamacoder.io/";
let ogimage = "https://llamacoder.io/og-image.png";
let sitename = "Chinna-Coder";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title,
  description,
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    images: [ogimage],
    title,
    description,
    url: url,
    siteName: sitename,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: [ogimage],
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full bg-background text-foreground", "font-sans", publicSans.variable)} suppressHydrationWarning>
      <head>
        <PlausibleProvider domain="llamacoder.io" />
      </head>
      <body
        className="min-h-full bg-background font-sans text-foreground antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <GlobalAppShell>{children}</GlobalAppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
