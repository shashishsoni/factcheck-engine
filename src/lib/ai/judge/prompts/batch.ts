import type { CasePacket, CrossExamination, EvidenceContext } from "../../../types";
import type { BatchCandidate } from "./index";
import { currentDateLabel, formatEvidence } from "../../shared/prompt-utils";

function countSources(evidence: EvidenceContext): number {
  return evidence.supporting.length + evidence.contradicting.length + evidence.contextual.length;
}

/**
 * Build the ensemble evaluation prompt for the entire case. Every claim is
 * listed with its own supporting/contradicting/contextual evidence block,
 * plus the original transcript/content so the model sees what the person
 * actually said. The model returns a JSON array with one verdict per claim.
 */
export function buildBatchEnsemblePrompt(packet: CasePacket): string {
  const { content, claims, contexts } = packet;
  const totalSources = contexts.reduce((sum, ctx) => sum + countSources(ctx), 0);
  const transcript = content.originalTextContent ?? content.textContent ?? "";

  const claimBlocks = claims.map((claim, index) => {
    const ctx = contexts[index];
    if (!ctx) return "";
    return [
      `--- CLAIM ${index + 1} ---`,
      `Statement: ${claim}`,
      "",
      `Supporting evidence (${ctx.supporting.length} sources):`,
      ...formatEvidence(ctx.supporting, true),
      "",
      `Contradicting evidence (${ctx.contradicting.length} sources):`,
      ...formatEvidence(ctx.contradicting, true),
      "",
      `Contextual evidence (${ctx.contextual.length} sources):`,
      ...formatEvidence(ctx.contextual, true),
    ].join("\n");
  });

  return [
    "You are an unbiased, honest fact-checker. Your job is to find the TRUTH — not to confirm or deny.",
    "Be strictly neutral. Do not favor any political, commercial, or ideological side. Weigh source reliability.",
    "",
    "HONESTY DIRECTIVE — READ CAREFULLY:",
    "- You MUST be truthful. Do NOT lie. Do NOT fabricate evidence. Do NOT invent sources.",
    "- If the evidence supports a claim, say so. If it contradicts, say so. If it's absent, say unverifiable.",
    "- Do NOT guess. Do NOT fill gaps with assumptions. If you don't know, say unverifiable.",
    "- Do NOT be biased toward 'true' or 'false' — follow the evidence wherever it leads.",
    "- Your reputation depends on accuracy. A wrong verdict is worse than an honest 'unverifiable'.",
    "",
    `TODAY'S DATE: ${currentDateLabel()}`,
    `We collected ${totalSources} live web sources across ${claims.length} claims. These are your primary knowledge base.`,
    "Do NOT rely on training data — it may be months or years out of date.",
    "Sources newer than your training cutoff are valid live evidence. Do not mark a claim false because you do not recognize the event.",
    "",
    "CRITICAL RULES — CLAIM SEPARATION:",
    `- There are ${claims.length} claims. Evaluate EACH claim independently against ITS OWN evidence block.`,
    "- Do NOT cross-apply evidence, dates, or entities from one claim to another.",
    "- Each claim has its own supporting, contradicting, and contextual evidence, clearly separated above.",
    "- The transcript above shows what the person ACTUALLY SAID. Use it to understand each claim's context.",
    "- But do NOT use the transcript as evidence of truth — it's what's being fact-checked, not proof.",
    "",
    "EVALUATION RULES:",
    "- If 3+ credible news outlets confirm a claim, rate it TRUE with high confidence (85%+).",
    "- If sources conflict, weigh by reliability: official > academic > news > web.",
    "- Cite specific sources and their URLs in your proofs. Never fabricate URLs.",
    "- Only rate 'unverifiable' if ZERO credible evidence is provided for that claim.",
    "- Only rate 'false' if credible sources explicitly contradict that specific claim.",
    "- Write the evaluation, explanation, and proof excerpts in English. Keep verdict enum values in English.",
    "",
    "=== ORIGINAL CONTENT / TRANSCRIPT ===",
    transcript.slice(0, 15_000) || "(no transcript available)",
    "",
    `=== CLAIMS UNDER EVALUATION (${claims.length} claims) ===`,
    "",
    ...claimBlocks,
    "",
    "Now evaluate EACH claim using ONLY the evidence in its own block. Be honest. Be accurate. Be truthful.",
    "Return ONLY a valid JSON ARRAY with one object per claim, IN THE SAME ORDER as the claims above:",
    "[",
    '  {"claimIndex":0,"verdict":"true|mostly_true|mixed|mostly_false|false|unverifiable","confidence":0-100,"explanation":"...","proofs":[{"kind":"supports|contradicts|contextual","sourceUrl":"...","sourceTitle":"...","excerpt":"..."}]},',
    '  {"claimIndex":1,"verdict":"...","confidence":...,"explanation":"...","proofs":[...]}',
    "]",
  ].join("\n");
}

