import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import type { FactCheckResult, Claim, Source, Proof, ChatMessage } from "../types";
import {
  type FactCheckRepository,
  toClaimInput,
  toProofInput,
  toSourceInput,
} from "./repository";

/**
 * Prisma-backed implementation of FactCheckRepository.
 * This is the ONLY module that maps domain types <-> Prisma rows.
 * All queries are scoped by userId when provided (authenticated users).
 */
export const prismaRepository: FactCheckRepository = {
  async save(result, userId) {
    const created = await prisma.factCheck.create({
      data: {
        ...(userId ? { userId } : {}),
        inputType: result.inputType,
        inputRaw: result.inputRaw,
        inputPreview: result.inputPreview,
        verdict: result.verdict,
        confidence: result.confidence,
        summary: result.summary,
        reasoning: result.reasoning,
        claims: {
          create: result.claims.map((c) => ({
            ...toClaimInput(c),
            proofs: {
              create: (c.proofs ?? []).map((p) => toProofInput(p)),
            },
          })),
        },
        sources: { create: result.sources.map((s) => toSourceInput(s)) },
      },
      include: { claims: { include: { proofs: true } }, sources: true, messages: true },
    });
    return mapRowToResult(created);
  },

  async getById(id, userId) {
    const row = await prisma.factCheck.findFirst({
      where: { id, ...(userId ? { userId } : {}) },
      include: { claims: { include: { proofs: true } }, sources: true, messages: { orderBy: { createdAt: "asc" } } },
    });
    return row ? mapRowToResult(row) : null;
  },

  async list(limit = 50, offset = 0, userId) {
    const rows = await prisma.factCheck.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: { claims: { include: { proofs: true } }, sources: true },
    });
    return rows.map((row) => mapRowToResult(row as FactCheckRow));
  },

  async delete(id, userId) {
    await prisma.factCheck.deleteMany({
      where: { id, ...(userId ? { userId } : {}) },
    });
  },

  // --- Chat message storage ---

  async saveMessage(factCheckId, message) {
    const row = await prisma.chatMessage.create({
      data: {
        factCheckId,
        role: message.role,
        content: message.content,
        updatedVerdict: message.updatedVerdict,
        updatedConfidence: message.updatedConfidence,
        updatedSummary: message.updatedSummary,
      },
    });
    return mapRowToMessage(row);
  },

  async getMessages(factCheckId) {
    const rows = await prisma.chatMessage.findMany({
      where: { factCheckId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapRowToMessage);
  },

  async updateVerdict(id, verdict, confidence, summary) {
    await prisma.factCheck.update({
      where: { id },
      data: { verdict, confidence, summary },
    });
  },
};

// Prisma row -> domain type. Kept private to this module.
type FactCheckInclude = { claims: { include: { proofs: true } }; sources: true; messages?: boolean };
type FactCheckRow = Prisma.FactCheckGetPayload<{ include: FactCheckInclude }>;

function mapRowToResult(row: FactCheckRow): FactCheckResult {
  return {
    id: row.id,
    createdAt: row.createdAt,
    inputType: row.inputType as FactCheckResult["inputType"],
    inputRaw: row.inputRaw,
    inputPreview: row.inputPreview ?? undefined,
    verdict: row.verdict as FactCheckResult["verdict"],
    confidence: row.confidence,
    summary: row.summary ?? undefined,
    reasoning: row.reasoning ?? undefined,
    claims: row.claims.map((c): Claim => ({
      id: c.id,
      text: c.text,
      verdict: c.verdict as Claim["verdict"],
      confidence: c.confidence,
      explanation: c.explanation ?? undefined,
      proofs: c.proofs.map((p): Proof => ({
        id: p.id,
        kind: p.kind as Proof["kind"],
        sourceUrl: p.sourceUrl,
        sourceTitle: p.sourceTitle ?? undefined,
        excerpt: p.excerpt,
        note: p.note ?? undefined,
      })),
    })),
    sources: row.sources.map((s): Source => ({
      id: s.id,
      url: s.url,
      title: s.title ?? undefined,
      snippet: s.snippet ?? undefined,
      sourceType: s.sourceType as Source["sourceType"],
      reliability: s.reliability,
      accessedAt: s.accessedAt,
    })),
    messages: row.messages?.map(mapRowToMessage),
  };
}

type ChatMessageRow = Prisma.ChatMessageGetPayload<Record<string, never>>;

function mapRowToMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    factCheckId: row.factCheckId,
    createdAt: row.createdAt,
    role: row.role as ChatMessage["role"],
    content: row.content,
    updatedVerdict: row.updatedVerdict as ChatMessage["updatedVerdict"],
    updatedConfidence: row.updatedConfidence ?? undefined,
    updatedSummary: row.updatedSummary ?? undefined,
  };
}
