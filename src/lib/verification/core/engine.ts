import type {
  AiTask,
  CasePacket,
  EvaluatedClaim,
  ExtractedContent,
  FactCheckResult,
  LanguageMode,
  Verdict,
  ProgressCallback,
} from "../../types";
import type { AiOrchestrator, AiProvider } from "../../ai/types";
import type { JudgeOrchestrator } from "../../ai/judge/orchestration";
import type { InputAdapterRegistry } from "../../input/types";
import type { SourceAggregator } from "../../scraping/types";
import { isOnlyMetadata } from "../../input/support/content-utils";
import { buildChatPrompt, parseChatResponse, type ReverifyResult } from "../support/chat";
import { buildUnverifiableResult } from "../support/content-result";
import { extractClaims } from "../claims/service";
import { EvidenceCollector, buildSourceListWithPerspectives } from "../evidence/collector";
import { parseSynthesis } from "../support/parsers";
import { displayPreview, transcriptPreview } from "./content-presentation";

export class VerificationEngine {
  private readonly evidence: EvidenceCollector;

  constructor(
    private readonly inputs: InputAdapterRegistry,
    private readonly ai: AiOrchestrator,
    sourceAggregator: SourceAggregator,
    private readonly judge: JudgeOrchestrator,
    private readonly judgeModel: AiProvider,
    private readonly claimExtractor: AiProvider,
  ) {
    this.evidence = new EvidenceCollector(sourceAggregator);
  }

  async verify(
    rawInput: string,
    emit: ProgressCallback = () => {},
    language: LanguageMode = "en",
  ): Promise<FactCheckResult> {
    const content = await this.extractInput(rawInput, emit, language);
    if (!content.textContent && !content.mediaUrls?.length) {
      return this.finishUnverifiable(content, emit, language, "No text content or media could be extracted from the input.");
    }

    if (isOnlyMetadata(content)) {
      return this.finishUnverifiable(content, emit, language, "The extracted content contains only metadata (metrics, titles) without verifiable claims.");
    }

    const claimTexts = await this.extractContentClaims(content, emit);
    if (claimTexts.length === 0) {
      emit({ step: "extract-claims", status: "failed", model: "Nemotron 3 Super 120B", detail: "No claims could be extracted from the content." });
      return this.finishUnverifiable(content, emit, language, "Claims were extracted but none could be verified against available sources.");
    }

    // Keep every valid, distinct claim. Each claim is evaluated independently
    // to prevent conflation of dates/entities across related but distinct assertions.
    const allClaims = claimTexts;
    emit({ step: "extract-claims", status: "done", model: "Nemotron 3 Super 120B", claims: allClaims });

    for (const claim of allClaims) {
      emit({
        step: "gather-evidence",
        status: "started",
        claim,
        searchQueries: [claim.slice(0, 120)],
      });
    }

    const collected = await this.evidence.collect(allClaims);

    for (const claim of allClaims) {
      const ctx =
        collected.contexts.find(
          (c) => c.claim.trim().toLowerCase() === claim.trim().toLowerCase(),
        ) ?? collected.contexts[0];
      const claimSources = ctx ? buildSourceListWithPerspectives([ctx]) : collected.sourceList;

      emit({
        step: "gather-evidence",
        status: "done",
        claim,
        sources: claimSources.length,
        sourceList: claimSources,
        searchQueries: [claim.slice(0, 120)],
      });
    }

    // Evaluate ALL claims in one batch model call per provider. Each claim
    // keeps its own evidence context (preventing date/entity conflation)
    // but the model sees the entire case — including the transcript — in a
    // single long-running call instead of N separate per-claim calls.
    const packet: CasePacket = {
      content,
      claims: allClaims,
      contexts: collected.contexts,
    };
    const evaluatedClaims = await this.judge.evaluateClaims(packet, emit);

    emit({
      step: "synthesize",
      status: "started",
      model: "Nemotron Ultra 550B",
      detail: `Synthesizing final verdict from ${evaluatedClaims.length} independently evaluated claims`,
    });

    const synthesis = await this.synthesize(evaluatedClaims, collected.sources, language);
    emit({
      step: "synthesize",
      status: "done",
      model: "Nemotron Ultra 550B",
      verdict: synthesis.verdict,
      confidence: synthesis.confidence,
      summary: synthesis.summary?.slice(0, 300),
    });

    const result: FactCheckResult = {
      inputType: content.inputType,
      inputRaw: content.rawInput,
      inputPreview: displayPreview(content, language),
      verdict: synthesis.verdict,
      confidence: synthesis.confidence,
      summary: synthesis.summary,
      reasoning: synthesis.reasoning,
      claims: evaluatedClaims,
      sources: collected.sources,
    };
    emit({ step: "complete", status: "done", verdict: result.verdict, confidence: result.confidence });
    return result;
  }

