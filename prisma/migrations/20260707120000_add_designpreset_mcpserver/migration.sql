-- Add missing tables: DesignPreset and McpServer
-- These were added to schema but no migration was created/applied, causing 500 errors on /api/design-presets and related flows.

CREATE TABLE IF NOT EXISTS "DesignPreset" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "sourceRef" TEXT,
  "content" TEXT NOT NULL,
  "instructions" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesignPreset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DesignPreset_userId_idx" ON "DesignPreset"("userId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DesignPreset_userId_fkey') THEN
    ALTER TABLE "DesignPreset" ADD CONSTRAINT "DesignPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "McpServer" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "projectId" TEXT,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "transport" TEXT NOT NULL DEFAULT 'http',
  "authType" TEXT NOT NULL DEFAULT 'bearer',
  "encryptedSecret" TEXT,
  "iv" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "description" TEXT,
  "toolSchema" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "McpServer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "McpServer_userId_idx" ON "McpServer"("userId");
CREATE INDEX IF NOT EXISTS "McpServer_projectId_idx" ON "McpServer"("projectId");
CREATE INDEX IF NOT EXISTS "McpServer_enabled_idx" ON "McpServer"("enabled");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'McpServer_userId_fkey') THEN
    ALTER TABLE "McpServer" ADD CONSTRAINT "McpServer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'McpServer_projectId_fkey') THEN
    ALTER TABLE "McpServer" ADD CONSTRAINT "McpServer_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Add mcpServers Json column to Chat (added to schema without migration)
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "mcpServers" JSONB;
