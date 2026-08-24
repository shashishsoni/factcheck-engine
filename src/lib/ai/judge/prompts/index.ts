import type { CrossExamination, EvidenceContext } from "../../../types";
import type { ParsedEvaluation } from "../parsers";
import { currentDateLabel, formatEvidence } from "../../shared/prompt-utils";

export type Candidate = {
  provider: string;
  parsed: ParsedEvaluation;
  raw: string;
};

/**
 * A candidate that carries per-claim evaluations for the entire case.
 * Used by the batch evaluation flow so cross-examination and judging can
 * reason over all claims in a single model call.
 */
export type BatchCandidate = {
  provider: string;
  /** One parsed evaluation per claim, aligned by index with the packet claims. */
  parsed: ParsedEvaluation[];
  raw: string;
};

export function buildCrossExaminationPrompt(
  claim: string,
  candidate: Candidate,
  candidates: Candidate[],
): string {
  const others = candidates
    .filter((item) => item.provider !== candidate.provider)
    .map((item) => `${item.provider}: ${item.parsed.verdict} (${item.parsed.confidence}%) — ${item.parsed.explanation.slice(0, 150)}`)
    .join("\n");

  return [
    "You are one of several AI models evaluating the same claim. You have just given your initial evaluation. Review the other models' evaluations and respond.",
    "",
    `TODAY'S DATE: ${currentDateLabel()}`,
    "The evidence was gathered live from the web today. Use the provided sources as your primary knowledge, not training data.",
    "Sources dated after your training cutoff are not suspicious; they are newer live evidence. Do not mark a claim false merely because you do not recognize the event.",
    "",
    `Your initial evaluation: ${candidate.parsed.verdict} (${candidate.parsed.confidence}%)`,
    `Reasoning: ${candidate.parsed.explanation.slice(0, 300)}`,
    "",
    "Other models' evaluations:",
    others || "(none)",
    "",
    "Agree, disagree, or partially agree. Explain disagreements and revise your verdict when another model has better evidence.",
    "Return only valid JSON:",
    '{"stance":"agree|disagree|partial","argument":"Your response.","revisedVerdict":"same|true|mostly_true|mixed|mostly_false|false|unverifiable","revisedConfidence":0-100}',
    "",
    `CLAIM: ${claim}`,
  ].join("\n");
}

export function buildJudgePrompt(
  claim: string,
  evidence: EvidenceContext,
  candidates: Candidate[],
  crossExaminations: CrossExamination[],
): string {
  const totalSources = evidence.supporting.length + evidence.contradicting.length + evidence.contextual.length;
  return [
    "You are the final judge in a fact-checking tribunal. Review the independent evaluations, cross-examination, and original live evidence. Produce the most accurate strict verdict.",
    "",
    `TODAY'S DATE: ${currentDateLabel()}`,
    `We collected ${totalSources} live web sources. They are your primary knowledge base; do not substitute model memory for the evidence below.`,
    "Sources newer than your training cutoff are valid live evidence. Only use unverifiable when credible evidence is absent, and only use false when credible evidence explicitly contradicts the claim.",
    "Weigh official and academic sources above reputable news, and reputable news above general web sources. Cite specific supplied sources in proofs. Never fabricate sources.",
    "",
    `CLAIM: ${claim}`,
    "",
    "=== INDEPENDENT EVALUATIONS ===",
    ...candidates.map((candidate, index) =>
      `\n[Model ${index + 1}: ${candidate.provider}]\nVerdict: ${candidate.parsed.verdict} (${candidate.parsed.confidence}%)\nExplanation: ${candidate.parsed.explanation}\nProofs: ${candidate.parsed.proofs.length}`,
    ),
    "",
    "=== CROSS-EXAMINATION ===",
    ...crossExaminations.map((examination) =>
      `\n[${examination.model} — ${examination.stance.toUpperCase()}]\nResponding to: ${examination.respondingTo ?? "all"}\nArgument: ${examination.argument}\nRevised verdict: ${examination.revisedVerdict ?? "unchanged"} (${examination.revisedConfidence ?? "unchanged"}%)`,
    ),
    "",
    `=== SUPPORTING EVIDENCE (${evidence.supporting.length}) ===`,
    ...formatEvidence(evidence.supporting),
    `=== CONTRADICTING EVIDENCE (${evidence.contradicting.length}) ===`,
    ...formatEvidence(evidence.contradicting),
    `=== CONTEXTUAL EVIDENCE (${evidence.contextual.length}) ===`,
    ...formatEvidence(evidence.contextual),
    "",
    "Return only valid JSON:",
    '{"verdict":"true|mostly_true|mixed|mostly_false|false|unverifiable","confidence":0-100,"explanation":"...","proofs":[{"kind":"supports|contradicts|contextual","sourceUrl":"...","sourceTitle":"...","excerpt":"..."}]}',
  ].join("\n");
}

// Batch prompt builders live in prompts-batch.ts; re-exported here so the
// existing `from "./prompts"` imports keep working.
export { buildBatchEnsemblePrompt, buildBatchCrossExaminationPrompt, buildBatchJudgePrompt } from "./batch";
