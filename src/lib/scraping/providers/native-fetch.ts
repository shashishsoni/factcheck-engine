import * as cheerio from "cheerio";
import type { SearchHit } from "../../types";
import type { SourceAdapter } from "../types";
import { buildSearchQueries, classifyUrl, dedupeHits, isRelevantResult, isSocialUrl, reliabilityFor } from "./search-utils";

export function createNativeFetchAdapter(): SourceAdapter {
  return {
    name: "native-fetch",
    isAvailable: () => true,
    async search(query, options) {
      const searchQuery = buildSearchQueries(query, options?.perspective)[0] ?? query;
      return searchDuckDuckGo(searchQuery, query, options?.maxResults ?? 10);
    },
    async fetchContent(url) {
      try {
        const response = await fetch(url, {
          headers: { "user-agent": "FactCheckerBot/1.0" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) return null;
        const $ = cheerio.load(await response.text());
        $("script,style,nav,footer,header,aside").remove();
        const title = $("title").text().trim() || undefined;
        const article = $("article").text() || $("main").text() || $("body").text();
        return { title, text: article.replace(/\s+/g, " ").trim().slice(0, 20_000) };
      } catch {
        return null;
      }
    },
  };
}

async function searchDuckDuckGo(
  searchQuery: string,
  relevanceQuery: string,
  maxResults: number,
): Promise<SearchHit[]> {
  try {
    const response = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`,
      {
        headers: { "user-agent": "FactCheckerBot/1.0" },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) return [];
    const $ = cheerio.load(await response.text());
    const hits: SearchHit[] = [];
    $(".result").slice(0, maxResults * 3).each((_, element) => {
      const anchor = $(element).find(".result__a").first();
      const href = anchor.attr("href") ?? "";
      const redirect = href.match(/uddg=([^&]+)/);
      const url = redirect ? decodeURIComponent(redirect[1]) : href;
      if (!url.startsWith("http")) return;
      if (isSocialUrl(url)) return;
      const title = anchor.text().trim() || undefined;
      const snippet = $(element).find(".result__snippet").text().trim() || undefined;
      if (!isRelevantResult(relevanceQuery, title, snippet)) return;
      hits.push({
        url,
        title,
        snippet,
        sourceType: classifyUrl(url),
        reliability: reliabilityFor(url),
      });
    });
    return dedupeHits(hits).slice(0, maxResults);
  } catch {
    return [];
  }
}
