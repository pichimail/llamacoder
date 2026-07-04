-- CreateTable
CREATE TABLE "PromptLibraryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "tone" TEXT NOT NULL DEFAULT 'Balanced',
    "tags" JSONB,
    "variables" JSONB,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "shareToken" TEXT,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptLibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromptLibraryItem_userId_idx" ON "PromptLibraryItem"("userId");

-- CreateIndex
CREATE INDEX "PromptLibraryItem_category_idx" ON "PromptLibraryItem"("category");

-- CreateIndex
CREATE INDEX "PromptLibraryItem_visibility_idx" ON "PromptLibraryItem"("visibility");

-- CreateIndex
CREATE INDEX "PromptLibraryItem_createdAt_idx" ON "PromptLibraryItem"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromptLibraryItem_shareToken_key" ON "PromptLibraryItem"("shareToken");

-- AddForeignKey
ALTER TABLE "PromptLibraryItem" ADD CONSTRAINT "PromptLibraryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
