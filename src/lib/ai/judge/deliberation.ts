import type { CrossExamination, EvaluatedClaim } from "../../types";
import type { BatchCandidate, Candidate } from "./prompts";
import type { ParsedEvaluation } from "./parsers";

export function buildDeliberationSummary(
  candidates: Candidate[],
  crossExaminations: CrossExamination[],
  result: EvaluatedClaim,
): string {
  const lines = [
    `Round 1 — Independent evaluations (${candidates.length} models):`,
    ...candidates.map((candidate) =>
      `  ${candidate.provider}: ${candidate.parsed.verdict} (${candidate.parsed.confidence}%)`,
    ),
    "",
    "Round 2 — Cross-examination (models debate):",
  ];

  for (const examination of crossExaminations) {
    const stance = examination.stance === "agree"
      ? "AGREES"
      : examination.stance === "disagree"
        ? "DISAGREES"
        : "PARTIAL";
    lines.push(`  ${examination.model} ${stance}: ${examination.argument.slice(0, 150)}`);
    const original = candidates.find((candidate) => candidate.provider === examination.model)?.parsed.verdict;
    if (examination.revisedVerdict && examination.revisedVerdict !== original) {
      lines.push(`    → Revised to: ${examination.revisedVerdict} (${examination.revisedConfidence}%)`);
    }
  }

  lines.push(
    "",
    `Round 3 — Judge's final verdict: ${result.verdict} (${result.confidence}%)`,
    `Reasoning: ${result.explanation.slice(0, 200)}`,
  );
  return lines.join("\n");
}

export function buildBatchDeliberationSummary(
  claims: string[],
  candidates: BatchCandidate[],
  crossExaminationsByClaim: CrossExamination[][],
  results: EvaluatedClaim[],
): string {
  const lines = [
    `Round 1 — Independent evaluations (${candidates.length} models, ${claims.length} claims):`,
  ];
  for (let i = 0; i < claims.length; i++) {
    lines.push(`  Claim ${i + 1}: ${claims[i].slice(0, 80)}`);
    for (const candidate of candidates) {
      const parsed = candidate.parsed[i];
      if (parsed) lines.push(`    ${candidate.provider}: ${parsed.verdict} (${parsed.confidence}%)`);
    }
  }
  lines.push("", "Round 2 — Cross-examination:");
  for (let i = 0; i < claims.length; i++) {
    lines.push(`  Claim ${i + 1}:`);
    for (const cross of crossExaminationsByClaim[i] ?? []) {
      const stance = cross.stance === "agree" ? "AGREES" : cross.stance === "disagree" ? "DISAGREES" : "PARTIAL";
      lines.push(`    ${cross.model} ${stance}: ${cross.argument.slice(0, 100)}`);
    }
  }
  lines.push("", `Round 3 — Judge's final verdicts (${results.length} claims):`);
  for (let i = 0; i < results.length; i++) {
    lines.push(`  Claim ${i + 1}: ${results[i].verdict} (${results[i].confidence}%)`);
  }
  return lines.join("\n");
}

export function toEvaluatedClaim(claim: string, parsed: ParsedEvaluation): EvaluatedClaim {
  return {
    text: claim,
    verdict: parsed.verdict,
    confidence: parsed.confidence,
    explanation: parsed.explanation,
    proofs: parsed.proofs,
  };
}
