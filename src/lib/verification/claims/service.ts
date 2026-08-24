import type { AiProvider } from "../../ai/types";
import type { AiTask, ExtractedContent } from "../../types";
import { extractJson } from "../support/parsers";

export async function extractClaims(
  extractor: AiProvider,
  content: ExtractedContent,
): Promise<string[]> {
  const raw = await extractor.run({ kind: "extract-claims", content });
  return selectValidClaims(parseClaimArray(raw));
}

export function selectValidClaims(claims: string[]): string[] {
  const seen = new Set<string>();
  return claims
    .map((claim) => claim.replace(/\s+/g, " ").trim())
    .filter((claim) => claim.length > 10)
    .filter((claim) => !isMetadataClaim(claim))
    .filter((claim) => !isFragment(claim))
    .filter((claim) => {
      const key = claim.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export async function consolidateClaims(
  ai: AiProvider,
  claims: string[],
): Promise<string> {
  if (claims.length <= 1) return claims[0] ?? "";

  const prompt = [
    "You are a fact-checking analyst. These claims came from one piece of content.",
    "Rewrite them as ONE complete, coherent factual assertion for verification.",
    "Preserve every factual assertion. Do not add facts, omit claims, or use a list.",
    "Return only one complete paragraph, with no JSON or commentary.",
    "",
    ...claims.map((claim, index) => `${index + 1}. ${claim}`),
  ].join("\n");

  const task: AiTask = { kind: "raw-text", prompt };
  try {
    const result = await ai.run(task);
    return result.trim() || claims.join(" ");
  } catch {
    return claims.join(" ");
  }
}

function parseClaimArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(extractJson(raw)) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((claim): claim is string => typeof claim === "string");
    }
  } catch {
    // Use the line-based fallback below.
  }

  return raw
    .split("\n")
    .map((line) => line.replace(/^[-*\d.\]\s]+/, "").trim())
    .filter((line) => line.length > 10 && !line.startsWith("{") && !line.startsWith("["));
}

function isMetadataClaim(claim: string): boolean {
  return [
    /\b\d+[\d,]*\s*(lakh|crore|thousand|million|billion)?\s*(views?|reactions?|likes?|shares?|comments?|downloads?|followers?|subscribers?)\b/i,
    /\b(views?|reactions?|likes?|shares?|comments?|downloads?)\s*(accumulated|reached|totaling|total)\b/i,
    /\b\d+[kKmM]?\s*(views?|reactions?|likes?)\b/i,
    /\bengagement\s+metric/i,
    /\bvideo\s+has\s+(accumulated|gotten|received)\b/i,
  ].some((pattern) => pattern.test(claim));
}

function isFragment(claim: string): boolean {
  return /\b(and|or|but|because|that|which|of|to|the|a|an)$/i.test(claim);
}

