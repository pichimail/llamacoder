-- Backend completion: ChinnaLLM, BYOK, credits, backend mode, uploads/checkpoints, feature flags.

ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "aiIntegration" TEXT;
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "backendMode" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "ChinnaLLMModel" (
  "id" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "openRouterId" TEXT NOT NULL,
  "tier" TEXT NOT NULL,
  "costPerKTokens" INTEGER NOT NULL DEFAULT 1,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "description" TEXT,
  "capabilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChinnaLLMModel_pkey" PRIMARY KEY ("id")
);
DROP INDEX IF EXISTS "ChinnaLLMModel_openRouterId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ChinnaLLMModel_displayName_key" ON "ChinnaLLMModel"("displayName");
CREATE INDEX IF NOT EXISTS "ChinnaLLMModel_tier_enabled_sortOrder_idx" ON "ChinnaLLMModel"("tier", "enabled", "sortOrder");

CREATE TABLE IF NOT EXISTS "UserCredits" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planTier" TEXT NOT NULL DEFAULT 'free',
  "totalGranted" INTEGER NOT NULL DEFAULT 100,
  "totalUsed" INTEGER NOT NULL DEFAULT 0,
  "monthlyResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserCredits_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserCredits_userId_key" ON "UserCredits"("userId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserCredits_userId_fkey') THEN
    ALTER TABLE "UserCredits" ADD CONSTRAINT "UserCredits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CreditTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "reason" TEXT,
  "relatedChatId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CreditTransaction_userId_createdAt_idx" ON "CreditTransaction"("userId", "createdAt");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CreditTransaction_userId_fkey') THEN
    ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserCredits"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ChinnaLLMUsage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "chatId" TEXT,
  "modelId" TEXT NOT NULL,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "creditsUsed" INTEGER NOT NULL DEFAULT 0,
  "isByok" BOOLEAN NOT NULL DEFAULT false,
  "latencyMs" INTEGER,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChinnaLLMUsage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ChinnaLLMUsage_userId_createdAt_idx" ON "ChinnaLLMUsage"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ChinnaLLMUsage_modelId_createdAt_idx" ON "ChinnaLLMUsage"("modelId", "createdAt");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChinnaLLMUsage_modelId_fkey') THEN
    ALTER TABLE "ChinnaLLMUsage" ADD CONSTRAINT "ChinnaLLMUsage_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ChinnaLLMModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ApiKeyStore" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'openrouter',
  "encryptedKey" TEXT NOT NULL,
  "iv" TEXT NOT NULL,
  "label" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiKeyStore_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ApiKeyStore_userId_provider_key" ON "ApiKeyStore"("userId", "provider");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApiKeyStore_userId_fkey') THEN
    ALTER TABLE "ApiKeyStore" ADD CONSTRAINT "ApiKeyStore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "FileUpload" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "blobUrl" TEXT NOT NULL,
  "pathname" TEXT,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "chatId" TEXT,
  "messageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FileUpload_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FileUpload_blobUrl_key" ON "FileUpload"("blobUrl");
CREATE INDEX IF NOT EXISTS "FileUpload_userId_idx" ON "FileUpload"("userId");
CREATE INDEX IF NOT EXISTS "FileUpload_chatId_idx" ON "FileUpload"("chatId");
CREATE INDEX IF NOT EXISTS "FileUpload_messageId_idx" ON "FileUpload"("messageId");
CREATE INDEX IF NOT EXISTS "FileUpload_createdAt_idx" ON "FileUpload"("createdAt");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FileUpload_userId_fkey') THEN
    ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FileUpload_chatId_fkey') THEN
    ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FileUpload_messageId_fkey') THEN
    ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "DesignCheckpoint" (
  "id" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "projectId" TEXT,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '',
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesignCheckpoint_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DesignCheckpoint_chatId_idx" ON "DesignCheckpoint"("chatId");
CREATE INDEX IF NOT EXISTS "DesignCheckpoint_projectId_idx" ON "DesignCheckpoint"("projectId");
CREATE INDEX IF NOT EXISTS "DesignCheckpoint_userId_idx" ON "DesignCheckpoint"("userId");
CREATE INDEX IF NOT EXISTS "DesignCheckpoint_createdAt_idx" ON "DesignCheckpoint"("createdAt");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DesignCheckpoint_chatId_fkey') THEN
    ALTER TABLE "DesignCheckpoint" ADD CONSTRAINT "DesignCheckpoint_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "FeatureFlag" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'general',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FeatureFlag_key_key" ON "FeatureFlag"("key");
