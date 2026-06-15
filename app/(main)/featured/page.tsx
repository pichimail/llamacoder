import Link from "next/link";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FeaturedPage() {
  const prisma = getPrisma();
  const rawMessages = await prisma.message.findMany({
    where: { role: "assistant" },
    include: { chat: true },
    orderBy: { createdAt: "desc" },
    take: 48,
  });
  const messages = rawMessages
    .filter((message) => Array.isArray(message.files) && message.files.length > 0)
    .slice(0, 24);

  return (
    <main className="min-h-dvh bg-background px-5 py-10 text-foreground">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Back to HyperSpeed</Link>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Featured apps</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">Recent generated apps ready to inspect, remix, and publish.</p>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="rounded-xl border border-border p-8 text-sm text-muted-foreground">No generated apps yet.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {messages.map((message) => (
              <Link key={message.id} href={`/share/v2/${message.id}`} className="group rounded-xl border border-border p-4 transition hover:border-foreground/50">
                <p className="truncate text-sm font-medium text-foreground">{message.chat.title || "Untitled app"}</p>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{message.chat.prompt}</p>
                <p className="mt-4 text-[11px] text-muted-foreground group-hover:text-foreground">Open preview</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
