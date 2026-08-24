"use client";

import React from "react";
import type { ShowcaseState, StepConfig, StepState } from "./types";
import { ShowcaseContent } from "./panels/content";
import { DebatePanel } from "./panels/debate";
import { EvidencePanel } from "./panels/evidence";

export function NeuralNode({
  config,
  state,
  showcase,
  onHover,
}: {
  config: StepConfig;
  state?: StepState;
  showcase: ShowcaseState;
  onHover?: (key: string | null) => void;
}) {
  const isActive = state?.status === "active";
  const isDone = state?.status === "done";

  const isDebateStep = ["ensemble", "cross-examine", "judge"].includes(config.key);
  // extract-claims only needs the wide grid once claims are actually present;
  // during its skeleton/loading phase the medium width fits the small NodeSkeleton.
  const hasClaims = (showcase.steps["extract-claims"]?.claims?.length ?? 0) > 0;
  const isWideGridStep =
    config.key === "gather-evidence" || (config.key === "extract-claims" && hasClaims);

  const cardWidth = isDebateStep
    ? "w-[1800px] sm:w-[2200px] xl:w-[2600px] 2xl:w-[2900px]"
    : isWideGridStep
      ? "w-[1400px] sm:w-[1650px] xl:w-[1920px] 2xl:w-[2180px]"
      : "w-[680px] sm:w-[780px] xl:w-[880px]";

  const claimsList = showcase.steps["extract-claims"]?.claims ?? [];

  return (
    <div
      onMouseEnter={() => onHover?.(config.key)}
      onMouseLeave={() => onHover?.(null)}
      onWheel={(e) => {
        if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
      }}
      data-node-key={config.key}
      className={`node-enter node-card relative ${cardWidth} font-mono text-xs transition-all`}
    >
      <div className="space-y-4">
        <ShowcaseContent
          language={showcase.language}
          step={config.key}
          state={state}
        />

        {config.key === "gather-evidence" && (isActive || isDone) && (
          <EvidencePanel
            language={showcase.language}
            evidenceByClaim={showcase.evidenceByClaim}
            claims={claimsList}
          />
        )}

        {["ensemble", "cross-examine", "judge"].includes(config.key) && (
          <DebatePanel
            language={showcase.language}
            step={config.key}
            steps={showcase.steps}
            claims={claimsList}
            evalByClaim={showcase.evalByClaim}
            expandedEval={showcase.expandedEval}
            setExpandedEval={showcase.setExpandedEval}
          />
        )}
      </div>
    </div>
  );
}