  async reverify(
    original: FactCheckResult,
    userContext: string,
    conversationHistory: { role: "user" | "assistant"; content: string }[],
  ): Promise<ReverifyResult> {
    const prompt = buildChatPrompt(original, userContext, conversationHistory);
    const raw = await this.judgeModel.run({ kind: "raw-text", prompt });
    const parsed = parseChatResponse(raw);
    return {
      reply: parsed.reply,
      result: parsed.result
        ? {
            verdict: parsed.result.verdict,
            confidence: parsed.result.confidence,
            summary: parsed.result.summary,
            reasoning: parsed.result.reasoning,
          }
        : undefined,
    };
  }

  private async extractInput(
    rawInput: string,
    emit: ProgressCallback,
    language: LanguageMode,
  ): Promise<ExtractedContent> {
    emit({ step: "input", status: "started", detail: rawInput.slice(0, 80) });
    const adapter = this.inputs.resolve(rawInput);
    const content = await adapter.extract(rawInput, language);
    emit({
      step: "input",
      status: "done",
      detail: content.preview,
      inputType: content.inputType,
      rawInput: content.rawInput,
      preview: content.preview,
      metadata: content.metadata,
    });

    if (content.metadata?.transcriptMethod) {
      emit({
        step: "transcript",
        status: "done",
        method: content.metadata.transcriptMethod,
        detail: `Transcript extracted via ${content.metadata.transcriptMethod}`,
        preview: transcriptPreview(content, language),
      });
    } else if (!content.mediaUrls?.length) {
      emit({
        step: "transcript",
        status: "done",
        detail: "No transcript available — proceeding with post content",
      });
    }
    return content;
  }

  private async extractContentClaims(
    content: ExtractedContent,
    emit: ProgressCallback,
  ): Promise<string[]> {
    let claimContent = content;
    const hasTranscript = Boolean(content.metadata?.transcriptMethod);

    if (!hasTranscript && content.mediaUrls?.length) {
      emit({
        step: "analyze-media",
        status: "started",
        model: "Gemini 3.5 Flash",
        detail: content.mediaUrls[0].slice(0, 60),
      });
      try {
        const description = await this.ai.run({
          kind: "analyze-media",
          mediaUrl: content.mediaUrls[0],
          context: content.preview,
        });
        emit({ step: "analyze-media", status: "done", model: "Gemini 3.5 Flash" });
        emit({
          step: "transcript",
          status: "done",
          method: "gemini-media-analysis",
          detail: "Transcript extracted via Gemini media analysis",
          preview: description,
        });
        claimContent = { ...content, textContent: description };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        emit({ step: "analyze-media", status: "done", model: "Gemini 3.5 Flash", detail: "failed" });
        emit({
          step: "transcript",
          status: "done",
          detail: `Transcript extraction failed — ${message}`,
        });
        // Preserve the failure reason so the unverifiable report can show it.
        claimContent = {
          ...content,
          metadata: {
            ...content.metadata,
            mediaAnalysisError: message,
          },
        };
      }
    }

    emit({ step: "extract-claims", status: "started", model: "Nemotron 3 Super 120B" });
    let claims = claimContent.textContent
      ? await extractClaims(this.claimExtractor, claimContent)
      : [];

    if (claimContent.textContent && isOnlyMetadata(claimContent.textContent)) {
      claims = [];
    }
    return claims;
  }

