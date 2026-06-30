/**
 * Backfill orphan chats to a real user project.
 * Run ONLY manually with explicit envs.
 * NEVER auto-run in request paths.
 *
 * Usage:
 *   DATABASE_URL=... pnpm tsx scripts/backfill-orphan-chats.ts --userId=xxx --dry=false
 */
import { getPrisma } from "@/lib/prisma";

async function main() {
  const args = process.argv.slice(2);
  const userId = (args.find(a => a.startsWith("--userId=")) || "").split("=")[1];
  const dry = !args.includes("--apply");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }
  if (!userId) {
    console.error("Provide --userId=<existing-user-id>");
    process.exit(1);
  }
  if (process.env.NODE_ENV === "production" && !process.env.BACKFILL_ALLOW_PROD) {
    console.error("Refusing to backfill in prod without BACKFILL_ALLOW_PROD=1");
    process.exit(1);
  }

  const prisma = getPrisma();
  const orphans = await prisma.chat.findMany({
    where: { projectId: null },
    take: 200,
  });

  console.log(`Found ${orphans.length} orphan chats. Dry=${dry}`);

  for (const c of orphans) {
    if (dry) {
      console.log("DRY would create project for", c.id, c.title);
      continue;
    }
    const project = await prisma.project.create({
      data: { name: c.title || "Backfilled", description: c.prompt || null, userId },
    });
    await prisma.chat.update({ where: { id: c.id }, data: { projectId: project.id } });
    console.log("Backfilled", c.id, "->", project.id);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
