import { translateToEnglish } from "./translation";

export interface TranscriptResult {
  /** English text used for claim extraction and evidence search. */
  text: string;
  /** The transcript as it was returned by the source, for display. */
  originalText?: string;
  method: string;
  /** Detected/source language, not the requested UI language. */
  language?: string;
}

/**
 * Keep the source transcript intact while normalizing the analysis copy to
 * English. Translation is best-effort: an unavailable translation provider
 * must not make an otherwise usable transcript disappear.
 */
export async function buildTranscriptResult(
  rawText: string,
  method: string,
  sourceLanguage = "auto",
): Promise<TranscriptResult | undefined> {
  const originalText = rawText.replace(/\s+/g, " ").trim();
  if (originalText.length < 20) return;

  const normalizedLanguage = sourceLanguage.trim() || "auto";
  const text = isEnglish(normalizedLanguage, originalText)
    ? originalText
    : (await translateToEnglish(originalText)) ?? originalText;

  return {
    text: text.slice(0, 10_000),
    originalText: originalText.slice(0, 10_000),
    method,
    language: normalizedLanguage,
  };
}

function isEnglish(language: string, text: string): boolean {
  const normalized = language.toLowerCase().replace(/_/g, "-");
  if (normalized === "en" || normalized.startsWith("en-") || normalized === "english") {
    return true;
  }
  if (normalized !== "auto" && normalized !== "unknown") return false;

  // Providers sometimes report only "auto". Detect the scripts most likely
  // to require translation without treating Latin punctuation as evidence.
  return !/[\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u3040-\u30FF\u3400-\u9FFF]/.test(text);
}
