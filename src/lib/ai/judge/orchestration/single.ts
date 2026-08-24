import type {
  AiTask,
  CrossExamination,
  EvaluatedClaim,
} from "../../../types";
import { buildCrossExaminationPrompt, buildJudgePrompt, type Candidate } from "../prompts";
import { parseCrossExamination, parseEvaluation } from "../parsers";
import { toEvaluatedClaim } from "../deliberation";
import type { SingleDebateContext, SingleEvaluationContext, SingleJudgeContext } from "./contexts";
import { appendThinking } from "./stream-utils";

/**
 * Single-claim evaluation helpers — the original one-claim-at-a-time path.
 * Extracted from JudgeOrchestrator for size and reuse.
 */

export async function runEvaluations(
  { claim, evidence, providers, emit }: SingleEvaluationContext,
): Promise<{ candidates: Candidate[]; errors: Map<string, string> }> {
  // Emit immediate "thinking started" events so all models show activity
  // before the first token arrives (some models take 10-30s to start).
  for (const provider of providers) {
    const initMessage = provider.name.includes("groq")
      ? "Fast 120B reasoning on Groq..."
      : provider.name.includes("ultra")
        ? "Loading 550B model — deep reasoning in progress..."
        : provider.name.includes("llama")
          ? "Evaluating claim with Llama 3.1 70B..."
          : "Initializing model...";
    emit({ step: "thinking", status: "started", claim, model: provider.name, chunk: initMessage, fullText: initMessage });
  }

  const results = await Promise.allSettled(
    providers.map(async (provider) => {
      const task: AiTask = { kind: "evaluate-claim", claim, evidence };
      let thinking = "";
      const raw = await provider.runStream(task, (chunk) => {
        thinking = appendThinking(thinking, chunk);
        emit({ step: "thinking", status: "started", claim, model: provider.name, chunk, fullText: thinking });
      });
      return { provider: provider.name, parsed: parseEvaluation(raw), raw };
    }),
  );
  const candidates: Candidate[] = [];
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

export async function crossExamine(
  { claim, candidates, emit, ensemble, judge }: SingleDebateContext,
): Promise<CrossExamination[]> {
  const examinations: CrossExamination[] = [];
  emit({ step: "cross-examine", status: "started", claim, round: 1, examinations: [] });

  // Emit immediate "thinking" events for all candidates so the UI shows
  // all models as active right away — before running them in parallel.
  for (const candidate of candidates) {
    emit({
      step: "cross-examine",
      status: "started",
      claim,
      round: 1,
      activeModel: candidate.provider,
      examinations: [...examinations, { model: candidate.provider, stance: "agree", argument: "", status: "thinking", thinking: "Preparing cross-examination..." }],
    });
  }

  // Run all cross-examinations in parallel (was sequential — slow).
  const crossResults = await Promise.allSettled(
    candidates.map(async (candidate) => {
      const provider = ensemble.find((item) => item.name === candidate.provider) ?? judge;
      let thinking = "";
      const raw = await provider.runStream(
        { kind: "raw-text", prompt: buildCrossExaminationPrompt(claim, candidate, candidates) },
        (chunk) => {
          thinking = appendThinking(thinking, chunk);
          emit({
            step: "cross-examine",
            status: "started",
            claim,
            round: 1,
            activeModel: candidate.provider,
            examinations: [
              ...examinations,
              { model: candidate.provider, stance: "agree", argument: "", status: "thinking", thinking },
            ],
          });
        },
      );
      const parsed = parseCrossExamination(raw, candidate.parsed.verdict, candidate.parsed.confidence);
      return {
        model: candidate.provider,
        stance: parsed.stance,
        respondingTo: candidates.filter((item) => item.provider !== candidate.provider).map((item) => item.provider).join(", "),
        argument: parsed.argument,
        revisedVerdict: parsed.revisedVerdict,
        revisedConfidence: parsed.revisedConfidence,
        status: "done" as const,
        thinking,
      };
    }),
  );

  for (let ci = 0; ci < crossResults.length; ci++) {
    const result = crossResults[ci];
    if (result.status === "fulfilled") {
      examinations.push(result.value);
    } else {
      const candidate = candidates[ci];
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      console.error(`[cross-examine] ${candidate.provider} failed: ${reason}`);
      examinations.push({ model: candidate.provider, stance: "agree", argument: `(cross-examination failed: ${reason})`, status: "failed" });
    }
  }

  emit({ step: "cross-examine", status: "done", claim, round: 1, examinations });
  return examinations;
}

export async function judgeAdjudicate(
  { claim, evidence, candidates, crossExaminations, emit, judge }: SingleJudgeContext,
): Promise<EvaluatedClaim> {
  const prompt = buildJudgePrompt(claim, evidence, candidates, crossExaminations);
  let thinking = "";
  let raw = "";
  try {
    raw = await judge.runStream({ kind: "raw-text", prompt }, (chunk) => {
      thinking = appendThinking(thinking, chunk);
      emit({ step: "judge", status: "started", claim, model: judge.name, thinking });
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[judge] judge.runStream failed: ${reason}`);
    // If the judge fails entirely, fall back to the first candidate's evaluation.
    const fallbackParsed = candidates[0]?.parsed ?? {
      verdict: "unverifiable" as const,
      confidence: 0,
      explanation: `Judge model unavailable: ${reason}`,
      proofs: [],
    };
    return toEvaluatedClaim(claim, fallbackParsed);
  }
  const parsed = parseEvaluation(raw);
  if (parsed.explanation === "Could not parse evaluation." && candidates.length > 0) {
    console.error(`[judge] unparsed response, falling back to first candidate`);
    return toEvaluatedClaim(claim, candidates[0].parsed);
  }
  return toEvaluatedClaim(claim, parsed);
}
