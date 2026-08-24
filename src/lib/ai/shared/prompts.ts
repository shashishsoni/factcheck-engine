import type { EvidenceContext, ExtractedContent, LanguageMode, Source } from "../../types";
import { currentDateLabel, formatEvidence } from "./prompt-utils";

/**
 * Shared prompt builders used by every text-capable provider (NIM, Groq,
 * Gemini). Keeping these in one place prevents the per-provider copies from
 * drifting — a previous regression saw NIM and Groq using stricter prompt
 * wording than Gemini, producing inconsistent verdicts.
 */

export function extractClaimsPrompt(content: ExtractedContent): string {
  return [
    "You are a fact-checking analyst. Extract every distinct, complete, verifiable claim from the content below.",
    "A claim is a statement presented as fact by the speaker or author: statistics, quotes, dates, identities, or cause-and-effect.",
    "",
    "Exclude platform metadata such as views, reactions, likes, shares, comments, upload dates, duration, channel names, navigation, ads, and recommendations.",
    "Focus only on what the person actually said or claimed. Each item must be a complete sentence, not a fragment.",
    "Write every extracted claim in English, even when the source transcript is in another language. Preserve names and factual meaning.",
    "Return only a JSON array of strings.",
    "",
    `Preview: ${content.preview}`,
    content.textContent ? `Content:\n${content.textContent.slice(0, 15_000)}` : "",
  ].filter(Boolean).join("\n");
}

export function evaluateClaimPrompt(evidence: EvidenceContext): string {
  const totalSources = evidence.supporting.length + evidence.contradicting.length + evidence.contextual.length;
  return [
    "You are an unbiased fact-checker. Evaluate this claim against the supplied evidence.",
    "Be neutral and weigh source reliability. Use the live sources below as your primary knowledge, not model memory.",
    "",
    `TODAY'S DATE: ${currentDateLabel()}`,
    `We collected ${totalSources} live web sources. Sources newer than your training cutoff are valid; do not mark a claim false because you do not recognize an event.`,
    "Only mark unverifiable when credible evidence is absent. Only mark false when credible evidence explicitly contradicts the claim.",
    "Write the evaluation, explanation, and proof excerpts in English. Keep verdict enum values in English.",
    "",
    "Return only valid JSON:",
    '{"verdict":"true|mostly_true|mixed|mostly_false|false|unverifiable","confidence":0-100,"explanation":"...","proofs":[{"kind":"supports|contradicts|contextual","sourceUrl":"...","sourceTitle":"...","excerpt":"..."}]}',
    "",
    `Claim: ${evidence.claim}`,
    "",
    `=== SUPPORTING EVIDENCE (${evidence.supporting.length}) ===`,
    ...formatEvidence(evidence.supporting),
    `=== CONTRADICTING EVIDENCE (${evidence.contradicting.length}) ===`,
    ...formatEvidence(evidence.contradicting),
    `=== CONTEXTUAL EVIDENCE (${evidence.contextual.length}) ===`,
    ...formatEvidence(evidence.contextual),
  ].join("\n");
}

export function synthesizePrompt(
  claims: { text: string; verdict: string; confidence: number; explanation: string }[],
  sources: Source[],
  language: LanguageMode = "en",
): string {
  return [
    "You are the presiding judge of a fact-checking tribunal. Deliver a clear final ruling.",
    `TODAY'S DATE: ${currentDateLabel()}`,
    "All evidence was gathered live from the web today. Do not dismiss newer sources because of your training cutoff.",
    "",
    "SUMMARY: 2-3 plain-language sentences starting with the bottom line.",
    "REASONING: Cover THE CHARGES, THE EVIDENCE, THE ANALYSIS, THE RULING, and CAVEATS.",
    language === "hi"
      ? "STRICT OUTPUT LANGUAGE: Write ONLY the summary and reasoning in Hindi using Devanagari. Do not write either field in English. Keep JSON keys and verdict enum values in English."
      : "STRICT OUTPUT LANGUAGE: Write the summary and reasoning in English. Keep JSON keys and verdict enum values in English.",
    "Return only valid JSON:",
    '{"verdict":"true|mostly_true|mixed|mostly_false|false|unverifiable","confidence":0-100,"summary":"...","reasoning":"..."}',
    "",
    "=== CLAIMS UNDER REVIEW ===",
    ...claims.map((claim, index) => `Claim ${index + 1}: ${claim.text}\nVerdict: ${claim.verdict} (${claim.confidence}%)\nAnalysis: ${claim.explanation}`),
    "",
    `Sources consulted: ${sources.length}`,
    ...sources.slice(0, 20).map((source) => `- ${source.url}`),
  ].join("\n");
}
