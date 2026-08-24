"use client";

import React from "react";
import type { LanguageMode } from "@/lib/types";
import { ExternalLink, Search, Loader2 } from "lucide-react";
import type { EvidenceState } from "../types";
import { domainFromUrl, PerspectiveIcon, perspectiveLabel } from "../shared/utils";
import { buildClaimList, claimMatches } from "../shared/claim-list";

interface EvidencePanelProps {
  language: LanguageMode;
  evidenceByClaim: EvidenceState[];
  claims?: string[];
}

export function EvidencePanel({
  language,
  evidenceByClaim,
  claims = [],
}: EvidencePanelProps) {
  const allClaimList = buildClaimList(claims, evidenceByClaim, claimMatches);
  if (allClaimList.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
      {allClaimList.map(({ claim, item: evidence, index }) => {
        const isSearching = evidence?.status === "active";
        const isDone = evidence?.status === "done";
        const sources = evidence?.sources ?? [];
        const queries = evidence?.searchQueries ?? [];

        return (
          <div
            key={index}
            className={`flex flex-col justify-between rounded-2xl border p-6 font-mono text-sm transition-all shadow-lg group min-h-[380px] sm:min-h-[440px] ${
              isSearching
                ? "border-emerald-500/80 bg-emerald-950/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                : isDone
                  ? "border-zinc-800/80 bg-zinc-900/70 hover:border-emerald-500/60"
                  : "border-zinc-800/40 bg-zinc-950/40 opacity-70"
            }`}
          >
            <div>
              {/* Header with claim number & status */}
              <div className="flex items-center justify-between gap-3 border-b border-zinc-800/60 pb-3 mb-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-950/90 border border-emerald-600/60 text-sm font-bold text-emerald-400 shadow-sm">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="rounded-md bg-zinc-800/80 px-2.5 py-1 text-xs text-zinc-300 font-bold flex items-center gap-1.5">
                  {isSearching ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-bold">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      SEARCHING
                    </span>
                  ) : isDone ? (
                    `${sources.length} sources`
                  ) : (
                    "QUEUED"
                  )}
                </span>
              </div>

              {/* Claim Statement */}
              <p className="line-clamp-3 leading-relaxed text-zinc-200 text-xs sm:text-sm mb-3 font-medium">
                {claim}
              </p>

              {/* Search query chips */}
              {queries.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {queries.slice(0, 2).map((q, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded bg-zinc-950/80 border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 truncate max-w-[200px]"
                    >
                      <Search className="h-2.5 w-2.5 shrink-0 text-emerald-400" />
                      <span className="truncate">{q}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Verified Sources list */}
            {sources.length > 0 ? (
              <div className="space-y-1.5 border-t border-zinc-800/60 pt-2.5 mt-auto">
                {sources.slice(0, 3).map((source, sIdx) => (
                  <div
                    key={sIdx}
                    className="flex items-center justify-between gap-1.5 text-[11px] rounded bg-black/40 px-2 py-1 border border-zinc-800/60"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <PerspectiveIcon perspective={source.perspective ?? "contextual"} />
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">
                        {perspectiveLabel(source.perspective ?? "contextual", language).slice(0, 4)}
                      </span>
                    </div>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline truncate max-w-[120px] flex items-center gap-1"
                    >
                      <span className="truncate">{source.title ?? domainFromUrl(source.url)}</span>
                      <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                    </a>
                  </div>
                ))}
              </div>
            ) : isSearching ? (
              <div className="border-t border-zinc-800/60 pt-2 mt-auto font-mono text-[11px] text-emerald-400 animate-pulse">
                Querying live sources...
              </div>
            ) : (
              <div className="border-t border-zinc-800/60 pt-2 mt-auto font-mono text-[11px] text-zinc-600">
                Waiting for search engine...
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
