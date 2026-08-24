"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { FactCheckResult, LanguageMode } from "@/lib/types";
import { VerdictBadge } from "@/components/VerdictBadge";
import { LanguageSwitcher } from "@/components/language/LanguageSwitcher";
import { t, verdictLabel } from "@/components/language/translations";
import { Showcase } from "@/components/showcase-ui";
import { Search, ArrowRight, ExternalLink, FileText, Quote, BookOpen, AlertTriangle, Gavel, Scale, ScrollText } from "lucide-react";

const EXAMPLES = [
  "https://example.com/some-article",
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "9780132350884",
];

const PROOF_KIND_KEYS = {
  supports: "supporting",
  contradicts: "contradicting",
  contextual: "contextual",
} as const;

export default function CheckPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<LanguageMode>("en");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FactCheckResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
  }

  const handleComplete = useCallback((res: FactCheckResult) => {
    setResult(res);
    setLoading(false);
  }, []);

  const handleError = useCallback((err: string) => {
    setError(err);
    setLoading(false);
  }, []);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{t(language, "newFactCheck")}</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {t(language, "description")}
          </p>
        </div>
        <LanguageSwitcher language={language} onChange={setLanguage} />
      </div>

      <form onSubmit={handleSubmit} className="mt-6">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" strokeWidth={2} />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t(language, "inputPlaceholder")}
              className="w-full rounded-xl border border-zinc-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="group flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {t(language, "checking")}
              </>
            ) : (
              <>
                {t(language, "verify")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} />
              </>
            )}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-zinc-400">{t(language, "tryLabel")}</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setInput(ex)}
              disabled={loading}
              className="cursor-pointer rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
            >
              {ex.length > 40 ? ex.slice(0, 40) + "..." : ex}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <Showcase
          input={input.trim()}
          language={language}
          onComplete={handleComplete}
          onError={handleError}
        />
      )}

      {result && <ResultView result={result} language={language} onGoToHistory={() => router.push("/history")} />}
    </main>
  );
}

function ResultView({
  result,
  language,
  onGoToHistory,
}: {
  result: FactCheckResult;
  language: LanguageMode;
  onGoToHistory: () => void;
}) {
  return (
    <div className="mt-8 space-y-6">
      {/* === JUDGE'S RULING — prominent court-style verdict === */}
      <div className="slide-in overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header bar */}
        <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50/80 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-800/40">
          <Gavel className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{t(language, "judgesFinalRuling") ?? "न्यायाधीश का अंतिम निर्णय"}</span>
        </div>

        <div className="p-6">
          {/* Input info */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                {result.inputType}
              </p>
              <p className="mt-1.5 break-all text-sm font-medium">{result.inputPreview ?? result.inputRaw}</p>
            </div>
            <span role="img" aria-label={verdictLabel(language, result.verdict)} title={verdictLabel(language, result.verdict)}>
              <VerdictBadge verdict={result.verdict} confidence={result.confidence} language={language} />
            </span>
          </div>

          {/* The ruling — plain language summary */}
          {result.summary && (
            <div className="mt-5 rounded-xl border-l-4 border-emerald-500 bg-emerald-50/50 p-4 dark:border-emerald-600 dark:bg-emerald-950/20">
              <div className="mb-1.5 flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">{t(language, "theRuling")}</span>
              </div>
              <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                {result.summary}
              </p>
            </div>
          )}

          {/* Detailed reasoning — court-style, always visible */}
          {result.reasoning && (
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-1.5">
                <ScrollText className="h-3.5 w-3.5 text-zinc-400" strokeWidth={2} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{t(language, "detailedOpinion")}</span>
              </div>
              <div className="min-h-0 max-h-[min(24rem,60vh)] overflow-y-auto overscroll-contain rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/40">
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {result.reasoning}
                </pre>
              </div>
            </div>
          )}

          {/* Stats bar */}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Quote className="h-3 w-3" strokeWidth={2} />
              {result.claims.length} {t(language, "claimsEvaluated")}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <BookOpen className="h-3 w-3" strokeWidth={2} />
              {result.sources.length} {t(language, "sourcesConsulted")}
            </span>
            <button
              onClick={onGoToHistory}
              className="ml-auto flex cursor-pointer items-center gap-1 text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400"
            >
              {t(language, "savedToHistory")}
              <ArrowRight className="h-3 w-3" strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>

      {/* Claims */}
      {result.claims.length > 0 && (
        <div className="slide-in">
          <div className="mb-3 flex items-center gap-2">
            <Quote className="h-4 w-4 text-zinc-400" strokeWidth={2} />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
              {t(language, "claims")} ({result.claims.length})
            </h2>
          </div>
          <div className="space-y-3">
            {result.claims.map((claim, i) => (
              <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium leading-relaxed">{claim.text}</p>
                  <span role="img" aria-label={verdictLabel(language, claim.verdict)} title={verdictLabel(language, claim.verdict)}>
                    <VerdictBadge verdict={claim.verdict} confidence={claim.confidence} language={language} />
                  </span>
                </div>
                {claim.explanation && (
                  <p className="mt-2.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{claim.explanation}</p>
                )}
                {claim.proofs && claim.proofs.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {claim.proofs.map((proof, j) => (
                      <div key={j} className="border-l-2 border-emerald-300 pl-3 dark:border-emerald-800">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            {t(language, PROOF_KIND_KEYS[proof.kind])}
                          </span>
                          <a
                            href={proof.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex cursor-pointer items-center gap-1 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                          >
                            {proof.sourceTitle ?? proof.sourceUrl}
                            <ExternalLink className="h-3 w-3" strokeWidth={2} />
                          </a>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{proof.excerpt}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {result.sources.length > 0 && (
        <div className="slide-in">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-zinc-400" strokeWidth={2} />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
              {t(language, "sources")} ({result.sources.length})
            </h2>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
            {result.sources.map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex cursor-pointer items-center gap-3 bg-white px-4 py-3 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/40"
              >
                <FileText className="h-4 w-4 shrink-0 text-zinc-400 transition-colors group-hover:text-emerald-500" strokeWidth={1.8} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {src.title ?? src.url}
                    </span>
                    <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {src.sourceType} · {src.reliability}%
                    </span>
                  </div>
                  {src.snippet && <p className="mt-0.5 truncate text-xs text-zinc-500">{src.snippet}</p>}
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-300 transition-colors group-hover:text-emerald-500" strokeWidth={2} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