  private async synthesize(
    claims: EvaluatedClaim[],
    sources: FactCheckResult["sources"],
    language: LanguageMode,
  ): Promise<{
    verdict: Verdict;
    confidence: number;
    summary: string;
    reasoning: string;
  }> {
    const task: AiTask = { kind: "synthesize-verdict", claims, sources, language };
    try {
      const raw = await this.judgeModel.run(task);
      return parseSynthesis(raw);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`[synthesize] judgeModel.run failed: ${reason}`);
      // Fall back to aggregating the evaluated claims instead of failing entirely.
      return aggregateClaimVerdicts(claims, reason);
    }
  }

  /**
   * Emit proper step events for short-circuited (unverifiable) results so the
   * UI shows a complete node progression instead of jumping from partial nodes
   * directly to the final verdict.
   */
  private finishUnverifiable(
    content: ExtractedContent,
    emit: ProgressCallback,
    language: LanguageMode,
    reason: string,
  ): FactCheckResult {
    // Mark any in-flight steps as done/failed so nodes render with final state
    emit({ step: "gather-evidence", status: "done", claim: "", sources: 0, sourceList: [], searchQueries: [] });
    emit({ step: "ensemble", status: "done", claim: "", evaluations: [] });
    emit({ step: "cross-examine", status: "done", claim: "", examinations: [] });
    emit({ step: "judge", status: "done", claim: "", verdict: "unverifiable", confidence: 0 });

    emit({
      step: "synthesize",
      status: "started",
      model: "Nemotron Ultra 550B",
      detail: "Content could not be verified — synthesizing unverifiable verdict.",
    });

    const result = buildUnverifiableResult(content, reason);

    emit({
      step: "synthesize",
      status: "done",
      model: "Nemotron Ultra 550B",
      verdict: result.verdict,
      confidence: result.confidence,
      summary: result.summary?.slice(0, 300),
    });

    emit({ step: "complete", status: "done", verdict: result.verdict, confidence: result.confidence });
    return result;
  }
}

/**
 * Aggregate evaluated claims into a synthesis fallback when the synthesis
 * model call fails. Picks the most common verdict and averages confidence.
 */
function aggregateClaimVerdicts(claims: EvaluatedClaim[], errorReason: string): {
  verdict: Verdict;
  confidence: number;
  summary: string;
  reasoning: string;
} {
  if (claims.length === 0) {
    return {
      verdict: "unverifiable",
      confidence: 0,
      summary: "No claims were evaluated.",
      reasoning: `Synthesis model failed: ${errorReason}`,
    };
  }

  const verdictCounts = new Map<Verdict, number>();
  let totalConfidence = 0;
  for (const claim of claims) {
    verdictCounts.set(claim.verdict, (verdictCounts.get(claim.verdict) ?? 0) + 1);
    totalConfidence += claim.confidence;
  }

  // Pick the most frequent verdict, breaking ties by verdict severity order.
  const severityOrder: Verdict[] = ["true", "mostly_true", "mixed", "mostly_false", "false", "unverifiable"];
  let bestVerdict: Verdict = "unverifiable";
  let bestCount = 0;
  for (const verdict of severityOrder) {
    const count = verdictCounts.get(verdict) ?? 0;
    if (count > bestCount) {
      bestCount = count;
      bestVerdict = verdict;
    }
  }

  const avgConfidence = Math.round(totalConfidence / claims.length);
  const claimLines = claims.map((c) => `- ${c.verdict} (${c.confidence}%): ${c.text.slice(0, 80)}`).join("\n");

  return {
    verdict: bestVerdict,
    confidence: avgConfidence,
    summary: `Based on ${claims.length} evaluated claims, the overall verdict is "${bestVerdict}" (avg confidence ${avgConfidence}%). Note: the synthesis model was unavailable (${errorReason.slice(0, 100)}), so this is an automated aggregate.`,
    reasoning: `Synthesis model failed: ${errorReason}\n\nAggregated claim verdicts:\n${claimLines}`,
  };
}
