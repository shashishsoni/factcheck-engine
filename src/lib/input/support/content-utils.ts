/** Shared content guards used by input extraction and verification. */
export function isOnlyMetadata(input: string | { textContent?: string; preview?: string } | null | undefined): boolean {
  if (!input) return true;
  const text = typeof input === "string" ? input : input.textContent || input.preview || "";
  if (typeof text !== "string" || text.trim().length === 0) return true;

  const stripped = text.replace(/[\s·•|]+/g, " ").trim();
  if (stripped.length < 5) return true;

  const withoutMetrics = stripped
    .replace(
      /\d+[\d,]*\s*(lakh|crore|thousand|million|billion|k|m)?\s*(views?|reactions?|likes?|shares?|comments?|downloads?|followers?|subscribers?|people)?/gi,
      "",
    )
    .replace(
      /\b(views?|reactions?|likes?|shares?|comments?|downloads?|followers?|subscribers?)\b/gi,
      "",
    )
    .replace(/[\d,.]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return withoutMetrics.length < 10;
}
