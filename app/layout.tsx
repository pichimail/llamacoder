import type { Metadata } from "next";
import PlausibleProvider from "next-plausible";
import "./globals.css";

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
    <html lang="en" className="h-full bg-background text-foreground" suppressHydrationWarning>
      <head>
        <PlausibleProvider domain="llamacoder.io" />
      </head>

      {children}
    </html>
  );
}
