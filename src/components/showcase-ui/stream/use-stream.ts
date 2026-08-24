"use client";

import { useEffect, useRef, useState } from "react";
import type { FactCheckResult, LanguageMode } from "@/lib/types";
import type {
  ClaimEvalState,
  EvidenceState,
  ShowcaseState,
  StepState,
} from "../types";
import { consumeFactCheckStream } from "./client";
import type { StreamEvent } from "./types";

export function useShowcaseStream(
  input: string,
  language: LanguageMode,
  onComplete: (result: FactCheckResult) => void,
  onError: (error: string) => void,
): ShowcaseState {
  const [steps, setSteps] = useState<Record<string, StepState>>({});
  const [evidenceByClaim, setEvidenceByClaim] = useState<EvidenceState[]>([]);
  const [evalByClaim, setEvalByClaim] = useState<ClaimEvalState[]>([]);
  const [done, setDone] = useState(false);
  const [expandedEval, setExpandedEval] = useState<number | null>(null);
  const lastInputRef = useRef<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    if (lastInputRef.current === input) return;
    lastInputRef.current = input;
    setSteps({});
    setEvidenceByClaim([]);
    setEvalByClaim([]);
    setDone(false);
    setExpandedEval(null);

    const controller = new AbortController();

    async function runStream() {
      try {
        await consumeFactCheckStream(input, language, handleEvent, controller.signal);
      } catch (error) {
        if (!controller.signal.aborted) {
          onErrorRef.current(error instanceof Error ? error.message : "Verification stream failed");
        }
      }
    }

    function handleEvent(event: StreamEvent) {
      if (event.step === "result" && event.result) {
        setDone(true);
        onCompleteRef.current(event.result);
        return;
      }
      if (event.step === "error") {
        onErrorRef.current(event.error ?? "Unknown error");
        return;
      }
      if (!event.status) return;

      updateStep(event);
      if (event.step === "gather-evidence") updateEvidence(event);
      if (event.step === "thinking") updateThinking(event);
      if (event.step === "ensemble") updateEnsemble(event);
      if (event.step === "cross-examine") updateCrossExamination(event);
      if (event.step === "judge") updateJudge(event);
    }

    function updateStep(event: StreamEvent) {
      const status = event.status === "started" ? "active" : event.status === "done" ? "done" : "failed";
      setSteps((previous) => ({
        ...previous,
        [event.step]: {
          status,
          detail: event.detail,
          model: event.model,
          method: event.method,
          claims: event.claims,
          verdict: event.verdict,
          confidence: event.confidence,
          summary: event.summary,
          preview: event.preview,
          inputType: event.inputType,
          rawInput: event.rawInput,
          metadata: event.metadata,
        },
      }));
    }

    function updateEvidence(event: StreamEvent) {
      const claim = event.claim ?? "";
      if (event.status === "started") {
        setEvidenceByClaim((previous) => [
          ...previous.filter((item) => item.claim !== claim),
          { claim, status: "active", sources: [], searchQueries: event.searchQueries ?? [] },
        ]);
      } else if (event.status === "done") {
        setEvidenceByClaim((previous) => previous.map((item) => item.claim === claim
          ? { ...item, status: "done", sources: event.sourceList ?? [], searchQueries: event.searchQueries ?? item.searchQueries }
          : item));
      }
    }

    function updateThinking(event: StreamEvent) {
      if (!event.model) return;
      const claim = event.claim ?? "";
      setEvalByClaim((previous) => {
        const existing = previous.find((item) => item.claim === claim);
        if (!existing) {
          // Create the entry if it doesn't exist yet — thinking events may
          // arrive before the ensemble "started" event in some race conditions.
          return [
            ...previous,
            {
              claim,
              ensembleStatus: "active" as const,
              thinkingByModel: { [event.model!]: event.fullText ?? "" },
              crossExamineStatus: "pending" as const,
              judgeStatus: "pending" as const,
            },
          ];
        }
        return previous.map((item) => item.claim === claim
          ? {
              ...item,
              thinkingByModel: {
                ...item.thinkingByModel,
                [event.model!]: event.fullText ?? item.thinkingByModel?.[event.model!] ?? "",
              },
            }
          : item);
      });
    }

    function updateEnsemble(event: StreamEvent) {
      const claim = event.claim ?? "";
      if (event.status === "started") {
        setEvalByClaim((previous) => {
          const existing = previous.find((item) => item.claim === claim);
          if (existing) {
            return previous.map((item) => item.claim === claim
              ? {
                  ...item,
                  ensembleStatus: "active",
                  models: event.models ?? item.models,
                  evaluations: event.evaluations ?? item.evaluations,
                }
              : item);
          }
          return [
            ...previous,
            { claim, ensembleStatus: "active", models: event.models, evaluations: event.evaluations, crossExamineStatus: "pending", judgeStatus: "pending" },
          ];
        });
      } else if (event.status === "done") {
        setEvalByClaim((previous) => previous.map((item) => item.claim === claim
          ? { ...item, ensembleStatus: "done", evaluations: event.evaluations ?? item.evaluations }
          : item));
      }
    }

    function updateCrossExamination(event: StreamEvent) {
      const claim = event.claim ?? "";
      setEvalByClaim((previous) => previous.map((item) => item.claim !== claim
        ? item
        : event.status === "done"
          ? { ...item, crossExamineStatus: "done", crossExaminations: event.examinations ?? item.crossExaminations, activeCrossModel: undefined }
          : { ...item, crossExamineStatus: "active", activeCrossModel: event.activeModel, crossExaminations: event.examinations ?? item.crossExaminations }));
    }

    function updateJudge(event: StreamEvent) {
      const claim = event.claim ?? "";
      setEvalByClaim((previous) => previous.map((item) => item.claim !== claim
        ? item
        : event.status === "done"
          ? {
              ...item,
              judgeStatus: "done",
              judgeModel: event.model,
              judgeVerdict: event.verdict,
              judgeConfidence: event.confidence,
              judgeReasoning: event.reasoning,
              judgeDeliberation: event.deliberation,
              judgeThinking: event.thinking || item.judgeThinking,
            }
          : { ...item, judgeStatus: "active", judgeModel: event.model, judgeThinking: event.thinking || item.judgeThinking }));
    }

    void runStream();
    return () => {
      controller.abort();
      lastInputRef.current = null;
    };
  }, [input, language]);

  return {
    language,
    steps,
    evidenceByClaim,
    evalByClaim,
    done,
    expandedEval,
    setExpandedEval,
  };
}
