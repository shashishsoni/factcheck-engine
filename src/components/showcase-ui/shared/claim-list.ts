/**
 * Builds a per-claim list that guarantees every extracted claim appears in
 * the grid, paired with its evaluation/evidence when available. Used by both
 * the debate panel and the evidence panel so they stay aligned on claim
 * ordering even when the streaming events arrive out of order.
 */
export function buildClaimList<TItem>(
  claims: string[],
  items: TItem[],
  match: (item: TItem, claimText: string) => boolean,
): Array<{ claim: string; item?: TItem; index: number }> {
  const source = claims.length > 0 ? claims : items.map((item) => (item as unknown as { claim: string }).claim);
  return source.map((claimText, idx) => ({
    claim: claimText || "",
    item: items.find((it) => match(it, claimText)) ?? items[idx],
    index: idx,
  }));
}

/** Case-insensitive trimmed claim comparison. */
export function claimMatches(item: { claim?: string }, claimText: string): boolean {
  return (item.claim || "").trim().toLowerCase() === (claimText || "").trim().toLowerCase();
}