/**
 * Build the cross-examination prompt for one candidate reviewing all claims.
 * The candidate sees its own initial evaluations and the other models'
 * evaluations for every claim, then responds with a stance per claim.
 */
export function buildBatchCrossExaminationPrompt(
  packet: CasePacket,
  candidate: BatchCandidate,
  candidates: BatchCandidate[],
): string {
  const { claims } = packet;
  const others = candidates.filter((item) => item.provider !== candidate.provider);

  const ownSummaries = candidate.parsed
    .map((parsed, index) => {
      const claim = claims[index] ?? `(claim ${index + 1})`;
      return `  Claim ${index + 1}: ${parsed.verdict} (${parsed.confidence}%) — ${parsed.explanation.slice(0, 200)}\n     Statement: ${claim}`;
    })
    .join("\n");

  const otherSummaries = others
    .map((other) => {
      const lines = other.parsed
        .map((parsed, index) => `  Claim ${index + 1}: ${parsed.verdict} (${parsed.confidence}%) — ${parsed.explanation.slice(0, 120)}`)
        .join("\n");
      return `[${other.provider}]\n${lines}`;
    })
    .join("\n\n");

  return [
    "You are one of several AI models evaluating the same set of claims.",
    "You have just given your initial evaluations for ALL claims. Review the other models' evaluations and respond for EACH claim.",
    "",
    "HONESTY DIRECTIVE:",
    "- Be truthful. Do NOT lie. Do NOT change your verdict just to agree with the majority.",
    "- If another model has better evidence, revise your verdict honestly. If your verdict was correct, defend it.",
    "- Do NOT be stubborn. Do NOT be a pushover. Follow the EVIDENCE, not the crowd.",
    "- If you and another model both have the same evidence, you should reach the same verdict.",
    "- If you have different evidence, explain WHY your verdict differs.",
    "",
    `TODAY'S DATE: ${currentDateLabel()}`,
    "The evidence was gathered live from the web today. Use the provided sources as your primary knowledge, not training data.",
    "Sources dated after your training cutoff are not suspicious; they are newer live evidence.",
    "",
    "Your initial evaluations:",
    ownSummaries,
    "",
    "Other models' evaluations:",
    otherSummaries || "(none)",
    "",
    `For EACH of the ${claims.length} claims, agree, disagree, or partially agree.`,
    "Explain disagreements and revise your verdict when another model has better evidence.",
    "Do NOT cross-apply reasoning from one claim to another — respond independently for each claim.",
    "Be honest. Be accurate. Admit when you were wrong. Defend when you were right.",
    "",
    "Return ONLY a valid JSON ARRAY with one object per claim, IN THE SAME ORDER:",
    "[",
    '  {"claimIndex":0,"stance":"agree|disagree|partial","argument":"...","revisedVerdict":"same|true|mostly_true|mixed|mostly_false|false|unverifiable","revisedConfidence":0-100},',
    '  {"claimIndex":1,"stance":"...","argument":"...","revisedVerdict":"...","revisedConfidence":...}',
    "]",
  ].join("\n");
}

/**
 * Build the judge prompt for the entire case. The judge sees every claim with
 * all candidates' evaluations, cross-examination results, and evidence, then
 * delivers a final verdict per claim in one call.
 */
