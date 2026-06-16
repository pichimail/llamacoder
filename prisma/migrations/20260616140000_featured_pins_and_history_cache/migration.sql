-- AlterTable
ALTER TABLE "Chat" ADD COLUMN "historySummary" TEXT,
ADD COLUMN "historySummaryKey" TEXT,
ADD COLUMN "historySummaryAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FeaturedPin" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "prompt" TEXT NOT NULL DEFAULT '',
    "tags" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeaturedPin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedPin_slug_key" ON "FeaturedPin"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedPin_messageId_key" ON "FeaturedPin"("messageId");

-- CreateIndex
CREATE INDEX "FeaturedPin_sortOrder_createdAt_idx" ON "FeaturedPin"("sortOrder", "createdAt");