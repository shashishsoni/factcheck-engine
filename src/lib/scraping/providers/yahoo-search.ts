import * as cheerio from "cheerio";
import type { SearchHit } from "../../types";
import type { SourceAdapter } from "../types";
import {
  buildSearchQueries,
  classifyUrl,
  dedupeHits,
  isRelevantResult,
  isSocialUrl,
  reliabilityFor,
} from "./search-utils";

export function createYahooSearchAdapter(): SourceAdapter {
  return {
    name: "yahoo-search",
    isAvailable: () => true,
    async search(query, options) {
      const maxResults = options?.maxResults ?? 10;
      const queries = buildSearchQueries(query, options?.perspective);
      const results = await Promise.all(
        queries.map((searchQuery) => fetchResults(searchQuery, query, maxResults)),
      );
      return dedupeHits(results.flat()).slice(0, maxResults);
    },
    async fetchContent() {
      return null;
    },
  };
}

async function fetchResults(
  searchQuery: string,
  relevanceQuery: string,
  maxResults: number,
): Promise<SearchHit[]> {
  try {
    const response = await fetch(
      `https://search.yahoo.com/search?p=${encodeURIComponent(searchQuery)}`,
      {
        headers: { "user-agent": "FactCheckerBot/1.0" },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) return [];
    const $ = cheerio.load(await response.text());
    return $("h3.title")
      .slice(0, maxResults)
      .map((_, element) => {
        const heading = $(element);
        const anchor = heading.closest("a");
        const url = anchor.attr("href") ?? "";
        const title = heading.text().trim() || undefined;
        const container = heading.closest("li");
        const snippet = container.find(".compText").text().trim() || undefined;
        if (!url.startsWith("http") || isSocialUrl(url) || !isRelevantResult(relevanceQuery, title, snippet)) return null;
        const hit: SearchHit = {
          url,
          title,
          snippet,
          sourceType: classifyUrl(url),
          reliability: reliabilityFor(url),
        };
        return hit;
      })
      .get()
      .filter((hit): hit is SearchHit => hit !== null);
  } catch {
    return [];
  }
}
