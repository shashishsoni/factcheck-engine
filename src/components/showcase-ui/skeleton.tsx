"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import type { StepConfig } from "./types";

/**
 * Full-canvas skeleton shown before any stream events arrive — tells the user
 * the processor is about to start so the canvas doesn't look frozen/blank.
 */
export function CanvasSkeleton({ steps }: { steps: StepConfig[] }) {
  return (
    <div className="flex items-center justify-center p-20">
      <div className="flex flex-row items-center gap-28 sm:gap-36 lg:gap-40">
        {steps.map((config, index) => {
          const Icon = config.icon;
          const isFirst = index === 0;
          return (
            <div
              key={config.key}
              className={`shrink-0 w-[680px] sm:w-[780px] xl:w-[880px] rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-6 font-mono ${
                isFirst ? "border-emerald-700/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : "opacity-50"
              }`}
            >
              {/* Header shimmer */}
              <div className="flex items-center justify-between gap-3 border-b border-zinc-800/60 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  {isFirst ? (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  ) : (
                    <Icon className="h-4 w-4 text-zinc-600" />
                  )}
                  <span className={`text-sm font-bold ${isFirst ? "text-emerald-400" : "text-zinc-500"}`}>
                    {config.label}
                  </span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isFirst ? "text-emerald-400" : "text-zinc-600"}`}>
                  {isFirst ? "STARTING" : "QUEUED"}
                </span>
              </div>

              {/* Body shimmer lines */}
              <div className="space-y-3">
                {isFirst ? (
                  <div className="space-y-2.5">
                    <p className="text-xs text-emerald-400/80 animate-pulse">
                      Initializing neural verification pipeline...
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Connecting to AI ensemble — please wait while models warm up.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="h-3 w-full rounded bg-zinc-800/60 animate-pulse" />
                    <div className="h-3 w-3/4 rounded bg-zinc-800/50 animate-pulse" />
                    <div className="h-3 w-5/6 rounded bg-zinc-800/40 animate-pulse" />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Per-node skeleton shown when a step is "active" but hasn't produced content
 * yet (e.g. extract-claims is running but no claims have arrived).
 */
export function NodeSkeleton({ label, detail }: { label: string; detail?: string }) {
  return (
    <div className="space-y-3.5 rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-5 font-mono text-xs">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
        <div className="flex items-center gap-2 text-zinc-300 font-bold text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
          <span>{label}</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 animate-pulse">
          PROCESSING
        </span>
      </div>
      {detail && (
        <p className="text-xs text-zinc-400 leading-relaxed">{detail}</p>
      )}
      <div className="space-y-2.5">
        <div className="h-3 w-full rounded bg-zinc-800/60 animate-pulse" />
        <div className="h-3 w-4/5 rounded bg-zinc-800/50 animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-zinc-800/40 animate-pulse" />
      </div>
    </div>
  );
}
