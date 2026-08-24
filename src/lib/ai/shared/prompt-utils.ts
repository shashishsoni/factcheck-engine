import type { SearchHit } from "../../types";

export function currentDateLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format evidence for prompts; batch prompts can include URLs for citations.
 */
export function formatEvidence(sources: SearchHit[], includeUrls = false): string[] {
  return sources.map((source) => {
    const label = `- [${source.publishedDate ?? "no date"}] [${source.title ?? source.url}]`;
    return includeUrls
      ? `${label} ${source.url} — ${source.snippet ?? ""}`
      : `${label} ${source.snippet ?? ""}`;
  });
}
