-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "factCheckId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedVerdict" TEXT,
    "updatedConfidence" INTEGER,
    "updatedSummary" TEXT,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatMessage_factCheckId_idx" ON "ChatMessage"("factCheckId");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_factCheckId_fkey" FOREIGN KEY ("factCheckId") REFERENCES "FactCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
