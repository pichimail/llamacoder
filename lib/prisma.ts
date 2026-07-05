import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function resolveDatabaseUrl(): string | null {
  const url = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
  if (!url || typeof url !== "string") {
    return null;
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

export function getPrisma(): PrismaClient | null {
  if (!globalForPrisma.prisma) {
    const url = resolveDatabaseUrl();
    if (!url) {
      return null;
    }
    const adapter = new PrismaPg({ connectionString: url });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }

  return globalForPrisma.prisma;
}
