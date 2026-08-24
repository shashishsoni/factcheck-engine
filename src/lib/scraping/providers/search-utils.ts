import type { SearchHit, SourceType } from "../../types";
import type { SearchOptions } from "../types";

type Perspective = NonNullable<SearchOptions["perspective"]>;

const STOP_WORDS = new Set([
  "about", "after", "against", "also", "because", "being", "between", "could",
  "from", "have", "into", "that", "their", "there", "these", "they", "this",
  "those", "through", "under", "were", "which", "with", "would", "said", "says",
  "went", "turned", "made", "makes", "making", "according", "claimed", "claims",
  "alleged", "allegedly", "reportedly", "supposedly", "apparently",
]);

/**
 * Extract the most important search terms from a claim — proper nouns, key
 * verbs, and distinctive nouns. Falls back to the full compacted claim if
 * extraction yields too few terms.
 */
function extractKeyTerms(query: string): string[] {
  const words = query
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));
  // Prioritize capitalized words (proper nouns) and longer words.
  const properNouns = words.filter((w) => /^[A-Z]/.test(w));
  const otherTerms = words.filter((w) => !/^[A-Z]/.test(w) && w.length > 4);
  const keyTerms = [...properNouns, ...otherTerms].slice(0, 8);
  return keyTerms.length >= 2 ? keyTerms : words.slice(0, 6);
}

/**
 * Build a compact search phrase from key terms, prioritizing proper nouns.
 * Uses the full claim if it's short enough; otherwise extracts key terms.
 */
function buildSearchBase(query: string): string {
  const compact = query.replace(/\s+/g, " ").trim();
  if (compact.length <= 80) return compact;
  const keyTerms = extractKeyTerms(query);
  return keyTerms.join(" ");
}

export function buildSearchQueries(query: string, perspective?: Perspective): string[] {
  const base = buildSearchBase(query);
  if (!perspective) return [base];
  const suffixes: Record<Perspective, string[]> = {
    supporting: ["evidence", "confirmed", "verified"],
    contradicting: ["criticism", "controversy", "disputed"],
    neutral: ["news", "report", "fact check"],
  };
  return suffixes[perspective].map((suffix) => `${base} ${suffix}`);
}

export function isRelevantResult(query: string, title?: string, snippet?: string): boolean {
  const terms = extractKeyTerms(query);
  if (terms.length === 0) return true;
  const text = `${title ?? ""} ${snippet ?? ""}`.toLowerCase();
  const termLower = terms.map((t) => t.toLowerCase());
  const matches = termLower.filter((term) => text.includes(term)).length;
  // Require at least half the key terms to match, minimum 2.
  return matches >= Math.min(Math.max(2, Math.ceil(termLower.length / 2)), termLower.length);
}

export function dedupeHits(hits: SearchHit[]): SearchHit[] {
  const seen = new Set<string>();
  return hits.filter((hit) => {
    const key = normalizeUrl(hit.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeUrl(url: string): string {
  return url.split("#")[0].split("?")[0];
}

export function classifyUrl(url: string): SourceType {
  if (/gov\b|\.mil\b|who\.int|un\.org/i.test(url)) return "official";
  if (/arxiv|pubmed|doi\.org|scholar\.google|nature\.com|sciencedirect/i.test(url)) return "academic";
  if (/reuters|apnews|bbc|nytimes|guardian|aljazeera|bloomberg|wsj|news\.google/i.test(url)) return "news";
  if (/twitter|x\.com|reddit|facebook|instagram|tiktok|youtube/i.test(url)) return "social";
  return "web";
}

export function isSocialUrl(url: string): boolean {
  return /twitter\.com|x\.com|reddit\.com|facebook\.com|instagram\.com|tiktok\.com|youtube\.com|youtu\.be/i.test(url);
}

export function reliabilityFor(url: string): number {
  switch (classifyUrl(url)) {
    case "official": return 95;
    case "academic": return 90;
    case "news": return 75;
    case "social": return 35;
    default: return 55;
  }
}
