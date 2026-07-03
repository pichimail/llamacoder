import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function resolveDatabaseUrl() {
  const url = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
  if (!url || typeof url !== "string") {
    throw new Error("DATABASE_URL or POSTGRES_PRISMA_URL is required");
  }
  if (!/^postgres(?:ql)?:\/\//.test(url)) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection string");
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