export function buildBatchJudgePrompt(
  packet: CasePacket,
  candidates: BatchCandidate[],
  crossExaminationsByClaim: CrossExamination[][],
): string {
  const { claims, contexts } = packet;

  const claimBlocks = claims.map((claim, index) => {
    const evidence = contexts[index];
    const evaluations = candidates
      .map((candidate) => {
        const parsed = candidate.parsed[index];
        return parsed
          ? `  ${candidate.provider}: ${parsed.verdict} (${parsed.confidence}%)\n     ${parsed.explanation.slice(0, 300)}\n     Proofs: ${parsed.proofs.length}`
          : `  ${candidate.provider}: (no evaluation)`;
      })
      .join("\n");

    const crosses = (crossExaminationsByClaim[index] ?? [])
      .map((cross) => `  ${cross.model} — ${cross.stance.toUpperCase()}: ${cross.argument.slice(0, 200)}\n     Revised: ${cross.revisedVerdict ?? "unchanged"} (${cross.revisedConfidence ?? "unchanged"}%)`)
      .join("\n");

    return [
      `--- CLAIM ${index + 1} ---`,
      `Statement: ${claim}`,
      "",
      "Independent evaluations:",
      evaluations,
      "",
      "Cross-examination:",
      crosses || "  (none)",
      "",
      `Supporting evidence (${evidence?.supporting.length ?? 0}):`,
      ...(evidence ? formatEvidence(evidence.supporting, true) : []),
      "",
      `Contradicting evidence (${evidence?.contradicting.length ?? 0}):`,
      ...(evidence ? formatEvidence(evidence.contradicting, true) : []),
      "",
      `Contextual evidence (${evidence?.contextual.length ?? 0}):`,
      ...(evidence ? formatEvidence(evidence.contextual, true) : []),
    ].join("\n");
  });

  const totalSources = contexts.reduce((sum, ctx) => sum + countSources(ctx), 0);

  return [
    "You are the final judge in a fact-checking tribunal.",
    "Review the independent evaluations, cross-examination, and original live evidence for ALL claims.",
    "Produce the most accurate strict verdict for EACH claim.",
    "",
    "JUDGE'S HONESTY OATH — READ CAREFULLY:",
    "- You MUST be truthful. You MUST NOT lie. You MUST NOT fabricate evidence or sources.",
    "- Your verdict must be based SOLELY on the evidence provided below — not on what models said, not on training data.",
    "- If all models agree but the evidence says otherwise, follow the EVIDENCE, not the models.",
    "- If one model found evidence others missed, weigh that evidence on its merits, not by popularity.",
    "- If no credible evidence supports OR contradicts a claim, verdict is 'unverifiable'. Do NOT guess.",
    "- A wrong verdict harms real people. An honest 'unverifiable' is always better than a confident lie.",
    "- You are the last line of defense against misinformation. Be rigorous. Be honest. Be truthful.",
    "",
    `TODAY'S DATE: ${currentDateLabel()}`,
    `We collected ${totalSources} live web sources. They are your primary knowledge base; do not substitute model memory for the evidence below.`,
    "Sources newer than your training cutoff are valid live evidence.",
    "Weigh official and academic sources above reputable news, and reputable news above general web sources.",
    "Cite specific supplied sources in proofs. Never fabricate sources. Never fabricate URLs.",
    "",
    "CRITICAL: Evaluate EACH claim independently. Do NOT cross-apply evidence or dates from one claim to another.",
    "Each claim above has its own evidence block. Use ONLY that claim's evidence for that claim's verdict.",
    "",
    `=== CLAIMS UNDER JUDGMENT (${claims.length} claims) ===`,
    "",
    ...claimBlocks,
    "",
    "Now deliver your final verdict for EACH claim. Be honest. Be accurate. Be truthful. Do NOT lie.",
    "Return ONLY a valid JSON ARRAY with one final verdict per claim, IN THE SAME ORDER:",
    "[",
    '  {"claimIndex":0,"verdict":"true|mostly_true|mixed|mostly_false|false|unverifiable","confidence":0-100,"explanation":"...","proofs":[{"kind":"supports|contradicts|contextual","sourceUrl":"...","sourceTitle":"...","excerpt":"..."}]},',
    '  {"claimIndex":1,"verdict":"...","confidence":...,"explanation":"...","proofs":[...]}',
    "]",
  ].join("\n");
}
