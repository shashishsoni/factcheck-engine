import type {
  FactCheckResult,
  Claim,
  Source,
  Proof,
  ChatMessage,
  Verdict,
} from "../types";

/**
 * Storage repository interface — decouples persistence from the rest of the app.
 * The Prisma implementation lives in `prisma-repository.ts`.
 * Swap implementations (e.g. in-memory for tests) without touching business logic.
 */
export interface FactCheckRepository {
  save(result: FactCheckResult, userId?: string): Promise<FactCheckResult>;
  getById(id: string, userId?: string): Promise<FactCheckResult | null>;
  list(limit?: number, offset?: number, userId?: string): Promise<FactCheckResult[]>;
  delete(id: string, userId?: string): Promise<void>;
  // Chat
  saveMessage(factCheckId: string, message: ChatMessageInput): Promise<ChatMessage>;
  getMessages(factCheckId: string): Promise<ChatMessage[]>;
  updateVerdict(id: string, verdict: Verdict, confidence: number, summary?: string): Promise<void>;
}

export interface ChatMessageInput {
  role: "user" | "assistant";
  content: string;
  updatedVerdict?: string | null;
  updatedConfidence?: number | null;
  updatedSummary?: string | null;
}

// Mappers between domain types and Prisma payload shapes are kept here so the
// repository is the only place that knows about Prisma's snake/camel quirks.
// NOTE: factCheckId/claimId are NOT included — Prisma sets them automatically
// when using nested creates (claims: { create: [...] } inside factCheck.create).

export function toClaimInput(c: Claim) {
  return {
    text: c.text,
    verdict: c.verdict,
    confidence: c.confidence,
    explanation: c.explanation,
  };
}

export function toProofInput(p: Proof) {
  return {
    kind: p.kind,
    sourceUrl: p.sourceUrl,
    sourceTitle: p.sourceTitle,
    excerpt: p.excerpt,
    note: p.note,
  };
}

export function toSourceInput(s: Source) {
  return {
    url: s.url,
    title: s.title,
    snippet: s.snippet,
    sourceType: s.sourceType,
    reliability: s.reliability,
    accessedAt: s.accessedAt ?? new Date(),
  };
}
