import type { AiProvider } from "../../types";
import type {
  AiTask,
  CrossExamination,
  EvaluatedClaim,
} from "../../../types";
import {
  buildBatchCrossExaminationPrompt,
  buildBatchJudgePrompt,
  type BatchCandidate,
} from "../prompts";
import {
  parseBatchCrossExamination,
  parseBatchEvaluation,
} from "../parsers";
import { toEvaluatedClaim, buildBatchDeliberationSummary } from "../deliberation";
import type {
  BatchDebateContext,
  BatchEvaluationContext,
  BatchJudgeContext,
  BatchJudgeDoneContext,
} from "./contexts";
import { appendThinking } from "./stream-utils";

/**
 * Batch evaluation helpers — evaluate ALL claims in one model call per
 * provider. Extracted from JudgeOrchestrator so the class stays focused on
 * coordination; these functions take the ensemble/judge explicitly.
 */

export async function runBatchEvaluations(
  { packet, providers, emit, claims }: BatchEvaluationContext,
): Promise<{ candidates: BatchCandidate[]; errors: Map<string, string> }> {
  for (const provider of providers) {
    const initMessage = provider.name.includes("groq")
      ? "Fast 120B reasoning on Groq..."
      : provider.name.includes("ultra")
        ? "Loading 550B model — deep reasoning in progress..."
        : provider.name.includes("llama")
          ? "Evaluating claims with Llama 3.1 70B..."
          : "Initializing model...";
    for (const claim of claims) {
      emit({
        step: "thinking",
        status: "started",
        claim,
        model: provider.name,
        chunk: initMessage,
        fullText: initMessage,
      });
    }
  }

  const results = await Promise.allSettled(
    providers.map(async (provider) => {
      const task: AiTask = { kind: "evaluate-claims", packet };
      let thinking = "";
      const raw = await provider.runStream(task, (chunk) => {
        thinking = appendThinking(thinking, chunk);
        for (const claim of claims) {
          emit({ step: "thinking", status: "started", claim, model: provider.name, chunk, fullText: thinking });
        }
      });
      return { provider: provider.name, parsed: parseBatchEvaluation(raw, claims.length), raw };
    }),
  );
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      const unparsed = r.value.parsed.filter((p) => p.explanation === "Could not parse evaluation.").length;
      if (unparsed > 0) {
        console.error(`[batch-ensemble] ${providers[i].name}: rawLen=${r.value.raw.length}, unparsed=${unparsed}/${r.value.parsed.length}, rawStart=${JSON.stringify(r.value.raw.slice(0, 200))}`);
      }
    } else {
      console.error(`[batch-ensemble] ${providers[i].name}: FAILED - ${r.reason}`);
    }
  }
  return collectBatchCandidates(results, providers);
}

export async function crossExamineBatch(
  { packet, candidates, emit, claims, ensemble, judge }: BatchDebateContext,
): Promise<CrossExamination[][]> {
  const claimCount = claims.length;
  const examinationsByClaim: CrossExamination[][] = Array.from({ length: claimCount }, () => []);

  for (const claim of claims) {
    emit({ step: "cross-examine", status: "started", claim, round: 1, examinations: [] });
  }

  const crossResults = await Promise.allSettled(
    candidates.map(async (candidate) => {
      for (const claim of claims) {
        emit({ step: "cross-examine", status: "started", claim, round: 1, activeModel: candidate.provider, examinations: [] });
      }
      const provider = ensemble.find((item) => item.name === candidate.provider) ?? judge;
      let thinking = "";
      const raw = await provider.runStream(
        { kind: "raw-text", prompt: buildBatchCrossExaminationPrompt(packet, candidate, candidates) },
        (chunk) => {
          thinking = appendThinking(thinking, chunk);
          for (let i = 0; i < claims.length; i++) {
            emit({
              step: "cross-examine",
              status: "started",
              claim: claims[i],
              round: 1,
              activeModel: candidate.provider,
              examinations: [
                ...(examinationsByClaim[i] ?? []),
                { model: candidate.provider, stance: "agree", argument: "", status: "thinking", thinking },
              ],
            });
          }
        },
      );
      const originalVerdicts = candidate.parsed.map((p) => ({ verdict: p.verdict, confidence: p.confidence }));
      return {
        candidate,
        parsed: parseBatchCrossExamination(raw, originalVerdicts),
        thinking,
      };
    }),
  );

  for (let ci = 0; ci < candidates.length; ci++) {
    const result = crossResults[ci];
    const candidate = candidates[ci];
    if (result.status === "fulfilled") {
      const { parsed, thinking } = result.value;
      for (let i = 0; i < claimCount; i++) {
        examinationsByClaim[i].push({
          model: candidate.provider,
          stance: parsed[i].stance,
          respondingTo: candidates.filter((item) => item.provider !== candidate.provider).map((item) => item.provider).join(", "),
          argument: parsed[i].argument,
          revisedVerdict: parsed[i].revisedVerdict,
          revisedConfidence: parsed[i].revisedConfidence,
          status: "done",
          thinking,
        });
      }
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      console.error(`[cross-examine] ${candidate.provider} failed: ${reason}`);
      for (let i = 0; i < claimCount; i++) {
        examinationsByClaim[i].push({ model: candidate.provider, stance: "agree", argument: `(cross-examination failed: ${reason})`, status: "failed" });
      }
    }
  }

  for (let i = 0; i < claimCount; i++) {
    emit({ step: "cross-examine", status: "done", claim: claims[i], round: 1, examinations: examinationsByClaim[i] });
  }
  return examinationsByClaim;
}

