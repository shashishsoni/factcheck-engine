import type { ExtractedContent, LanguageMode } from "../../types";

export function transcriptPreview(content: ExtractedContent, language: LanguageMode): string | undefined {
  return language === "hi"
    ? content.originalTextContent ?? content.textContent
    : content.textContent;
}

export function displayPreview(content: ExtractedContent, language: LanguageMode): string | undefined {
  return language === "hi"
    ? content.originalTextContent ?? content.preview
    : content.preview;
}
