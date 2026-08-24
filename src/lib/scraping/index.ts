import { SourceAggregator } from "./types";
import { createBingRssAdapter } from "./providers/bing-rss";
import { createGoogleNewsAdapter } from "./providers/google-news";
import { createNativeFetchAdapter } from "./providers/native-fetch";
import { createYahooSearchAdapter } from "./providers/yahoo-search";
import { createTavilyAdapter } from "./tavily";

/**
 * All available adapters are queried in parallel and deduplicated centrally.
 * Tavily (if configured) is the primary source — purpose-built AI search with
 * deep extraction. The free keyless adapters (Google News, Yahoo, Bing RSS,
 * native fetch) add breadth and provider diversity.
 */
export const sourceAggregator = new SourceAggregator([
  createTavilyAdapter(),
  createGoogleNewsAdapter(),
  createYahooSearchAdapter(),
  createBingRssAdapter(),
  createNativeFetchAdapter(),
]);

export type { SourceAdapter, SourceAggregator, SearchOptions } from "./types";
