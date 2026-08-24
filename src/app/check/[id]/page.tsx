import Link from "next/link";
import { notFound } from "next/navigation";
import { prismaRepository } from "@/lib/storage/prisma-repository";
import { VerdictBadge } from "@/components/VerdictBadge";
import { verdictPlain } from "@/components/language/translations";
import { ChatPanel } from "@/components/ChatPanel";
import {
  ArrowLeft,
  Quote,
  BookOpen,
  ExternalLink,
  FileText,
  Clock,
  ThumbsUp,
  ThumbsDown,
  CircleDot,
  Gavel,
  Scale,
  ScrollText,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let result: Awaited<ReturnType<typeof prismaRepository.getById>> = null;
  try {
    result = await prismaRepository.getById(id);
  } catch {
    notFound();
  }
  if (!result) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <Link
        href="/history"
        className="group flex cursor-pointer items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={2} />
        Back to history
      </Link>

      <div className="mt-6 space-y-6">
        {/* === JUDGE'S RULING — prominent court-style verdict === */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {/* Header bar */}
          <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50/80 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <Gavel className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Judge&apos;s Final Ruling</span>
          </div>

          <div className="p-6">
            {/* Input info */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{result.inputType}</p>
                <p className="mt-1.5 break-all text-sm font-medium">
                  {result.inputPreview ?? result.inputRaw}
                </p>
                {result.createdAt && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500">
                    <Clock className="h-3 w-3" strokeWidth={2} />
                    {new Date(result.createdAt).toLocaleString()}
                  </p>
                )}
              </div>
              <VerdictBadge verdict={result.verdict} confidence={result.confidence} />
            </div>

            {/* Plain-language explanation of the verdict + confidence */}
            <div className="mt-4 rounded-xl bg-zinc-50 p-3.5 dark:bg-zinc-800/40">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {verdictPlain("en", result.verdict)}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                The percentage ({result.confidence}%) is how confident the system is in this verdict — not how true the content is.
              </p>
            </div>

            {/* The ruling — plain language summary */}
            {result.summary && (
              <div className="mt-5 rounded-xl border-l-4 border-emerald-500 bg-emerald-50/50 p-4 dark:border-emerald-600 dark:bg-emerald-950/20">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">The Ruling</span>
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
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Detailed Opinion</span>
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
                {result.claims.length} claims evaluated
              </span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                <BookOpen className="h-3 w-3" strokeWidth={2} />
                {result.sources.length} sources consulted
              </span>
            </div>
          </div>
        </div>

        {/* Claims */}
        {result.claims.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Quote className="h-4 w-4 text-zinc-400" strokeWidth={2} />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
                Claims ({result.claims.length})
              </h2>
            </div>
            <div className="space-y-3">
              {result.claims.map((claim, i) => (
                <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium leading-relaxed">{claim.text}</p>
                    <VerdictBadge verdict={claim.verdict} confidence={claim.confidence} />
                  </div>
                  {claim.explanation && (
                    <p className="mt-2.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{claim.explanation}</p>
                  )}
                  {claim.proofs && claim.proofs.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {claim.proofs.map((proof, j) => (
                        <div key={j} className="border-l-2 border-emerald-300 pl-3 dark:border-emerald-800">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                              {proof.kind === "supports" && <ThumbsUp className="h-2.5 w-2.5" strokeWidth={2} />}
                              {proof.kind === "contradicts" && <ThumbsDown className="h-2.5 w-2.5" strokeWidth={2} />}
                              {proof.kind === "contextual" && <CircleDot className="h-2.5 w-2.5" strokeWidth={2} />}
                              {proof.kind}
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
          <div>
            <div className="mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-zinc-400" strokeWidth={2} />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
                Sources ({result.sources.length})
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

        {/* Chat with AI */}
        <ChatPanel
          factCheckId={result.id!}
          initialMessages={(result.messages ?? []).map((m) => ({
            role: m.role,
            content: m.content,
            updatedVerdict: m.updatedVerdict ?? null,
            updatedConfidence: m.updatedConfidence ?? null,
          }))}
        />
      </div>
    </main>
  );
}
