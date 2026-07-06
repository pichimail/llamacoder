/** Seeds default ChinnaLLM models. Idempotent — upserts by displayName.
 * Multiple ChinnaLLM tiers may intentionally point to the same underlying admin-only provider model id.
 * Run: pnpm seed:chinnallm
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CHINNALLM_DEFAULT_MODELS } from "../lib/chinnallm/models";

function loadLocalEnv() {
  for (const filename of [".env", ".env.local", ".env.production.local"]) {
    const filePath = path.join(process.cwd(), filename);
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (!match || match[1].startsWith("#") || process.env[match[1]] !== undefined) continue;
      const raw = match[2].trim();
      process.env[match[1]] = raw.replace(/^['"]|['"]$/g, "");
    }
  }
}

loadLocalEnv();

function databaseUrl() {
  const url = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL or POSTGRES_PRISMA_URL is required to seed ChinnaLLM models.");
  return url;
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl() }) });

async function main() {
  let created = 0;
  let updated = 0;

  for (const model of CHINNALLM_DEFAULT_MODELS) {
    const existing = await prisma.chinnaLLMModel.findUnique({ where: { displayName: model.displayName } });
    await prisma.chinnaLLMModel.upsert({
      where: { displayName: model.displayName },
      create: { ...model },
      update: {
        displayName: model.displayName,
        openRouterId: model.openRouterId,
        tier: model.tier,
        costPerKTokens: model.costPerKTokens,
        sortOrder: model.sortOrder,
        description: model.description,
        capabilities: model.capabilities,
      },
    });
    if (existing) updated += 1;
    else created += 1;
  }

  console.log(`ChinnaLLM seed complete: ${created} created, ${updated} updated, ${CHINNALLM_DEFAULT_MODELS.length} total.`);
}

main()
  .catch((error) => {
    console.error("ChinnaLLM seed failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
