import Link from "next/link";
import { redirect } from "next/navigation";
import { prismaRepository } from "@/lib/storage/prisma-repository";
import { VerdictBadge } from "@/components/VerdictBadge";
import { getSession } from "@/lib/auth/get-session";
import { Plus, Quote, BookOpen, Clock, AlertTriangle, ArrowRight, ScanSearch } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/history");

  let items: Awaited<ReturnType<typeof prismaRepository.list>> = [];
  let error: string | null = null;
  try {
    items = await prismaRepository.list(50, 0, session.userId);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load history";
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">History</h1>
          <p className="mt-1 text-sm text-zinc-500">All your fact-checks, saved with full citations</p>
        </div>
        <Link
          href="/check"
          className="group flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:translate-y-px"
        >
          <Plus className="h-4 w-4" strokeWidth={2.2} />
          New Check
        </Link>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          <div>
            <p>{error}</p>
            <p className="mt-1 text-xs">
              Make sure your database is running and <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900/40">DATABASE_URL</code> is set in <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900/40">.env</code>,
              then run <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900/40">npx prisma migrate dev</code>.
            </p>
          </div>
        </div>
      )}

      {!error && items.length === 0 && (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <ScanSearch className="h-7 w-7 text-zinc-400" strokeWidth={1.5} />
          </div>
          <p className="mt-4 text-lg font-medium text-zinc-600 dark:text-zinc-400">No fact checks yet</p>
          <p className="mt-1 text-sm text-zinc-400">Run your first check to see results here</p>
          <Link
            href="/check"
            className="group mt-4 flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:translate-y-px"
          >
            Start a fact check
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} />
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <div className="stagger mt-6 space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/check/${item.id}`}
              className="group block cursor-pointer rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-emerald-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{item.inputType}</p>
                  <p className="mt-1.5 truncate text-sm font-medium">
                    {item.inputPreview ?? item.inputRaw}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Quote className="h-3 w-3" strokeWidth={2} />
                      {item.claims.length} claims
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" strokeWidth={2} />
                      {item.sources.length} sources
                    </span>
                    {item.createdAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" strokeWidth={2} />
                        {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <VerdictBadge verdict={item.verdict} confidence={item.confidence} />
                  <ArrowRight className="h-4 w-4 text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-emerald-500" strokeWidth={2} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
