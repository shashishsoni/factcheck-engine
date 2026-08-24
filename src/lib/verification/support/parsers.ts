import type { Proof, Verdict } from "../../types";

export interface ParsedSynthesis {
  verdict: Verdict;
  confidence: number;
  summary: string;
  reasoning: string;
}

export function extractJson(raw: string): string {
  // Strip  thinking tags that some NIM models emit in the content field.
  const stripped = raw.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, "").trim();
  const fenced = stripped.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : stripped;
  const starts = [...candidate.matchAll(/[\[{]/g)].map((match) => match.index ?? -1).filter((index) => index >= 0);

  // Collect all valid JSON fragments with their span (start/end indices).
  const found: { json: string; isArray: boolean; start: number; end: number }[] = [];
  for (const start of starts) {
    const end = findBalancedJsonEnd(candidate, start);
    if (end === -1) continue;
    const possibleJson = candidate.slice(start, end + 1);
    try {
      JSON.parse(possibleJson);
      found.push({ json: possibleJson, isArray: possibleJson[0] === "[", start, end });
    } catch {
      // Try the next object or array. Reasoning text can contain JSON-like fragments.
    }
  }
  const topLevel = found.filter((frag) =>
    !found.some((other) => other !== frag && other.start <= frag.start && other.end >= frag.end),
  );

  const candidates = topLevel.length > 0 ? topLevel : found;

  if (candidates.length > 0) {
    // Prefer the first array (batch evaluations return arrays). Fall back to first object.
    const firstArray = candidates.find((item) => item.isArray);
    return (firstArray ?? candidates[0]).json;
  }

  return candidate.trim();
}

function findBalancedJsonEnd(value: string, start: number): number {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = start; i < value.length; i++) {
    const character = value[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === "{" || character === "[") {
      stack.push(character);
      continue;
    }
    if (character !== "}" && character !== "]") continue;

    const expectedOpen = character === "}" ? "{" : "[";
    if (stack.at(-1) !== expectedOpen) return -1;
    stack.pop();
    if (stack.length === 0) return i;
  }

  return -1;
}

export function normalizeVerdict(value?: string): Verdict {
  const valid: Verdict[] = [
    "true",
    "mostly_true",
    "mixed",
    "mostly_false",
    "false",
    "unverifiable",
  ];
  const normalized = (value ?? "").toLowerCase().replace(/[\s-]/g, "_") as Verdict;
  return valid.includes(normalized) ? normalized : "unverifiable";
}

export function normalizeProofKind(value?: string): Proof["kind"] {
  return value?.toLowerCase() === "supports"
    ? "supports"
    : value?.toLowerCase() === "contradicts"
      ? "contradicts"
      : "contextual";
}

export function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function parseSynthesis(raw: string): ParsedSynthesis {
  try {
    const parsed = JSON.parse(extractJson(raw)) as {
      verdict?: string;
      confidence?: number;
      summary?: string;
      reasoning?: string;
    };
    const verdict = normalizeVerdict(parsed.verdict);
    return {
      verdict,
      confidence: verdict === "unverifiable" ? Math.min(clamp(parsed.confidence ?? 0), 20) : clamp(parsed.confidence ?? 0),
      summary: parsed.summary ?? "",
      reasoning: parsed.reasoning ?? "",
    };
  } catch {
    return {
      verdict: "unverifiable",
      confidence: 0,
      summary: raw.slice(0, 500),
      reasoning: "Could not parse synthesis.",
    };
  }
}