export async function judgeAdjudicateBatch(
  { packet, candidates, crossExaminationsByClaim, emit, claims, judge }: BatchJudgeContext,
): Promise<EvaluatedClaim[]> {
  const prompt = buildBatchJudgePrompt(packet, candidates, crossExaminationsByClaim);
  let thinking = "";
  let raw = "";
  try {
    raw = await judge.runStream({ kind: "raw-text", prompt }, (chunk) => {
      thinking = appendThinking(thinking, chunk);
      for (const claim of claims) {
        emit({ step: "judge", status: "started", claim, model: judge.name, thinking });
      }
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[batch-judge] judge.runStream failed: ${reason}`);
    // If the judge fails entirely, fall back to the first candidate's evaluations.
    const fallbackParsed = candidates[0]?.parsed ?? claims.map(() => ({
      verdict: "unverifiable" as const,
      confidence: 0,
      explanation: `Judge model unavailable: ${reason}`,
      proofs: [],
    }));
    return claims.map((claim, i) => toEvaluatedClaim(claim, fallbackParsed[i]));
  }
  const parsed = parseBatchEvaluation(raw, claims.length);
  const unparsed = parsed.filter((p) => p.explanation === "Could not parse evaluation.").length;
  if (unparsed > 0) {
    console.error(`[batch-judge] rawLen=${raw.length}, unparsed=${unparsed}/${parsed.length}, rawStart=${JSON.stringify(raw.slice(0, 300))}`);
  }
  // If the judge's response was completely unparsed, fall back to the best candidate.
  if (unparsed === parsed.length && candidates.length > 0) {
    console.error(`[batch-judge] all claims unparsed, falling back to first candidate`);
    return claims.map((claim, i) => toEvaluatedClaim(claim, candidates[0].parsed[i]));
  }
  return claims.map((claim, i) => toEvaluatedClaim(claim, parsed[i]));
}

export function emitBatchJudgeDone({
  claims,
  candidates,
  crossExaminationsByClaim,
  results,
  judge,
  emit,
}: BatchJudgeDoneContext): void {
  for (let i = 0; i < claims.length; i++) {
    emit({
      step: "judge",
      status: "done",
      claim: claims[i],
      model: judge.name,
      verdict: results[i].verdict,
      confidence: results[i].confidence,
      reasoning: results[i].explanation.slice(0, 600),
      deliberation: buildBatchDeliberationSummary(claims, candidates, crossExaminationsByClaim, results),
    });
  }
}

function collectBatchCandidates(
  results: PromiseSettledResult<BatchCandidate>[],
  providers: AiProvider[],
): { candidates: BatchCandidate[]; errors: Map<string, string> } {
  const candidates: BatchCandidate[] = [];
  const errors = new Map<string, string>();
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      candidates.push(result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      console.error(`[ensemble] ${providers[i].name} failed: ${reason}`);
      errors.set(providers[i].name, reason);
    }
  }
  return { candidates, errors };
}
