-- Add StudioGeneration table for the Studio page (image/video/music generation).

CREATE TABLE IF NOT EXISTS "StudioGeneration" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "options" JSONB,
  "taskId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "resultUrls" JSONB,
  "title" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "StudioGeneration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StudioGeneration_userId_idx" ON "StudioGeneration"("userId");
CREATE INDEX IF NOT EXISTS "StudioGeneration_status_idx" ON "StudioGeneration"("status");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudioGeneration_userId_fkey') THEN
    ALTER TABLE "StudioGeneration" ADD CONSTRAINT "StudioGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
