import type { AiProvider } from "../../types";
import type {
  CasePacket,
  CrossExamination,
  EvaluatedClaim,
  EvidenceContext,
  ProgressCallback,
} from "../../../types";
import type { BatchCandidate, Candidate } from "../prompts";

export interface SingleEvaluationContext {
  claim: string;
  evidence: EvidenceContext;
  providers: AiProvider[];
  emit: ProgressCallback;
}

export interface SingleDebateContext {
  claim: string;
  candidates: Candidate[];
  emit: ProgressCallback;
  ensemble: AiProvider[];
  judge: AiProvider;
}

export interface SingleJudgeContext extends SingleDebateContext {
  evidence: EvidenceContext;
  crossExaminations: CrossExamination[];
}

export interface BatchEvaluationContext {
  packet: CasePacket;
  providers: AiProvider[];
  emit: ProgressCallback;
  claims: string[];
}

export interface BatchDebateContext {
  packet: CasePacket;
  candidates: BatchCandidate[];
  emit: ProgressCallback;
  claims: string[];
  ensemble: AiProvider[];
  judge: AiProvider;
}

export interface BatchJudgeContext {
  packet: CasePacket;
  candidates: BatchCandidate[];
  emit: ProgressCallback;
  claims: string[];
  judge: AiProvider;
  crossExaminationsByClaim: CrossExamination[][];
}

export interface BatchJudgeDoneContext extends BatchJudgeContext {
  results: EvaluatedClaim[];
}
