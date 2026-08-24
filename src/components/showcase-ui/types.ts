import type { ComponentType } from "react";
import type { CrossExamination, FactCheckResult, LanguageMode, ModelEvaluation, SourceDetail } from "@/lib/types";
import type { LucideProps } from "lucide-react";

export interface ShowcaseProps {
  input: string;
  language: LanguageMode;
  onComplete: (result: FactCheckResult) => void;
  onError: (error: string) => void;
}

export interface EvidenceState {
  claim: string;
  status: "active" | "done";
  sources: SourceDetail[];
  searchQueries: string[];
}

export interface ClaimEvalState {
  claim: string;
  ensembleStatus: "active" | "done";
  models?: string[];
  evaluations?: ModelEvaluation[];
  thinkingByModel?: Record<string, string>;
  crossExamineStatus: "pending" | "active" | "done";
  crossExaminations?: CrossExamination[];
  activeCrossModel?: string;
  judgeStatus: "pending" | "active" | "done";
  judgeThinking?: string;
  judgeModel?: string;
  judgeVerdict?: string;
  judgeConfidence?: number;
  judgeReasoning?: string;
  judgeDeliberation?: string;
}

export interface StepState {
  status: "pending" | "active" | "done" | "failed";
  detail?: string;
  model?: string;
  method?: string;
  claims?: string[];
  verdict?: string;
  confidence?: number;
  summary?: string;
  preview?: string;
  inputType?: string;
  rawInput?: string;
  metadata?: Record<string, string>;
}

export interface StepConfig {
  key: string;
  label: string;
  icon: ComponentType<LucideProps>;
}

export interface ShowcaseState {
  language: LanguageMode;
  steps: Record<string, StepState>;
  evidenceByClaim: EvidenceState[];
  evalByClaim: ClaimEvalState[];
  done: boolean;
  expandedEval: number | null;
  setExpandedEval: (index: number | null) => void;
}
