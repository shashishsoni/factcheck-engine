import type { LanguageMode, Verdict } from "@/lib/types";
import { verdictLabel } from "./language/translations";
import { Check, CheckCheck, Minus, X, AlertTriangle, HelpCircle } from "lucide-react";

const STYLES: Record<Verdict, { label: string; icon: typeof Check; className: string }> = {
  pending: {
    label: "Pending",
    icon: HelpCircle,
    className: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
  },
  true: {
    label: "True",
    icon: CheckCheck,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900",
  },
  mostly_true: {
    label: "Mostly True",
    icon: Check,
    className: "bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-950/40 dark:text-lime-400 dark:border-lime-900",
  },
  mixed: {
    label: "Mixed",
    icon: Minus,
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
  },
  mostly_false: {
    label: "Mostly False",
    icon: AlertTriangle,
    className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900",
  },
  false: {
    label: "False",
    icon: X,
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900",
  },
  unverifiable: {
    label: "Unverifiable",
    icon: HelpCircle,
    className: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
  },
};

export function VerdictBadge({ verdict, confidence, language }: { verdict: Verdict; confidence?: number; language?: LanguageMode }) {
  const s = STYLES[verdict] ?? STYLES.unverifiable;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${s.className}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      {language ? verdictLabel(language, verdict) : s.label}
      {confidence !== undefined && <span className="opacity-60">· {confidence}%</span>}
    </span>
  );
}
