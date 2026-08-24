// Core domain types shared across all decoupled layers.
// These are framework-agnostic — no Next.js, no Prisma, no AI SDK imports here.

export type InputType =
  | "url"
  | "image"
  | "video"
  | "audio"
  | "article"
  | "book"
  | "social"
  | "text";

export const LANGUAGE_MODES = ["en", "hi"] as const;
export type LanguageMode = (typeof LANGUAGE_MODES)[number];

export type Verdict =
  | "pending"
  | "true"
  | "mostly_true"
  | "mixed"
  | "mostly_false"
  | "false"
  | "unverifiable";

export type ProofKind = "supports" | "contradicts" | "contextual";

export type SourceType =
  | "web"
  | "social"
  | "official"
  | "academic"
  | "news";

/** A normalized claim extracted from any input type. */
export interface Claim {
  id?: string;
  text: string;
  verdict: Verdict;
  confidence: number; // 0-100
  explanation?: string;
  proofs?: Proof[];
}

/** A source consulted during verification. */
export interface Source {
  id?: string;
  url: string;
  title?: string;
  snippet?: string;
  sourceType: SourceType;
  reliability: number; // 0-100
  publishedDate?: string;
  accessedAt?: Date;
}

/** A piece of evidence tied to a claim. */
export interface Proof {
  id?: string;
  kind: ProofKind;
  sourceUrl: string;
  sourceTitle?: string;
  excerpt: string;
  note?: string;
}

/** The full result of a fact-check run. */
export interface FactCheckResult {
  id?: string;
  createdAt?: Date;
  inputType: InputType;
  inputRaw: string;
  inputPreview?: string;
  verdict: Verdict;
  confidence: number; // 0-100
  summary?: string;
  reasoning?: string;
  claims: Claim[];
  sources: Source[];
  messages?: ChatMessage[];
}

/** A chat message in the back-and-forth conversation about a fact-check. */
export interface ChatMessage {
  id?: string;
  factCheckId?: string;
  createdAt?: Date;
  role: "user" | "assistant";
  content: string;
  updatedVerdict?: Verdict | null;
  updatedConfidence?: number | null;
  updatedSummary?: string | null;
}

/** Normalized content extracted from an input by an InputAdapter. */
export interface ExtractedContent {
  inputType: InputType;
  rawInput: string;
  preview: string; // human-readable label
  textContent?: string; // English text used for claims and evidence search
  originalTextContent?: string; // Original transcript for display-language switching
  mediaUrls?: string[]; // images/video/audio to analyze
  metadata?: Record<string, string>; // EXIF, author, date, title, etc.
  claims?: string[]; // pre-extracted claims if the source provides them
}

/** A search hit from a source-gathering adapter. */
export interface SearchHit {
  url: string;
  title?: string;
  snippet?: string;
  sourceType: SourceType;
  reliability: number;
  /** Publication date (ISO string) if available — used to sort newest-first. */
  publishedDate?: string;
}

/** A task the AI orchestrator can route to a provider. */
export type AiTask =
  | { kind: "extract-claims"; content: ExtractedContent }
  | { kind: "analyze-media"; mediaUrl: string; context?: string }
  | { kind: "evaluate-claim"; claim: string; evidence: EvidenceContext }
  | { kind: "evaluate-claims"; packet: CasePacket }
  | { kind: "synthesize-verdict"; claims: EvaluatedClaim[]; sources: Source[]; language: LanguageMode }
  | { kind: "raw-text"; prompt: string };

/**
 * A structured case packet that bundles every claim with its own evidence
 * context plus the original source content/transcript. Used for batch
 * evaluation so a single model call can reason over the entire case while
 * keeping claim boundaries explicit.
 */
export interface CasePacket {
  /** Original source content / transcript — what the person actually said. */
  content: ExtractedContent;
  /** All claims extracted from the content, in order. */
  claims: string[];
  /** One evidence context per claim, aligned by index with `claims`. */
  contexts: EvidenceContext[];
}

export interface EvidenceContext {
  claim: string;
  supporting: SearchHit[];
  contradicting: SearchHit[];
  contextual: SearchHit[];
}

export interface EvaluatedClaim {
  text: string;
  verdict: Verdict;
  confidence: number;
  explanation: string;
  proofs: Proof[];
}

export type {
  CrossExamination,
  ModelEvaluation,
  ProgressCallback,
  ProgressEvent,
  SourceDetail,
} from "./progress-types";
