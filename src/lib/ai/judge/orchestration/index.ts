import type { AiProvider } from "../../types";
import type {
  CasePacket,
  EvaluatedClaim,
  EvidenceContext,
  ProgressCallback,
} from "../../../types";
import { buildDeliberationSummary, toEvaluatedClaim } from "../deliberation";
import type { Candidate } from "../prompts";
import {
  crossExamine as crossExamineSingle,
  judgeAdjudicate as judgeAdjudicateSingle,
  runEvaluations,
} from "./single";
import {
  crossExamineBatch,
  emitBatchJudgeDone,
  judgeAdjudicateBatch,
  runBatchEvaluations,
} from "./batch";

/**
 * JudgeOrchestrator — coordinates the ensemble → cross-examine → judge
 * pipeline.
 *
 * SINGLE-CLAIM path: 5 AIs evaluate 1 claim in parallel, cross-examine, judge.
 * MULTI-CLAIM path (BATCH): each provider evaluates ALL claims in ONE call,
 * then batch cross-examine, then batch judge. This dramatically reduces request
 * count — 5 ensemble + N cross-examine + 1 judge = ~N+6 requests total,
 * instead of 5N + N² + N for the single path.
 */
export class JudgeOrchestrator {
  constructor(
    private readonly ensemble: AiProvider[],
    private readonly judge: AiProvider,
  ) {}

  async evaluateClaim(
    claim: string,
    evidence: EvidenceContext,
    onProgress?: ProgressCallback,
  ): Promise<EvaluatedClaim> {
    const emit = onProgress ?? (() => {});
    const available = this.ensemble.filter((provider) => provider.isAvailable()).slice(0, 5);
    emit({
      step: "ensemble",
      status: "started",
      claim,
      models: available.map((p) => p.name),
      evaluations: available.map((p) => ({ model: p.name, status: "thinking" as const })),
    });

    const { candidates, errors } = await runEvaluations({ claim, evidence, providers: available, emit });
    const evaluations = available.map((provider) => buildEnsembleEvaluation(provider, candidates, errors));
    emit({ step: "ensemble", status: "done", claim, models: available.map((p) => p.name), evaluations });

    if (candidates.length === 0) return unverifiableClaim(claim);
    if (candidates.length === 1) return toEvaluatedClaim(claim, candidates[0].parsed);

    const crossExaminations = await crossExamineSingle({
      claim,
      candidates,
      emit,
      ensemble: this.ensemble,
      judge: this.judge,
    });
    emit({ step: "judge", status: "started", claim, model: this.judge.name, thinking: "" });
    const result = await judgeAdjudicateSingle({
      claim,
      evidence,
      candidates,
      crossExaminations,
      emit,
      ensemble: this.ensemble,
      judge: this.judge,
    });
    emit({
      step: "judge",
      status: "done",
      claim,
      model: this.judge.name,
      verdict: result.verdict,
      confidence: result.confidence,
      reasoning: result.explanation.slice(0, 600),
      deliberation: buildDeliberationSummary(candidates, crossExaminations, result),
    });
    return result;
  }

  async evaluateClaims(packet: CasePacket, onProgress?: ProgressCallback): Promise<EvaluatedClaim[]> {
    const { claims, contexts } = packet;
    const emit = onProgress ?? (() => {});
    if (claims.length === 0) return [];
    if (claims.length === 1) return [await this.evaluateClaim(claims[0], contexts[0], onProgress)];

    // BATCH path: each provider evaluates ALL claims in ONE model call.
    // Request count: 5 ensemble + N cross-examine + 1 judge = ~N+6 total,
    // instead of 5N + N² + N for the single path. Critical for free-tier
    // rate limits — 3 claims = ~9 requests vs ~33 for single path.
    const available = this.ensemble.filter((provider) => provider.isAvailable()).slice(0, 5);

    for (const claim of claims) {
      emit({
        step: "ensemble",
        status: "started",
        claim,
        models: available.map((p) => p.name),
        evaluations: available.map((p) => ({ model: p.name, status: "thinking" as const })),
      });
    }

    const { candidates, errors } = await runBatchEvaluations({
      packet,
      providers: available,
      emit,
      claims,
    });

    for (const claim of claims) {
      const claimIndex = claims.indexOf(claim);
      const evaluations = available.map((provider) =>
        buildBatchEnsembleEvaluation(provider, candidates, errors, claimIndex),
      );
      emit({ step: "ensemble", status: "done", claim, models: available.map((p) => p.name), evaluations });
    }

    if (candidates.length === 0) return claims.map((claim) => unverifiableClaim(claim));
    if (candidates.length === 1) {
      return claims.map((claim, i) => toEvaluatedClaim(claim, candidates[0].parsed[i]));
    }

    const crossExaminationsByClaim = await crossExamineBatch({
      packet,
      candidates,
      emit,
      claims,
      ensemble: this.ensemble,
      judge: this.judge,
    });

    for (const claim of claims) {
      emit({ step: "judge", status: "started", claim, model: this.judge.name, thinking: "" });
    }
    const results = await judgeAdjudicateBatch({
      packet,
      candidates,
      crossExaminationsByClaim,
      emit,
      claims,
      judge: this.judge,
    });

    emitBatchJudgeDone({
      packet,
      claims,
      candidates,
      crossExaminationsByClaim,
      results,
      judge: this.judge,
      emit,
    });

    return results;
  }

}

function buildEnsembleEvaluation(provider: AiProvider, candidates: Candidate[], errors: Map<string, string>) {
  const candidate = candidates.find((item) => item.provider === provider.name);
  return candidate
    ? {
        model: provider.name,
        verdict: candidate.parsed.verdict,
        confidence: candidate.parsed.confidence,
        reasoning: candidate.parsed.explanation.slice(0, 400),
        status: "done" as const,
      }
    : { model: provider.name, status: "failed" as const, reasoning: errors.get(provider.name) ?? "Model failed to respond" };
}

function buildBatchEnsembleEvaluation(
  provider: AiProvider,
  candidates: { provider: string; parsed: { verdict: string; confidence: number; explanation: string }[] }[],
  errors: Map<string, string>,
  claimIndex: number,
) {
  const candidate = candidates.find((item) => item.provider === provider.name);
  const parsed = candidate?.parsed[claimIndex];
  return parsed
    ? {
        model: provider.name,
        verdict: parsed.verdict,
        confidence: parsed.confidence,
        reasoning: parsed.explanation.slice(0, 400),
        status: "done" as const,
      }
    : { model: provider.name, status: "failed" as const, reasoning: errors.get(provider.name) ?? "Model failed to respond" };
}

function unverifiableClaim(claim: string): EvaluatedClaim {
  return { text: claim, verdict: "unverifiable", confidence: 0, explanation: "All evaluation models failed to respond.", proofs: [] };
}
