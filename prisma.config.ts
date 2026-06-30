import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    // Keep optional to avoid failing commands like prisma generate in env-less contexts.
    url: process.env.DATABASE_URL ?? "",
  },
});
