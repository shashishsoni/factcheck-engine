import type { SearchHit } from "../types";

/**
 * SourceAdapter — each source-gathering backend (Tavily, native fetch, oEmbed,
 * search engines) implements this. The engine calls `search(claim)` and gets
 * back normalized SearchHits. Add a new source by adding an adapter.
 */
export interface SourceAdapter {
  readonly name: string;
  /** True if configured and ready (has API key, etc.). */
  isAvailable(): boolean;
  /** Search for evidence about a claim. Returns normalized hits. */
  search(query: string, opts?: SearchOptions): Promise<SearchHit[]>;
  /** Fetch full content for a hit URL (for deeper extraction). */
  fetchContent(url: string): Promise<{ title?: string; text: string } | null>;
}

export interface SearchOptions {
  maxResults?: number;
  // Bias toward supporting/contradicting evidence to reduce confirmation bias.
  perspective?: "neutral" | "supporting" | "contradicting";
}

/**
 * Aggregates multiple source adapters. Calls all available ones in parallel
 * and merges + dedupes results. This is the seam the engine uses.
 */
export class SourceAggregator {
  constructor(private adapters: SourceAdapter[]) {}

  async search(query: string, opts?: SearchOptions): Promise<SearchHit[]> {
    const available = this.adapters.filter((a) => a.isAvailable());
    if (available.length === 0) return [];
    const results = await Promise.allSettled(
      available.map((a) => a.search(query, opts).catch(() => [] as SearchHit[])),
    );
    const hits = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : [],
    );
    // Sort newest-first: sources with a publishedDate come first (most recent
    // first), then sources without a date (preserving original order).
    const sorted = dedupe(hits).sort((a, b) => {
      if (a.publishedDate && b.publishedDate) {
        return b.publishedDate.localeCompare(a.publishedDate);
      }
      if (a.publishedDate) return -1;
      if (b.publishedDate) return 1;
      return 0;
    });
    return sorted.slice(0, opts?.maxResults ?? 15);
  }

  async fetchContent(url: string): Promise<{ title?: string; text: string } | null> {
    for (const adapter of this.adapters.filter((a) => a.isAvailable())) {
      const content = await adapter.fetchContent(url).catch(() => null);
      if (content) return content;
    }
    return null;
  }
}

function dedupe(hits: SearchHit[]): SearchHit[] {
  const seen = new Set<string>();
  return hits.filter((h) => {
    const key = h.url.split("#")[0].split("?")[0];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
