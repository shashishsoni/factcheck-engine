import {
  ArrowRightLeft,
  Brain,
  Captions,
  CircleDot,
  Film,
  Gavel,
  Inbox,
  ScanSearch,
  Search,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import type { LanguageMode } from "@/lib/types";
import { t, verdictLabel } from "@/components/language/translations";
import type { StepConfig } from "../types";

export const STEP_CONFIG: StepConfig[] = [
  { key: "input", label: "Input Analysis", icon: Inbox },
  { key: "transcript", label: "Transcript Extraction", icon: Captions },
  { key: "analyze-media", label: "Media Analysis", icon: Film },
  { key: "extract-claims", label: "Claim Extraction", icon: ScanSearch },
  { key: "gather-evidence", label: "Evidence Gathering", icon: Search },
  { key: "ensemble", label: "Ensemble Evaluation", icon: Brain },
  { key: "cross-examine", label: "Cross-Examination", icon: ArrowRightLeft },
  { key: "judge", label: "Supreme Judicial Bench", icon: Gavel },
  { key: "synthesize", label: "Verdict Synthesis", icon: Sparkles },
];

const VERDICT_COLORS: Record<string, string> = {
  true: "text-emerald-400 bg-emerald-950/40 border-emerald-800/60",
  mostly_true: "text-lime-400 bg-lime-950/40 border-lime-800/60",
  mixed: "text-amber-400 bg-amber-950/40 border-amber-800/60",
  mostly_false: "text-orange-400 bg-orange-950/40 border-orange-800/60",
  false: "text-red-400 bg-red-950/40 border-red-800/60",
  unverifiable: "text-zinc-400 bg-zinc-800/40 border-zinc-700/60",
};

export function VerdictBadge({ verdict, language = "en" }: { verdict?: string; language?: LanguageMode }) {
  if (!verdict) return null;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${VERDICT_COLORS[verdict] ?? VERDICT_COLORS.unverifiable}`}>
      {verdictLabel(language, verdict)}
    </span>
  );
}

export function PerspectiveIcon({ perspective }: { perspective: string }) {
  if (perspective === "supporting") return <ThumbsUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />;
  if (perspective === "contradicting") return <ThumbsDown className="h-3 w-3 text-red-600 dark:text-red-400" strokeWidth={2} />;
  return <CircleDot className="h-3 w-3 text-zinc-500" strokeWidth={2} />;
}

export function perspectiveLabel(perspective: string, language: LanguageMode = "en"): string {
  if (perspective === "supporting") return t(language, "supporting");
  if (perspective === "contradicting") return t(language, "contradicting");
  return t(language, "contextual");
}

export function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 40);
  }
}
