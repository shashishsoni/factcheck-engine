import Link from "next/link";
import { ScanSearch, Plus, History } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/60 bg-background/80 backdrop-blur-md dark:border-zinc-800/60">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <Link
          href="/"
          className="flex cursor-pointer items-center gap-2.5 font-semibold tracking-tight transition-opacity hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm shadow-emerald-600/20">
            <ScanSearch className="h-4.5 w-4.5" strokeWidth={2.2} />
          </div>
          <span className="text-[15px]">FactChecker</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/check"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">New Check</span>
          </Link>
          <Link
            href="/history"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
          >
            <History className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">History</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
