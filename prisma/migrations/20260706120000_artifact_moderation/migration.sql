-- Artifact moderation (admin): hide/remove user-generated chats with an audit trail.

ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "moderationNote" TEXT;
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "moderatedById" TEXT;
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Chat_isHidden_idx" ON "Chat"("isHidden");
