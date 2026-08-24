"use client";

import React from "react";
import { Captions } from "lucide-react";
import type { LanguageMode } from "@/lib/types";
import type { StepState } from "../types";
import { t } from "@/components/language/translations";
import { VerdictBadge } from "../shared/utils";
import { NodeSkeleton } from "../skeleton";

interface ShowcaseContentProps {
  language: LanguageMode;
  step: string;
  state?: StepState;
}

export function ShowcaseContent({
  language,
  step,
  state,
}: ShowcaseContentProps) {
  if (!state) return null;

  // Show skeleton when a step is active but hasn't produced content yet.
  if (state.status === "active") {
    const skeletonDetail: Record<string, string> = {
      input: "Resolving input adapter and extracting content...",
      transcript: "Extracting transcript from media source...",
      "analyze-media": "Gemini is analyzing the media content (vision/audio)...",
      "extract-claims": "Nemotron 3 Super 120B is extracting factual claims (1M context, fast MoE)...",
      "gather-evidence": "Searching the web and gathering evidence for each claim...",
      ensemble: "AI ensemble models are evaluating claims in parallel...",
      "cross-examine": "Models are cross-examining each other's verdicts...",
      judge: "Judge model is deliberating on the final verdict...",
      synthesize: "Synthesizing the final verdict from all evaluated claims...",
    };
    return <NodeSkeleton label={step.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} detail={skeletonDetail[step]} />;
  }

  if (step === "input" && state.status === "done") {
    const typeLabel = state.inputType ? `${state.inputType.toUpperCase()}` : "RAW INPUT";
    const platform = state.metadata?.platform ?? "";
    const method = state.metadata?.transcriptMethod ? `Transcript via ${state.metadata.transcriptMethod}` : "";

    return (
      <div className="space-y-3.5 rounded-xl border border-cyan-800/50 bg-cyan-950/20 p-5 font-mono text-xs sm:text-sm">
        {/* Header telemetry */}
        <div className="flex items-center justify-between gap-2 border-b border-cyan-900/40 pb-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#06b6d4]" />
            <span>Target Context Payload</span>
          </div>
          <span className="rounded bg-cyan-950/80 border border-cyan-700/50 px-2.5 py-1 text-xs text-cyan-300 font-bold">
            {platform ? `${platform} ${typeLabel}` : typeLabel}
          </span>
        </div>

        {/* Target Source URL */}
        {state.rawInput && (
          <div className="space-y-1.5">
            <span className="text-zinc-400 text-xs font-semibold">SOURCE TARGET:</span>
            <p className="break-all font-semibold text-emerald-400 text-xs sm:text-sm bg-black/50 p-3 rounded-xl border border-zinc-800">
              {state.rawInput}
            </p>
          </div>
        )}

        {/* Extracted Context text */}
        {state.detail && (
          <div className="space-y-1.5">
            <span className="text-zinc-400 text-xs font-semibold">CONTEXT EXTRACTED:</span>
            <p className="leading-relaxed text-zinc-200 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80">
              {state.detail}
            </p>
          </div>
        )}

        {/* Method tag */}
        {method && (
          <div className="flex items-center gap-2 text-xs text-zinc-400 pt-1">
            <span className="text-cyan-400 font-semibold">protocol:</span>
            <span>{method}</span>
          </div>
        )}
      </div>
    );
  }

  if (step === "transcript" && state.status === "done" && state.detail) {
    return (
      <div className="space-y-3.5">
        <div className="flex items-center gap-2.5 font-mono text-xs sm:text-sm text-cyan-400 font-semibold">
          <Captions className="h-4.5 w-4.5 shrink-0" strokeWidth={1.75} />
          <span>{state.detail}</span>
        </div>
        {state.preview && (
          <pre className="terminal-scroll max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border border-zinc-800/80 bg-black/60 p-5 font-mono text-xs sm:text-sm leading-relaxed text-zinc-300">
            {state.preview}
          </pre>
        )}
      </div>
    );
  }

  if (step === "extract-claims" && state.claims?.length) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
        {state.claims.map((claim, index) => (
          <div
            key={index}
            className="flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-6 font-mono text-sm sm:text-base hover:border-emerald-500/60 transition-all shadow-lg group min-h-[260px] sm:min-h-[300px]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800/60 pb-3 mb-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-950/90 border border-emerald-600/60 text-sm font-bold text-emerald-400 shadow-sm">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-xs text-zinc-400 font-bold group-hover:text-emerald-400 transition-colors tracking-wider">
                CLAIM
              </span>
            </div>
            <p className="leading-relaxed text-zinc-100 flex-1 font-medium">
              {claim}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (step === "synthesize" && state.status === "done" && state.verdict) {
    return (
      <div className="space-y-5 rounded-xl border border-emerald-700/50 bg-emerald-950/25 p-6">
        <div className="flex items-center justify-between">
          <span className="font-mono text-base font-bold text-zinc-200">{t(language, "finalVerdict")}</span>
          <VerdictBadge verdict={state.verdict} language={language} />
        </div>
        {state.confidence != null && (
          <div className="flex items-center justify-between font-mono text-xs sm:text-sm text-zinc-300 border-t border-zinc-800/50 pt-3.5">
            <span>Confidence Calibration:</span>
            <span className="font-bold text-emerald-400 text-base">{state.confidence}%</span>
          </div>
        )}
        {state.summary && (
          <div className="border-t border-zinc-800/50 pt-3.5">
            <p className="font-mono text-xs sm:text-sm leading-relaxed text-zinc-200">
              {state.summary}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (state.status === "failed") {
    return (
      <div className="space-y-3 rounded-xl border border-red-800/50 bg-red-950/20 p-5 font-mono text-xs">
        <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]" />
          <span>Step Failed</span>
        </div>
        {state.detail && <p className="text-zinc-400 leading-relaxed">{state.detail}</p>}
      </div>
    );
  }

  return null;
}
