"use client";

import React from "react";
import type { LanguageMode } from "@/lib/types";
import type { ClaimEvalState, StepState } from "../types";
import { buildClaimList, claimMatches } from "../shared/claim-list";
import {
  CrossExaminationList,
  EnsembleModelCard,
  JudgeCard,
} from "./debate-cards";

export interface DebatePanelProps {
  language: LanguageMode;
  step: string;
  steps: Record<string, StepState>;
  claims?: string[];
  evalByClaim: ClaimEvalState[];
  expandedEval?: number | null;
  setExpandedEval?: (index: number | null) => void;
}

export function DebatePanel({
  language,
  step,
  claims = [],
  evalByClaim,
  expandedEval,
  setExpandedEval,
}: DebatePanelProps) {
  const claimList = buildClaimList(claims, evalByClaim, claimMatches);
  if (claimList.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
      {claimList.map(({ claim, item: evaluation, index }) => {
        const evaluations = evaluation?.evaluations ?? [];
        const isEvaluating = evaluations.some((model) => model.status === "thinking");
        const isDone = evaluations.length > 0 && evaluations.every((model) => model.status === "done");
        return (
          <section key={index} className={`flex flex-col justify-between rounded-2xl border p-6 font-mono text-sm transition-all shadow-lg group min-h-[640px] sm:min-h-[740px] xl:min-h-[820px] ${
            isEvaluating
              ? "border-violet-500/80 bg-violet-950/30 shadow-[0_0_20px_rgba(139,92,246,0.2)]"
              : isDone
                ? "border-zinc-800/80 bg-zinc-900/70 hover:border-violet-500/60"
                : "border-zinc-800/40 bg-zinc-950/40 opacity-70"
          }`}>
            <div>
              {/* Header with claim number & status */}
              <div className="flex items-center justify-between gap-3 border-b border-zinc-800/60 pb-3 mb-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-950/90 border border-violet-700/60 text-sm font-bold text-violet-400 shadow-sm">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                  {step === "ensemble" ? "Ensemble" : step === "cross-examine" ? "Cross-Exam" : "Judge"}
                </span>
              </div>

              {/* Claim Statement */}
              <p className="line-clamp-3 leading-relaxed text-zinc-100 text-sm mb-3.5 font-medium">{claim}</p>
            </div>

            {/* Step specific panel */}
            <div className="border-t border-zinc-800/60 pt-2.5 mt-auto">
              {evaluation ? (
                <>
                  {step === "ensemble" && <EnsembleList language={language} evaluation={evaluation} />}
                  {step === "cross-examine" && <CrossExaminationList evaluation={evaluation} />}
                  {step === "judge" && (
                    <JudgeCard
                      language={language}
                      evaluation={evaluation}
                      expanded={expandedEval === index}
                      onToggle={() => setExpandedEval?.(expandedEval === index ? null : index)}
                    />
                  )}
                </>
              ) : (
                <div className="font-mono text-[11px] text-zinc-600">Waiting for ensemble bench...</div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function EnsembleList({ language, evaluation }: { language: LanguageMode; evaluation: ClaimEvalState }) {
  if (!evaluation.evaluations?.length) {
    return <div className="font-mono text-[10px] text-emerald-400 animate-pulse">Spawning neural ensemble models...</div>;
  }
  return (
    <div className="space-y-1.5">
      {evaluation.evaluations.map((model, index) => (
        <EnsembleModelCard key={index} language={language} model={model} thinking={evaluation.thinkingByModel?.[model.model] ?? ""} />
      ))}
    </div>
  );
}
