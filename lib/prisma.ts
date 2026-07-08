import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function resolveDatabaseUrl() {
  const url = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
  if (!url || typeof url !== "string") {
    console.error("[v0] DATABASE_URL or POSTGRES_PRISMA_URL is required. Available env vars:", Object.keys(process.env).filter(k => k.includes("DATABASE") || k.includes("POSTGRES")));
    throw new Error("DATABASE_URL or POSTGRES_PRISMA_URL is required. Make sure to set up Neon database in project settings.");
  }
  if (!/^postgres(?:ql)?:\/\//.test(url)) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection string");
  }

  const parsed = new URL(url);
  const sslMode = parsed.searchParams.get("sslmode");
  if (sslMode && ["prefer", "require", "verify-ca"].includes(sslMode)) {
    parsed.searchParams.set("sslmode", "verify-full");
    return parsed.toString();
  }

  return url;
}

export function getPrisma() {
  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg({ connectionString: resolveDatabaseUrl() });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }

  return globalForPrisma.prisma;
}
