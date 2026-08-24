import type { Proof } from "../../types";
import {
  clamp,
  extractJson,
  normalizeProofKind,
} from "../../verification/support/parsers";
import { optionalText } from "../shared/text-utils";

export type RecordValue = Record<string, unknown>;

export const VERDICT_TOKEN = "(?:mostly[ _-]+true|mostly[ _-]+false|unverifiable|mixed|true|false)";

export function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(extractJson(raw)) as unknown;
  } catch {
    return null;
  }
}

export function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clampConfidence(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return clamp(value);
  if (typeof value === "string") {
    const number = Number(value.match(/\d+(?:\.\d+)?/)?.[0]);
    if (Number.isFinite(number)) return clamp(number);
  }
  return 0;
}

export function capUnverifiableConfidence(verdict: string, confidence: number): number {
  return verdict === "unverifiable" ? Math.min(confidence, 20) : confidence;
}

export function parseProofs(value: unknown): Proof[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .filter((proof) => typeof proof.sourceUrl === "string" && typeof proof.excerpt === "string")
    .map((proof) => ({
      kind: normalizeProofKind(optionalText(proof.kind)),
      sourceUrl: proof.sourceUrl as string,
      sourceTitle: optionalText(proof.sourceTitle),
      excerpt: proof.excerpt as string,
      note: optionalText(proof.note),
    }));
}

export function cleanModelText(raw: string): string {
  return raw
    .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, "")
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
}

export function extractLabeledConfidence(text: string): number | undefined {
  const match = text.match(/\b(?:revised\s+)?(?:confidence|certainty)\s*[:\-]?\s*(\d{1,3})(?:\s*%)?/i);
  return match ? clampConfidence(match[1]) : undefined;
}

export function extractLabeledText(text: string, labels: string[]): string | undefined {
  const pattern = labels.join("|");
  return text.match(new RegExp(`(?:^|\\n)\\s*(?:${pattern})\\s*[:\\-]\\s*([\\s\\S]*)`, "i"))?.[1]?.trim();
}

export function normalizeStance(value: unknown): "agree" | "disagree" | "partial" {
  const stance = optionalText(value)?.toLowerCase();
  return stance === "disagree" ? "disagree" : stance === "partial" ? "partial" : "agree";
}
