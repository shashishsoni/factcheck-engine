import type { ExtractedContent, FactCheckResult } from "../../types";

export function buildUnverifiableResult(
  content: ExtractedContent,
  extractionNote: string,
): FactCheckResult {
  const reasons: string[] = [];
  const attempts: string[] = [];

  if (content.metadata?.platform) {
    attempts.push(`Platform: ${content.metadata.platform}`);
  }
  if (content.metadata?.extractionAttempts) {
    attempts.push(...content.metadata.extractionAttempts.split(" | "));
  }
  if (content.metadata?.mediaAnalysisError) {
    attempts.push(`Gemini media analysis: ${content.metadata.mediaAnalysisError}`);
  }
  if (content.metadata?.extractionMethod) {
    attempts.push(`Fallback extraction method used: ${content.metadata.extractionMethod}`);
  }

  if (!content.textContent && !content.mediaUrls?.length) {
    reasons.push(
      "No text content or media could be extracted from the submitted input. " +
      explainWhyEmpty(content),
    );
  }
  if (content.mediaUrls?.length && !content.textContent) {
    reasons.push(
      extractionNote ||
        "The input contains media but no accompanying text. Media analysis could not extract verifiable claims.",
    );
  }
  if (content.textContent && content.textContent.length < 20) {
    reasons.push(
      "The extracted text is too short to contain verifiable claims " +
      `("${content.textContent.slice(0, 50)}..."). ` +
      explainWhyEmpty(content),
    );
  }
  if (reasons.length === 0) {
    reasons.push(
      "Claims were extracted but none could be verified against available sources. " +
      "This may indicate the claims are too vague, too new, or about a topic with insufficient public information.",
    );
  }

  const summary =
    "This content could not be fact-checked. Here's why:\n\n" +
    reasons.map((reason) => `• ${reason}`).join("\n") +
    (attempts.length > 0
      ? `\n\nWhat was tried:\n${attempts.map((attempt) => `• ${attempt}`).join("\n")}`
      : "") +
    "\n\nYou can use the chat below to provide additional context, " +
    "paste the post text manually, or share a counter-argument — " +
    "the AI will re-evaluate with your input.";

  const reasoning =
    "Detailed explanation:\n" +
    `Input type: ${content.inputType}\n` +
    `Preview: ${content.preview}\n` +
    `Text content extracted: ${content.textContent ? `"${content.textContent.slice(0, 100)}"` : "none"}\n` +
    `Media URLs: ${content.mediaUrls?.length ?? 0}\n` +
    `Metadata: ${JSON.stringify(content.metadata ?? {})}\n` +
    `Extraction attempts: ${attempts.join(", ") || "none"}\n\n` +
    reasons.map((reason) => `- ${reason}`).join("\n");

  return {
    inputType: content.inputType,
    inputRaw: content.rawInput,
    inputPreview: content.preview,
    verdict: "unverifiable",
    confidence: 0,
    summary,
    reasoning,
    claims: [],
    sources: [],
  };
}

function explainWhyEmpty(content: ExtractedContent): string {
  switch (content.inputType) {
    case "social":
      return (
        `${content.metadata?.platform ?? "This platform"} blocks automated access to post content. ` +
        "The post may be private, deleted, or behind a login wall. " +
        "We tried oEmbed and direct page fetch — neither returned the actual post content. " +
        "We do NOT search for the URL on the web because that returns platform documentation " +
        "instead of the post itself. To fact-check this post, paste its transcript or text " +
        "in the chat below."
      );
    case "url":
    case "article":
      return "The URL may be behind a paywall, require JavaScript rendering, or block automated access. Try pasting the article text directly.";
    case "image":
      return "The image could not be analyzed. It may be private, expired, or in an unsupported format.";
    case "video":
      return "The video could not be analyzed. It may be private, region-locked, or from a platform that blocks automated access.";
    case "audio":
      return "The audio could not be analyzed. It may be private or in an unsupported format.";
    case "book":
      return "The book content could not be retrieved. Try pasting the specific passage you want fact-checked.";
    default:
      return "The input format could not be processed. Try providing the content in a different way.";
  }
}
