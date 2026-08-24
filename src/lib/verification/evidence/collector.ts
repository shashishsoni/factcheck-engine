import type { EvidenceContext, SearchHit, Source, SourceDetail } from "../../types";
import type { SourceAggregator } from "../../scraping/types";
import { dedupeHits, normalizeUrl } from "../../scraping/providers/search-utils";

const SOURCES_PER_SEARCH = 50;
const MAX_DEBATE_SOURCES_PER_PERSPECTIVE = 50;
const SEARCH_CONCURRENCY = 4;

type EvidencePerspective = "supporting" | "contradicting" | "contextual";

export interface CollectedEvidence {
  /** One evidence context per subclaim — kept separate to prevent claim conflation. */
  contexts: EvidenceContext[];
  sources: Source[];
  sourceList: SourceDetail[];
}

export class EvidenceCollector {
  constructor(private readonly sourceAggregator: SourceAggregator) {}

  /**
   * Collect evidence for each subclaim independently.
   *
   * Each subclaim gets its own EvidenceContext so that downstream evaluation
   * can judge claims separately and avoid cross-applying dates/entities from
   * one claim to another (e.g. an Act's enactment date to a later amendment bill).
   */
  async collect(subClaims: string[]): Promise<CollectedEvidence> {
    const searchTargets = uniqueQueries(subClaims);
    const evidenceByClaim = await mapWithConcurrency(
      searchTargets,
      (claim) => this.searchClaim(claim),
      SEARCH_CONCURRENCY,
    );

    // Keep per-claim contexts separate; aggregate sources globally for display.
    const contexts = evidenceByClaim.map((ctx) => capContext(ctx));

    // Build source list with perspective labels preserved from the search.
    // When a URL appears in multiple perspectives, keep the first (highest
    // priority: supporting > contradicting > contextual).
    const sourceList = buildSourceListWithPerspectives(contexts);
    const dedupedSources = dedupeHits(
      contexts.flatMap((ctx) => [...ctx.supporting, ...ctx.contradicting, ...ctx.contextual]),
    );

    return {
      contexts,
      sources: dedupedSources,
      sourceList,
    };
  }

  private async searchClaim(claim: string): Promise<EvidenceContext> {
    const [supporting, contradicting, contextual] = await Promise.all([
      this.sourceAggregator.search(claim, {
        perspective: "supporting",
        maxResults: SOURCES_PER_SEARCH,
      }),
      this.sourceAggregator.search(claim, {
        perspective: "contradicting",
        maxResults: SOURCES_PER_SEARCH,
      }),
      this.sourceAggregator.search(claim, {
        perspective: "neutral",
        maxResults: SOURCES_PER_SEARCH,
      }),
    ]);
    return { claim, supporting, contradicting, contextual };
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await worker(items[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

function capContext(ctx: EvidenceContext): EvidenceContext {
  return {
    claim: ctx.claim,
    supporting: ctx.supporting.slice(0, MAX_DEBATE_SOURCES_PER_PERSPECTIVE),
    contradicting: ctx.contradicting.slice(0, MAX_DEBATE_SOURCES_PER_PERSPECTIVE),
    contextual: ctx.contextual.slice(0, MAX_DEBATE_SOURCES_PER_PERSPECTIVE),
  };
}

function uniqueQueries(queries: string[]): string[] {
  const seen = new Set<string>();
  return queries.filter((query) => {
    const key = query.replace(/\s+/g, " ").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function toSourceDetailsFromHits(hits: SearchHit[]): SourceDetail[] {
  return hits.map((hit) => ({
    url: hit.url,
    title: hit.title,
    snippet: hit.snippet?.slice(0, 120),
    sourceType: hit.sourceType,
    reliability: hit.reliability,
    publishedDate: hit.publishedDate,
    perspective: "contextual" as EvidencePerspective,
  }));
}

/**
 * Build a source list that preserves the original search perspective for each
 * hit. When a URL appears in multiple perspectives, the first occurrence wins
 * (supporting > contradicting > contextual).
 */
export function buildSourceListWithPerspectives(contexts: EvidenceContext[]): SourceDetail[] {
  const seen = new Set<string>();
  const out: SourceDetail[] = [];
  for (const ctx of contexts) {
    for (const hit of ctx.supporting) {
      const key = normalizeUrl(hit.url);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(toSourceDetail(hit, "supporting"));
    }
    for (const hit of ctx.contradicting) {
      const key = normalizeUrl(hit.url);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(toSourceDetail(hit, "contradicting"));
    }
    for (const hit of ctx.contextual) {
      const key = normalizeUrl(hit.url);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(toSourceDetail(hit, "contextual"));
    }
  }
  return out;
}

function toSourceDetail(hit: SearchHit, perspective: EvidencePerspective): SourceDetail {
  return {
    url: hit.url,
    title: hit.title,
    snippet: hit.snippet?.slice(0, 120),
    sourceType: hit.sourceType,
    reliability: hit.reliability,
    publishedDate: hit.publishedDate,
    perspective,
  };
}

