import type { FactCheckResult, Verdict } from "../../types";
import { clamp, extractJson, normalizeVerdict } from "./parsers";

export interface ReverifyResult {
  reply: string;
  result?: {
    verdict: Verdict;
    confidence: number;
    summary: string;
    reasoning?: string;
  };
}

export function buildChatPrompt(
  original: FactCheckResult,
  userContext: string,
  history: { role: "user" | "assistant"; content: string }[],
): string {
  const claimsText = original.claims.length > 0
    ? original.claims
        .map((claim, index) => `  ${index + 1}. [${claim.verdict} ${claim.confidence}%] ${claim.text}\n     ${claim.explanation ?? ""}`)
        .join("\n")
    : "  (No claims were extracted from the original input.)";
  const sourcesText = original.sources.length > 0
    ? original.sources
        .slice(0, 10)
        .map((source) => `  - ${source.title ?? source.url} [${source.sourceType}, ${source.reliability}%]`)
        .join("\n")
    : "  (No sources were found.)";
  const historyText = history.length > 0
    ? "\n=== CONVERSATION SO FAR ===\n" +
      history.slice(-6).map((message) => `${message.role === "user" ? "USER" : "ASSISTANT"}: ${message.content}`).join("\n")
    : "";

  return [
    "You are the FactChecker AI assistant. A user submitted content for fact-checking, and you are now in a conversation with them about the result.",
    "",
    "Your role:",
    "- Answer questions about the verdict honestly and transparently.",
    "- Re-evaluate claims when the user provides a counter-argument or new context.",
    "- If the user pastes actual content, extract and evaluate claims from it.",
    "- Be neutral, evidence-based, and never claim certainty you do not have.",
    "",
    "=== ORIGINAL FACT-CHECK RESULT ===",
    `Input type: ${original.inputType}`,
    `Input: ${original.inputPreview ?? original.inputRaw}`,
    `Verdict: ${original.verdict} (${original.confidence}% confidence)`,
    `Summary: ${original.summary ?? "(none)"}`,
    "",
    "Claims:",
    claimsText,
    "",
    "Sources consulted:",
    sourcesText,
    historyText,
    "",
    "=== USER'S NEW MESSAGE ===",
    userContext,
    "",
    "Respond only with valid JSON:",
    '{"reply":"Your detailed and honest response.","updatedVerdict":"true|mostly_true|mixed|mostly_false|false|unverifiable|null","updatedConfidence":0-100|null,"updatedSummary":"New summary or null"}',
    "Use null for updated fields when the user's message does not change the verdict.",
  ].join("\n");
}

export function parseChatResponse(raw: string): ReverifyResult {
  try {
    const parsed = JSON.parse(extractJson(raw)) as {
      reply?: string;
      updatedVerdict?: string | null;
      updatedConfidence?: number | null;
      updatedSummary?: string | null;
    };
    if (parsed.updatedVerdict && parsed.updatedVerdict !== "null" && parsed.updatedConfidence != null) {
      return {
        reply: parsed.reply ?? raw.slice(0, 1000),
        result: {
          verdict: normalizeVerdict(parsed.updatedVerdict),
          confidence: clamp(parsed.updatedConfidence),
          summary: parsed.updatedSummary ?? "",
        },
      };
    }
    return { reply: parsed.reply ?? raw.slice(0, 1000) };
  } catch {
    return { reply: raw.slice(0, 2000) };
  }
}
