import type { SearchHit } from "../types";
import { classifyUrl, dedupeHits, reliabilityFor } from "./providers/search-utils";
import type { SourceAdapter, SearchOptions } from "./types";

/**
 * Tavily adapter — purpose-built AI search + extraction API.
 * Follows Tavily best practices: search_depth=advanced, chunks_per_source=3.
 *
 * Search:  POST https://api.tavily.com/search
 * Extract: POST https://api.tavily.com/extract
 *
 * Requires TAVILY_API_KEY. Free tier: 1,000 credits/month.
 */
export function createTavilyAdapter(): SourceAdapter {
  const apiKey = process.env.TAVILY_API_KEY ?? "";
  const base = "https://api.tavily.com";

  return {
    name: "tavily",
    isAvailable: () => Boolean(apiKey),
    async search(query, opts?: SearchOptions): Promise<SearchHit[]> {
      if (!apiKey) return [];
      const maxResults = opts?.maxResults ?? 8;
      const perspective =
        opts?.perspective === "contradicting"
          ? ["debunked false refute", "myth hoax", "fact check"]
          : opts?.perspective === "supporting"
            ? ["evidence confirmed", "proof verified", "source official"]
            : ["", "analysis", "report"];

      // Run multiple varied queries to get deeper source coverage (50+ sources)
      const queries = perspective.map((p) => (p ? `${query} ${p}` : query));
      const allResults = await Promise.allSettled(
        queries.map((q) =>
          tavilySearch(apiKey, base, q, Math.min(10, Math.ceil(maxResults / queries.length))),
        ),
      );
      const hits = allResults
        .filter((r): r is PromiseFulfilledResult<SearchHit[]> => r.status === "fulfilled")
        .flatMap((r) => r.value);
      return dedupeHits(hits).slice(0, maxResults);
    },
    async fetchContent(url) {
      if (!apiKey) return null;
      try {
        const res = await fetch(`${base}/extract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            urls: url,
            extract_depth: "advanced", // retrieves tables, embedded content
            format: "text",
          }),
          signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as {
          results: { url: string; raw_content: string }[];
          failed_results: { url: string }[];
        };
        const extracted = data.results.find((r) => r.url === url);
        if (!extracted || !extracted.raw_content) return null;
        return { text: extracted.raw_content.slice(0, 20_000) };
      } catch {
        return null;
      }
    },
  };
}

type TavilyResult = { url: string; title: string; content: string; published_date?: string };

async function tavilySearch(
  apiKey: string,
  base: string,
  query: string,
  maxResults: number,
): Promise<SearchHit[]> {
  const res = await fetch(`${base}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: Math.min(10, Math.max(5, maxResults)),
      search_depth: "advanced",
      chunks_per_source: 3,
      include_answer: false,
      include_raw_content: false,
      topic: "news", // enables published_date in results
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Tavily search ${res.status}`);
  const data = (await res.json()) as { results: TavilyResult[] };
  return data.results.map((r) => ({
    url: r.url,
    title: r.title,
    snippet: r.content,
    sourceType: classifyUrl(r.url),
    reliability: reliabilityFor(r.url),
    publishedDate: r.published_date,
  }));
}

