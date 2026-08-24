import { describe, it, expect } from "vitest";
import { EvidenceCollector } from "../src/lib/verification/evidence/collector";
import { SourceAggregator } from "../src/lib/scraping/types";
import type { SearchHit } from "../src/lib/types";
import type { EvidenceContext } from "../src/lib/types";

/**
 * Regression test for the FCRA date-conflation bug.
 *
 * Root cause: the old pipeline consolidated multiple distinct claims into one
 * paragraph, then evaluated only that compound claim against globally merged
 * evidence. This caused dates/entities from one claim (e.g. "FCRA Act enacted
 * in 2010") to be cross-applied to a different claim (e.g. "FCRA Amendment Bill
 * introduced in 2026").
 *
 * Fix: EvidenceCollector now keeps per-claim evidence contexts separate, and
 * VerificationEngine evaluates each claim independently.
 *
 * This test verifies that:
 * 1. Evidence contexts are kept per-claim (not merged into one).
 * 2. Each context's `claim` field matches the specific subclaim.
 * 3. Sources found for one claim don't contaminate another claim's context.
 */

function makeHit(url: string, title: string, snippet: string, publishedDate?: string): SearchHit {
  return {
    url,
    title,
    snippet,
    sourceType: "news",
    reliability: 70,
    publishedDate,
  };
}

/**
 * Build a SourceAggregator subclass that returns different hits depending on
 * the query content, simulating real search behavior where "FCRA Act 2010"
 * surfaces different sources than "FCRA Amendment Bill 2026".
 */
function mockAggregator(): SourceAggregator {
  return new SourceAggregator([
    {
      name: "mock",
      isAvailable: () => true,
      async search(query: string) {
        if (query.includes("2010")) {
          return [
            makeHit("https://example.com/fcra-act-2010", "FCRA Act 2010", "The Foreign Contribution (Regulation) Act was enacted in 2010."),
          ];
        }
        if (query.includes("2026") || query.includes("amendment")) {
          return [
            makeHit("https://example.com/fcra-amendment-2026", "FCRA Amendment Bill 2026", "The FCRA Amendment Bill was introduced in March 2026."),
          ];
        }
        return [];
      },
      async fetchContent() {
        return null;
      },
    },
  ]);
}

describe("EvidenceCollector — claim boundary preservation", () => {
  it("keeps per-claim evidence contexts separate (no merging)", async () => {
    const collector = new EvidenceCollector(mockAggregator());
    const subClaims = [
      "The FCRA Act was enacted in 2010.",
      "The FCRA Amendment Bill was introduced in March 2026.",
    ];

    const collected = await collector.collect(subClaims);

    // Should have one context per subclaim, not a single merged context.
    expect(collected.contexts.length).toBe(2);

    // Each context should be keyed to its specific claim.
    const claims = collected.contexts.map((c) => c.claim);
    expect(claims).toContain("The FCRA Act was enacted in 2010.");
    expect(claims).toContain("The FCRA Amendment Bill was introduced in March 2026.");
  });

  it("does not cross-apply 2010 Act evidence to the 2026 amendment claim", async () => {
    const collector = new EvidenceCollector(mockAggregator());
    const subClaims = [
      "The FCRA Act was enacted in 2010.",
      "The FCRA Amendment Bill was introduced in March 2026.",
    ];

    const collected = await collector.collect(subClaims);
    const actContext = collected.contexts.find((c) => c.claim.includes("2010"));
    const billContext = collected.contexts.find((c) => c.claim.includes("2026"));

    expect(actContext).toBeDefined();
    expect(billContext).toBeDefined();

    // The 2010 Act context should contain the 2010 source, not the 2026 source.
    const actUrls = allUrls(actContext!);
    expect(actUrls).toContain("https://example.com/fcra-act-2010");
    expect(actUrls).not.toContain("https://example.com/fcra-amendment-2026");

    // The 2026 bill context should contain the 2026 source, not the 2010 source.
    const billUrls = allUrls(billContext!);
    expect(billUrls).toContain("https://example.com/fcra-amendment-2026");
    expect(billUrls).not.toContain("https://example.com/fcra-act-2010");
  });

  it("aggregates all unique sources globally for the final result", async () => {
    const collector = new EvidenceCollector(mockAggregator());
    const subClaims = [
      "The FCRA Act was enacted in 2010.",
      "The FCRA Amendment Bill was introduced in March 2026.",
    ];

    const collected = await collector.collect(subClaims);

    // Both sources should appear in the aggregated sources list.
    const sourceUrls = collected.sources.map((s) => s.url);
    expect(sourceUrls).toContain("https://example.com/fcra-act-2010");
    expect(sourceUrls).toContain("https://example.com/fcra-amendment-2026");
    expect(collected.sources.length).toBe(2);
  });

  it("handles a single claim without error", async () => {
    const collector = new EvidenceCollector(mockAggregator());
    const collected = await collector.collect(["The FCRA Act was enacted in 2010."]);

    expect(collected.contexts.length).toBe(1);
    expect(collected.contexts[0].claim).toBe("The FCRA Act was enacted in 2010.");
  });
});

function allUrls(ctx: EvidenceContext): string[] {
  return [...ctx.supporting, ...ctx.contradicting, ...ctx.contextual].map((h) => h.url);
}
