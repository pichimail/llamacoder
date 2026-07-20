import { defineConfig } from "prisma/config";

// Mirrors lib/prisma.ts's resolution order (POSTGRES_PRISMA_URL first, then
// DATABASE_URL) so `prisma migrate deploy` — which reads this config, not
// lib/prisma.ts — can never pick a different/empty URL than the one the app
// actually connects with at runtime. A mismatch here is what silently skips
// migrations at build time and lets the deployed Prisma Client drift out of
// sync with the real database schema.
const resolvedDatabaseUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || "";

export default defineConfig({
  datasource: {
    // Keep optional to avoid failing commands like prisma generate in env-less contexts.
    url: resolvedDatabaseUrl,
  },
});
