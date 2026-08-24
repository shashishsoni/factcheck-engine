import * as cheerio from "cheerio";
import type { SearchHit } from "../../types";
import type { SourceAdapter } from "../types";
import { buildSearchQueries, classifyUrl, dedupeHits, isRelevantResult, isSocialUrl, reliabilityFor } from "./search-utils";

export function createGoogleNewsAdapter(): SourceAdapter {
  return {
    name: "google-news-rss",
    isAvailable: () => true,
    async search(query, options) {
      const maxResults = options?.maxResults ?? 10;
      const queries = buildSearchQueries(query, options?.perspective);
      const results = await Promise.all(
        queries.map((searchQuery) => fetchFeed(searchQuery, query, maxResults)),
      );
      return dedupeHits(results.flat()).slice(0, maxResults);
    },
    async fetchContent() {
      return null;
    },
  };
}

async function fetchFeed(
  searchQuery: string,
  relevanceQuery: string,
  maxResults: number,
): Promise<SearchHit[]> {
  const url =
    `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}` +
    "&hl=en-US&gl=US&ceid=US:en";
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "FactCheckerBot/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return [];
    const $ = cheerio.load(await response.text(), { xmlMode: true });
    return $("item")
      .slice(0, maxResults * 2)
      .map((_, element) => {
        const link = $(element).find("link").first().text().trim();
        const title = $(element).find("title").first().text().trim() || undefined;
        const snippet = $(element).find("description").first().text().trim() || undefined;
        if (!link.startsWith("http")) return null;
        if (isSocialUrl(link)) return null;
        if (!isRelevantResult(relevanceQuery, title, snippet)) return null;
        const hit: SearchHit = {
          url: link,
          title,
          snippet,
          sourceType: classifyUrl(link),
          reliability: reliabilityFor(link),
          publishedDate: $(element).find("pubDate").first().text().trim() || undefined,
        };
        return hit;
      })
      .get()
      .filter((hit): hit is SearchHit => hit !== null)
      .slice(0, maxResults);
  } catch {
    return [];
  }
}
