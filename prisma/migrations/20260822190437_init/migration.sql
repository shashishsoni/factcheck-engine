pnpm dev-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('pending', 'true', 'mostly_true', 'mixed', 'mostly_false', 'false', 'unverifiable');

-- CreateEnum
CREATE TYPE "ProofKind" AS ENUM ('supports', 'contradicts', 'contextual');

-- CreateTable
CREATE TABLE "FactCheck" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inputType" TEXT NOT NULL,
    "inputRaw" TEXT NOT NULL,
    "inputPreview" TEXT,
    "verdict" "Verdict" NOT NULL DEFAULT 'pending',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "reasoning" TEXT,

    CONSTRAINT "FactCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "factCheckId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "text" TEXT NOT NULL,
    "verdict" "Verdict" NOT NULL DEFAULT 'pending',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "explanation" TEXT,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "factCheckId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "snippet" TEXT,
    "sourceType" TEXT NOT NULL,
    "reliability" INTEGER NOT NULL DEFAULT 50,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proof" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "ProofKind" NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceTitle" TEXT,
    "excerpt" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "Proof_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FactCheck_createdAt_idx" ON "FactCheck"("createdAt");

-- CreateIndex
CREATE INDEX "FactCheck_verdict_idx" ON "FactCheck"("verdict");

-- CreateIndex
CREATE INDEX "Claim_factCheckId_idx" ON "Claim"("factCheckId");

-- CreateIndex
CREATE INDEX "Source_factCheckId_idx" ON "Source"("factCheckId");

-- CreateIndex
CREATE INDEX "Proof_claimId_idx" ON "Proof"("claimId");

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_factCheckId_fkey" FOREIGN KEY ("factCheckId") REFERENCES "FactCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_factCheckId_fkey" FOREIGN KEY ("factCheckId") REFERENCES "FactCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proof" ADD CONSTRAINT "Proof_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
