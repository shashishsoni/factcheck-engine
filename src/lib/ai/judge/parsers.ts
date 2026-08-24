import type { Proof, Verdict } from "../../types";
import { normalizeVerdict } from "../../verification/support/parsers";
import {
  capUnverifiableConfidence,
  clampConfidence,
  isRecord,
  normalizeStance,
  parseProofs,
  tryParseJson,
} from "./parser-utils";
import { optionalText as textValue } from "../shared/text-utils";
import {
  parseProseCrossExamination,
  parseProseEvaluation,
  splitClaimSections,
  type ParsedCrossExamination,
} from "./parser-prose";

export interface ParsedEvaluation {
  verdict: Verdict;
  confidence: number;
  explanation: string;
  proofs: Proof[];
}

export function parseEvaluation(raw: string): ParsedEvaluation {
  const parsed = tryParseJson(raw);
  return isRecord(parsed) ? parseEvaluationRecord(parsed) : parseProseEvaluation(raw);
}

export function parseCrossExamination(
  raw: string,
  originalVerdict: Verdict,
  originalConfidence: number,
): ParsedCrossExamination {
  const parsed = tryParseJson(raw);
  if (!isRecord(parsed)) return parseProseCrossExamination(raw, originalVerdict, originalConfidence);

  const revisedVerdict = textValue(parsed.revisedVerdict);
  return {
    stance: normalizeStance(parsed.stance),
    argument: textValue(parsed.argument) ?? "",
    revisedVerdict: revisedVerdict && revisedVerdict !== "same"
      ? normalizeVerdict(revisedVerdict)
      : originalVerdict,
    revisedConfidence: parsed.revisedConfidence != null
      ? clampConfidence(parsed.revisedConfidence)
      : originalConfidence,
  };
}

function parseEvaluationRecord(parsed: Record<string, unknown>): ParsedEvaluation {
  const verdict = normalizeVerdict(textValue(parsed.verdict) ?? textValue(parsed.label));
  return {
    verdict,
    confidence: capUnverifiableConfidence(verdict, clampConfidence(parsed.confidence)),
    explanation: textValue(parsed.explanation) ?? textValue(parsed.reasoning) ?? textValue(parsed.analysis) ?? "",
    proofs: parseProofs(parsed.proofs),
  };
}

// ---------------------------------------------------------------------------
// Batch parsers — parse a JSON array of per-claim results from a single
// model call that evaluated all claims at once.
// ---------------------------------------------------------------------------

/**
 * Parse a batch ensemble response into one ParsedEvaluation per claim.
 * Falls back to "unverifiable" for any claim the model skipped or that
 * failed to parse, so the array length always matches the claim count.
 */
export function parseBatchEvaluation(raw: string, claimCount: number): ParsedEvaluation[] {
  const fallback: ParsedEvaluation = {
    verdict: "unverifiable",
    confidence: 0,
    explanation: "Could not parse evaluation.",
    proofs: [],
  };
  const parsed = tryParseJson(raw);
  const items = getBatchItems(parsed, claimCount, true);
  if (items) {
    const results = new Array<ParsedEvaluation>(claimCount).fill(fallback);
    for (const [position, item] of items.entries()) {
      if (!isRecord(item)) continue;
      const index = typeof item.claimIndex === "number" ? item.claimIndex : position;
      if (index >= 0 && index < claimCount) results[index] = parseEvaluationRecord(item);
    }
    const unparsed = results.filter((r) => r.explanation === fallback.explanation).length;
    if (unparsed === claimCount) {
      console.error(`[parseBatchEvaluation] ALL ${claimCount} claims unparsed. rawLen=${raw.length}, items=${items.length}, rawStart=${JSON.stringify(raw.slice(0, 300))}`);
    }
    return results;
  }
  console.error(`[parseBatchEvaluation] getBatchItems returned null. rawLen=${raw.length}, parsedType=${typeof parsed}, rawStart=${JSON.stringify(raw.slice(0, 300))}`);
  return parseProseBatchEvaluation(raw, claimCount, fallback);
}

function parseProseBatchEvaluation(
  raw: string,
  claimCount: number,
  fallback: ParsedEvaluation,
): ParsedEvaluation[] {
  if (claimCount === 1) return [parseProseEvaluation(raw)];
  const results = new Array<ParsedEvaluation>(claimCount).fill(fallback);
  for (const section of splitClaimSections(raw)) {
    const index = section.claimNumber - 1;
    if (index >= 0 && index < claimCount) results[index] = parseProseEvaluation(section.text);
  }
  return results;
}

/**
 * Parse a batch cross-examination response into per-claim cross-examination
 * payloads. Each entry aligns with the claim at the same index.
 */
export function parseBatchCrossExamination(
  raw: string,
  candidates: { verdict: Verdict; confidence: number }[],
): ParsedCrossExamination[] {
  const items = getBatchItems(tryParseJson(raw), candidates.length, false);
  if (items) {
    const results = candidates.map((candidate) => makeCrossFallback("", candidate.verdict, candidate.confidence));
    for (const [position, item] of items.entries()) {
      if (!isRecord(item) || position >= candidates.length) continue;
      const index = typeof item.claimIndex === "number" ? item.claimIndex : position;
      if (index < 0 || index >= candidates.length) continue;
      const original = candidates[index];
      const revisedVerdict = textValue(item.revisedVerdict);
      results[index] = {
        stance: normalizeStance(item.stance),
        argument: textValue(item.argument) ?? "",
        revisedVerdict: revisedVerdict && revisedVerdict !== "same"
          ? normalizeVerdict(revisedVerdict)
          : original.verdict,
        revisedConfidence: item.revisedConfidence != null
          ? clampConfidence(item.revisedConfidence)
          : original.confidence,
      };
    }
    return results;
  }

  const sections = splitClaimSections(raw);
  if (sections.length > 0) {
    return candidates.map((candidate, index) => {
      const section = sections.find((item) => item.claimNumber === index + 1);
      return section
        ? parseProseCrossExamination(section.text, candidate.verdict, candidate.confidence)
        : makeCrossFallback("", candidate.verdict, candidate.confidence);
    });
  }
  return candidates.map((candidate) => parseCrossExamination(raw, candidate.verdict, candidate.confidence));
}

function getBatchItems(parsed: unknown, claimCount: number, allowEvaluations: boolean): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (!isRecord(parsed)) return null;
  for (const key of ["results", "evaluations", "claims", "verdicts", "items", "data"]) {
    if (Array.isArray(parsed[key])) return parsed[key] as unknown[];
  }
  if (!allowEvaluations && Array.isArray(parsed.evaluations)) return parsed.evaluations as unknown[];
  return claimCount === 1 ? [parsed] : null;
}

function makeCrossFallback(
  raw: string,
  verdict: Verdict,
  confidence: number,
): ParsedCrossExamination {
  return {
    stance: "agree",
    argument: raw.slice(0, 300),
    revisedVerdict: verdict,
    revisedConfidence: confidence,
  };
}
