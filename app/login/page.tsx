import Link from "next/link";
import { ArrowLeft, GalleryVerticalEnd, LogIn } from "lucide-react";

import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage() {
  const session = await auth();

  return (
    <main className="grid min-h-dvh bg-background text-foreground md:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden border-r border-border bg-[#1F2023] p-8 text-[#F4F4F5] md:flex md:flex-col md:justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/10">
            <GalleryVerticalEnd className="size-4" />
          </span>
          Chinna-Coder
        </Link>
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight">Build with a protected workspace.</h1>
          <p className="mt-3 text-sm text-white/60">Sign in to save chats, projects, previews, and admin access.</p>
        </div>
        <p className="text-xs text-white/45">Responsive web and mobile access.</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-sm rounded-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>Continue with your Google account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {session?.user ? (
              <Button asChild className="w-full">
                <Link href="/">Continue to app</Link>
              </Button>
            ) : (
              <Button asChild className="w-full">
                <a href="/api/auth/signin/google">
                  <LogIn className="size-4" />
                  Continue with Google
                </a>
              </Button>
            )}
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                <ArrowLeft className="size-4" />
                Back to home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
