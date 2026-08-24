import type { Verdict } from "../../types";
import type { ParsedEvaluation } from "./parsers";
import {
  capUnverifiableConfidence,
  cleanModelText,
  clampConfidence,
  extractLabeledConfidence,
  extractLabeledText,
  VERDICT_TOKEN,
} from "./parser-utils";
import { normalizeVerdict } from "../../verification/support/parsers";

export interface ParsedCrossExamination {
  stance: "agree" | "disagree" | "partial";
  argument: string;
  revisedVerdict: Verdict;
  revisedConfidence: number;
}

export function parseProseEvaluation(raw: string): ParsedEvaluation {
  const text = cleanModelText(raw);
  if (!text) return { verdict: "unverifiable", confidence: 0, explanation: "Could not parse evaluation.", proofs: [] };

  const verdict = extractProseVerdict(text);
  return {
    verdict,
    confidence: capUnverifiableConfidence(verdict, extractProseConfidence(text)),
    explanation: extractProseExplanation(text),
    proofs: [],
  };
}

export function parseProseCrossExamination(
  raw: string,
  originalVerdict: Verdict,
  originalConfidence: number,
): ParsedCrossExamination {
  const text = cleanModelText(raw);
  const lower = text.toLowerCase();
  const stance = /\bdisagree(?:s|d)?\b/.test(lower)
    ? "disagree"
    : /\bpartial(?:ly)?\b/.test(lower)
      ? "partial"
      : "agree";
  const revisedText = text.match(new RegExp(`(?:revised\\s+)?verdict\\s*[:\\-]\\s*(${VERDICT_TOKEN}|same)\\b`, "i"))?.[1]?.trim();

  return {
    stance,
    argument: extractLabeledText(text, ["argument", "response", "reasoning"]) ?? text.slice(0, 1000),
    revisedVerdict: revisedText && revisedText.toLowerCase() !== "same"
      ? normalizeVerdict(revisedText)
      : originalVerdict,
    revisedConfidence: extractLabeledConfidence(text) ?? originalConfidence,
  };
}

export function splitClaimSections(raw: string): { claimNumber: number; text: string }[] {
  const markers = [...raw.matchAll(/(?:^|\n)\s*(?:\*\*)?claim\s*#?\s*(\d+)\s*(?:[:.)-]|\*\*)/gim)];
  return markers.map((marker, index) => {
    const markerStart = marker.index ?? 0;
    const bodyStart = markerStart + marker[0].length;
    return {
      claimNumber: Number(marker[1]),
      text: raw.slice(bodyStart, markers[index + 1]?.index ?? raw.length).trim(),
    };
  });
}

function extractProseVerdict(text: string): Verdict {
  const labeled = text.match(new RegExp(`\\b(?:final\\s+)?verdict\\s*[:\\-]\\s*(${VERDICT_TOKEN})\\b`, "i"))?.[1];
  const firstLine = text.match(new RegExp(`^\\s*(?:\\*\\*)?(${VERDICT_TOKEN})\\b`, "im"))?.[1];
  const inline = labeled ?? firstLine ?? text.match(new RegExp(`\\b(${VERDICT_TOKEN})\\b`, "i"))?.[1];
  return normalizeVerdict(inline);
}

function extractProseConfidence(text: string): number {
  return extractLabeledConfidence(text) ?? clampConfidence(text.match(/\b(\d{1,3})\s*%/)?.[1]);
}

function extractProseExplanation(text: string): string {
  const labeled = extractLabeledText(text, ["explanation", "reasoning", "analysis", "details"]);
  if (labeled) return labeled;
  return text
    .replace(/^\s*(?:\*\*)?(?:true|mostly[ _-]+true|mixed|mostly[ _-]+false|false|unverifiable)(?:\*\*)?\s*/i, "")
    .replace(/^\s*(?:confidence|certainty)\s*[:\-]?\s*\d{1,3}%?\s*/i, "")
    .trim();
}
