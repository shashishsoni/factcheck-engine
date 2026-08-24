import type { FactCheckResult } from "@/lib/types";
import type { ClaimEvalState, EvidenceState } from "../types";

export interface StreamEvent {
  step: string;
  status?: "started" | "done" | "failed";
  detail?: string;
  model?: string;
  method?: string;
  claims?: string[];
  verdict?: string;
  confidence?: number;
  summary?: string;
  preview?: string;
  inputType?: string;
  rawInput?: string;
  metadata?: Record<string, string>;
  claim?: string;
  sources?: number;
  sourceList?: EvidenceState["sources"];
  searchQueries?: string[];
  models?: string[];
  evaluations?: ClaimEvalState["evaluations"];
  chunk?: string;
  fullText?: string;
  round?: number;
  activeModel?: string;
  examinations?: ClaimEvalState["crossExaminations"];
  thinking?: string;
  reasoning?: string;
  deliberation?: string;
  result?: FactCheckResult;
  error?: string;
}
