"use client";

import type { LanguageMode, ModelEvaluation } from "@/lib/types";
import { AlertCircle, Check, CircleDot, Gavel, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import type { ClaimEvalState } from "../types";
import { formatThinkingText, useScrollToLatest } from "../shared/thinking";
import { VerdictBadge } from "../shared/utils";

export function EnsembleModelCard({
  language,
  model,
  thinking,
}: {
  language: LanguageMode;
  model: ModelEvaluation;
  thinking: string;
}) {
  const isThinking = model.status === "thinking";
  const isDone = model.status === "done";
  const isFailed = model.status === "failed";
  const shortName = formatModelName(model.model);

  return (
    <article className="rounded-xl border border-zinc-800/80 bg-zinc-900/80 p-3.5 font-mono text-xs space-y-2.5 shadow-sm min-h-[140px] flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isThinking && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-400" />}
          {isDone && <Check className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2.5} />}
          {isFailed && <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
          <span className="truncate font-bold text-zinc-100 text-xs sm:text-sm">{shortName}</span>
        </div>
        {isDone && model.verdict && <VerdictBadge verdict={model.verdict} language={language} />}
        {isFailed && <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Failed</span>}
      </div>

      {isThinking && <LiveThinkingOutput text={thinking} />}
      {isDone && model.reasoning && (
        <p className="text-xs leading-relaxed text-zinc-300 line-clamp-4 bg-black/40 p-3 rounded-lg border border-zinc-800/80">
          {model.reasoning}
        </p>
      )}
      {isDone && thinking && <ThinkingDetails text={thinking} label="View model thinking" />}
      {isFailed && model.reasoning && (
        <p className="text-xs leading-relaxed text-red-300/80 line-clamp-3 bg-red-950/30 p-3 rounded-lg border border-red-900/40">
          {model.reasoning}
        </p>
      )}
      {isFailed && thinking && <ThinkingDetails text={thinking} label="View partial thinking" />}
    </article>
  );
}

export function CrossExaminationList({ evaluation }: { evaluation: ClaimEvalState }) {
  return (
    <div className="space-y-3.5">
      {evaluation.crossExaminations?.map((cross, index) => {
        const isThinking = cross.status === "thinking";
        const isAgree = cross.stance === "agree";
        const Icon = isAgree ? ThumbsUp : cross.stance === "disagree" ? ThumbsDown : CircleDot;
        return (
          <article key={index} className="rounded-2xl border border-zinc-800/80 bg-zinc-900/80 p-4 sm:p-5 font-mono text-sm space-y-3 shadow-md min-h-[160px] sm:min-h-[190px] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2.5 border-b border-zinc-800/60 pb-2.5">
              <span className="font-bold text-zinc-100 text-sm sm:text-base truncate">{formatModelName(cross.model)}</span>
              <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold ${
                isThinking
                  ? "bg-violet-950/70 text-violet-300 border border-violet-700/60"
                  : isAgree
                    ? "bg-emerald-950/70 text-emerald-300 border border-emerald-700/60"
                    : "bg-red-950/70 text-red-300 border border-red-700/60"
              }`}>
                {isThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                {isThinking ? "THINKING" : cross.stance.toUpperCase()}
              </span>
            </div>
            {isThinking && <LiveThinkingOutput text={cross.thinking ?? ""} />}
            {!isThinking && cross.argument && (
              <p className="text-sm leading-relaxed text-zinc-300 bg-black/40 p-3.5 rounded-xl border border-zinc-800/80 line-clamp-6 flex-1">{cross.argument}</p>
            )}
            {!isThinking && cross.thinking && <ThinkingDetails text={cross.thinking} label="View model thinking" />}
          </article>
        );
      })}
    </div>
  );
}

export function JudgeCard({
  language,
  evaluation,
  expanded,
  onToggle,
}: {
  language: LanguageMode;
  evaluation: ClaimEvalState;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const active = evaluation.judgeStatus === "active";
  const judgeName = formatModelName(evaluation.judgeModel || "Judge");

  return (
    <div className="rounded-2xl border border-amber-800/60 bg-amber-950/20 p-6 font-mono text-sm space-y-4 shadow-lg min-h-[380px] sm:min-h-[460px] flex flex-col justify-between">
      <div className="flex items-center justify-between gap-3 border-b border-amber-900/40 pb-3">
        <div className="flex items-center gap-2.5 text-amber-300 font-bold text-sm sm:text-base truncate">
          {active ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
          <span className="truncate">{judgeName}</span>
        </div>
        {!active && evaluation.judgeVerdict && <VerdictBadge verdict={evaluation.judgeVerdict} language={language} />}
      </div>

      {active && <LiveThinkingOutput text={evaluation.judgeThinking ?? ""} />}
      {!active && evaluation.judgeDeliberation && (
        <div className="min-h-0 flex-1 flex flex-col gap-3 w-full">
          <pre className="terminal-scroll max-h-64 min-h-0 overflow-y-auto overscroll-contain whitespace-pre-wrap rounded-xl bg-black/40 p-4 text-sm leading-relaxed text-zinc-200 border border-zinc-800/80 w-full">
            {evaluation.judgeDeliberation}
          </pre>
          {evaluation.judgeReasoning && (
            <button onClick={onToggle} className="cursor-pointer text-xs font-bold text-amber-400 hover:underline block pt-1">
              {expanded ? "Hide full judicial opinion" : "Read full judicial opinion ›"}
            </button>
          )}
          {expanded && evaluation.judgeReasoning && (
            <pre className="terminal-scroll max-h-64 overflow-y-auto overscroll-contain whitespace-pre-wrap rounded-xl bg-black/70 p-4 text-xs text-zinc-200 border border-zinc-800 w-full">
              {evaluation.judgeReasoning}
            </pre>
          )}
          {evaluation.judgeThinking && <ThinkingDetails text={evaluation.judgeThinking} label="View judge thinking" tone="amber" />}
        </div>
      )}
    </div>
  );
}

function ThinkingDetails({ text, label, tone = "emerald" }: { text: string; label: string; tone?: "emerald" | "amber" }) {
  const textClass = tone === "amber" ? "text-amber-400 hover:text-amber-300" : "text-emerald-400 hover:text-emerald-300";
  const bodyClass = tone === "amber" ? "text-amber-200" : "text-emerald-300";
  return (
    <details className="group/thinking">
      <summary className={`cursor-pointer list-none text-[10px] font-bold uppercase tracking-wider ${textClass}`}>
        {label}
      </summary>
      <pre className={`terminal-scroll mt-2 max-h-40 overflow-y-auto overscroll-contain whitespace-pre-wrap rounded-lg border border-zinc-800/80 bg-black/60 p-2.5 text-[11px] leading-relaxed ${bodyClass}`}>
        {formatThinkingText(text)}
      </pre>
    </details>
  );
}

function LiveThinkingOutput({ text }: { text: string }) {
  const outputRef = useScrollToLatest<HTMLDivElement>(text);
  const readable = formatThinkingText(text);
  return (
    <div ref={outputRef} className="terminal-scroll max-h-48 overflow-y-auto rounded-lg bg-black/60 p-2.5 font-mono text-xs leading-relaxed text-emerald-400 border border-zinc-800/80">
      {readable ? (
        <span className="whitespace-pre-wrap">{readable}<span className="cursor-blink">_</span></span>
      ) : (
        <span className="italic text-zinc-500">Deliberating tokens...</span>
      )}
    </div>
  );
}

function formatModelName(model: string): string {
  return model.replace("nvidia/", "").replace("meta/", "").replace("openai/", "");
}
