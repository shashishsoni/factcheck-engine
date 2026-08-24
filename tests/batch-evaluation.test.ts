import { describe, it, expect } from "vitest";
import type { AiProvider } from "../src/lib/ai/types";
import type {
  CasePacket,
  CrossExamination,
  EvidenceContext,
  ExtractedContent,
  ProgressCallback,
} from "../src/lib/types";
import { JudgeOrchestrator } from "../src/lib/ai/judge/orchestration";
import {
  buildBatchEnsemblePrompt,
  buildBatchCrossExaminationPrompt,
  buildBatchJudgePrompt,
} from "../src/lib/ai/judge/prompts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContent(transcript: string): ExtractedContent {
  return {
    inputType: "video",
    rawInput: "test-input",
    preview: "Test preview",
    textContent: transcript,
    originalTextContent: transcript,
  };
}

function makeContext(claim: string, urls: string[]): EvidenceContext {
  return {
    claim,
    supporting: urls.map((url) => ({
      url,
      title: `Source for ${claim.slice(0, 30)}`,
      snippet: `Evidence about: ${claim}`,
      sourceType: "news" as const,
      reliability: 80,
    })),
    contradicting: [],
    contextual: [],
  };
}

function singleEvaluationJson(c: { verdict: string; confidence: number; explanation: string }): string {
  return JSON.stringify({
    verdict: c.verdict,
    confidence: c.confidence,
    explanation: c.explanation,
    proofs: [],
  });
}

function singleCrossJson(c: { stance: string; argument: string; revisedVerdict: string; revisedConfidence: number }): string {
  return JSON.stringify({
    stance: c.stance,
    argument: c.argument,
    revisedVerdict: c.revisedVerdict,
    revisedConfidence: c.revisedConfidence,
  });
}

function makeSingleProvider(
  name: string,
  evalJson: string,
  crossJson: string,
  callTracker?: { count: number; prompts: string[] },
): AiProvider {
  return {
    name,
    capabilities: ["text"] as const,
    isAvailable: () => true,
    async run() { return evalJson; },
    async runStream(task, onToken) {
      if (callTracker) {
        callTracker.count++;
        if (task.kind === "raw-text") callTracker.prompts.push(task.prompt);
        else if (task.kind === "evaluate-claim") callTracker.prompts.push(task.claim);
      }
      const response = task.kind === "raw-text" ? crossJson : evalJson;
      if (onToken) onToken(response);
      return response;
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Batch ensemble prompt — claim separation", () => {
  it("includes every claim with its own evidence block, clearly delimited", () => {
    const packet: CasePacket = {
      content: makeContent("The speaker said XYZ about the FCRA Act."),
      claims: [
        "The FCRA Act was enacted in 2010.",
        "The FCRA Amendment Bill was introduced in March 2026.",
      ],
      contexts: [
        makeContext("The FCRA Act was enacted in 2010.", ["https://example.com/act-2010"]),
        makeContext("The FCRA Amendment Bill was introduced in March 2026.", ["https://example.com/bill-2026"]),
      ],
    };

    const prompt = buildBatchEnsemblePrompt(packet);

    // Both claims are present with their statements.
    expect(prompt).toContain("The FCRA Act was enacted in 2010.");
    expect(prompt).toContain("The FCRA Amendment Bill was introduced in March 2026.");

    // Each claim has its own evidence block with its own URL.
    expect(prompt).toContain("https://example.com/act-2010");
    expect(prompt).toContain("https://example.com/bill-2026");

    // Claims are clearly delimited with CLAIM 1 / CLAIM 2 markers.
    expect(prompt).toContain("--- CLAIM 1 ---");
    expect(prompt).toContain("--- CLAIM 2 ---");

    // Transcript is included.
    expect(prompt).toContain("The speaker said XYZ about the FCRA Act.");
    expect(prompt).toContain("=== ORIGINAL CONTENT / TRANSCRIPT ===");

    // Instructions to not cross-apply evidence.
    expect(prompt).toContain("Do NOT cross-apply evidence");
  });

  it("instructs the model to return a JSON array with claimIndex", () => {
    const packet: CasePacket = {
      content: makeContent("transcript"),
      claims: ["Claim A", "Claim B"],
      contexts: [makeContext("Claim A", []), makeContext("Claim B", [])],
    };
    const prompt = buildBatchEnsemblePrompt(packet);
    expect(prompt).toContain("JSON ARRAY");
    expect(prompt).toContain("claimIndex");
  });
});

describe("Batch cross-examination prompt", () => {
  it("shows all claims with the candidate's and other models' evaluations", () => {
    const packet: CasePacket = {
      content: makeContent("transcript"),
      claims: ["Claim A", "Claim B"],
      contexts: [makeContext("Claim A", []), makeContext("Claim B", [])],
    };
    const candidate = {
      provider: "model-a",
      parsed: [
        { verdict: "true" as const, confidence: 85, explanation: "Supported", proofs: [] },
        { verdict: "false" as const, confidence: 90, explanation: "Contradicted", proofs: [] },
      ],
      raw: "",
    };
    const others = [
      {
        provider: "model-b",
        parsed: [
          { verdict: "mostly_true" as const, confidence: 70, explanation: "Mostly", proofs: [] },
          { verdict: "false" as const, confidence: 95, explanation: "Definitely false", proofs: [] },
        ],
        raw: "",
      },
    ];

    const prompt = buildBatchCrossExaminationPrompt(packet, candidate, [candidate, ...others]);

    expect(prompt).toContain("Claim A");
    expect(prompt).toContain("Claim B");
    // The candidate's own name appears in the "Other models" section of the
    // other candidates' prompts, but in this prompt it's "Your initial evaluations".
    // The other model's name appears in the "Other models' evaluations" section.
    expect(prompt).toContain("model-b");
    expect(prompt).toContain("85%");
    expect(prompt).toContain("90%");
    expect(prompt).toContain("Do NOT cross-apply reasoning");
  });
});

describe("Batch judge prompt", () => {
  it("includes all claims with evaluations, cross-examinations, and evidence", () => {
    const packet: CasePacket = {
      content: makeContent("transcript"),
      claims: ["Claim A", "Claim B"],
      contexts: [
        makeContext("Claim A", ["https://example.com/a"]),
        makeContext("Claim B", ["https://example.com/b"]),
      ],
    };
    const candidates = [
      {
        provider: "model-a",
        parsed: [
          { verdict: "true" as const, confidence: 85, explanation: "Yes", proofs: [] },
          { verdict: "false" as const, confidence: 90, explanation: "No", proofs: [] },
        ],
        raw: "",
      },
    ];
    const crossesByClaim: CrossExamination[][] = [
      [
        { model: "model-a", stance: "agree", argument: "I agree", revisedVerdict: "true", revisedConfidence: 85, status: "done" },
      ],
      [
        { model: "model-a", stance: "disagree", argument: "I disagree", revisedVerdict: "false", revisedConfidence: 90, status: "done" },
      ],
    ];

    const prompt = buildBatchJudgePrompt(packet, candidates, crossesByClaim);

    expect(prompt).toContain("Claim A");
    expect(prompt).toContain("Claim B");
    expect(prompt).toContain("https://example.com/a");
    expect(prompt).toContain("https://example.com/b");
    expect(prompt).toContain("AGREE");
    expect(prompt).toContain("DISAGREE");
    expect(prompt).toContain("Do NOT cross-apply");
  });
});

describe("JudgeOrchestrator.evaluateClaims — per-claim parallel evaluation", () => {
  it("calls each provider once total for all claims (batch ensemble + batch cross-exam)", async () => {
    const claimCount = 5;
    const claims = Array.from({ length: claimCount }, (_, i) => `Claim ${i + 1}`);
    const contexts = claims.map((c) => makeContext(c, [`https://example.com/${c}`]));
    const packet: CasePacket = {
      content: makeContent("Full transcript of what the speaker said."),
      claims,
      contexts,
    };

    // Batch-format JSON: array of evaluations with claimIndex.
    const batchEvalJson = JSON.stringify(
      claims.map((_, i) => ({
        claimIndex: i,
        verdict: "true",
        confidence: 85,
        explanation: "Supported",
        proofs: [],
      })),
    );
    const batchCrossJson = JSON.stringify(
      claims.map((_, i) => ({
        claimIndex: i,
        stance: "agree",
        argument: "Agreed",
        revisedVerdict: "true",
        revisedConfidence: 85,
      })),
    );

    const aCalls = { count: 0, prompts: [] as string[] };
    const bCalls = { count: 0, prompts: [] as string[] };
    const jCalls = { count: 0, prompts: [] as string[] };
    const trackedA = makeSingleProvider("model-a", batchEvalJson, batchCrossJson, aCalls);
    const trackedB = makeSingleProvider("model-b", batchEvalJson, batchCrossJson, bCalls);
    const trackedJudge = makeSingleProvider("judge", batchEvalJson, batchCrossJson, jCalls);

    const orchestrator = new JudgeOrchestrator([trackedA, trackedB], trackedJudge);
    const results = await orchestrator.evaluateClaims(packet);

    // Batch mode: each ensemble provider called 2x total (1 batch ensemble + 1 batch cross-exam).
    expect(aCalls.count).toBe(2);
    expect(bCalls.count).toBe(2);
    // Judge: 1 batch call for all claims.
    expect(jCalls.count).toBe(1);

    expect(results.length).toBe(claimCount);
    for (let i = 0; i < claimCount; i++) {
      expect(results[i].text).toBe(`Claim ${i + 1}`);
    }
  });

  it("evaluates each claim independently — no cross-claim contamination", async () => {
    const packet: CasePacket = {
      content: makeContent("transcript"),
      claims: ["Claim A", "Claim B"],
      contexts: [
        makeContext("Claim A", ["https://example.com/a"]),
        makeContext("Claim B", ["https://example.com/b"]),
      ],
    };

    const evalJson = singleEvaluationJson({
      verdict: "true",
      confidence: 85,
      explanation: "Yes",
    });
    const crossJson = singleCrossJson({
      stance: "agree",
      argument: "Agreed",
      revisedVerdict: "same",
      revisedConfidence: 85,
    });

    const calls = { count: 0, prompts: [] as string[] };
    const provider = makeSingleProvider("model-a", evalJson, crossJson, calls);
    const judge = makeSingleProvider("judge", evalJson, crossJson);

    const orchestrator = new JudgeOrchestrator([provider], judge);
    await orchestrator.evaluateClaims(packet);

    // Each ensemble prompt should contain only the claim being evaluated,
    // not the other claim's text or evidence.
    const ensemblePrompts = calls.prompts.filter(
      (p) => p.includes("Claim A") || p.includes("Claim B"),
    );
    // No single prompt should contain BOTH claims.
    for (const prompt of ensemblePrompts) {
      const hasA = prompt.includes("Claim A");
      const hasB = prompt.includes("Claim B");
      expect(hasA && hasB).toBe(false);
    }
  });

  it("handles single-claim packets", async () => {
    const packet: CasePacket = {
      content: makeContent("transcript"),
      claims: ["Only claim"],
      contexts: [makeContext("Only claim", ["https://example.com/only"])],
    };

    const evalJson = singleEvaluationJson({
      verdict: "true",
      confidence: 85,
      explanation: "Supported",
    });
    const crossJson = singleCrossJson({
      stance: "agree",
      argument: "Agreed",
      revisedVerdict: "same",
      revisedConfidence: 85,
    });

    const provider = makeSingleProvider("model-a", evalJson, crossJson);
    const judge = makeSingleProvider("judge", evalJson, crossJson);
    const orchestrator = new JudgeOrchestrator([provider], judge);

    const results = await orchestrator.evaluateClaims(packet);
    expect(results.length).toBe(1);
    expect(results[0].text).toBe("Only claim");
  });

  it("returns unverifiable for all claims when all providers fail", async () => {
    const packet: CasePacket = {
      content: makeContent("transcript"),
      claims: ["Claim A", "Claim B"],
      contexts: [makeContext("Claim A", []), makeContext("Claim B", [])],
    };

    const failingProvider: AiProvider = {
      name: "model-a",
      capabilities: ["text"] as const,
      isAvailable: () => true,
      async run() { throw new Error("API down"); },
      async runStream() { throw new Error("API down"); },
    };
    const judge = makeSingleProvider("judge", "{}", "{}");
    const orchestrator = new JudgeOrchestrator([failingProvider], judge);

    const results = await orchestrator.evaluateClaims(packet);
    expect(results.length).toBe(2);
    expect(results[0].verdict).toBe("unverifiable");
    expect(results[1].verdict).toBe("unverifiable");
  });

  it("emits progress events for every claim", async () => {
    const packet: CasePacket = {
      content: makeContent("transcript"),
      claims: ["Claim A", "Claim B"],
      contexts: [makeContext("Claim A", []), makeContext("Claim B", [])],
    };

    const evalJson = singleEvaluationJson({
      verdict: "true",
      confidence: 85,
      explanation: "Yes",
    });
    const crossJson = singleCrossJson({
      stance: "agree",
      argument: "Agreed",
      revisedVerdict: "same",
      revisedConfidence: 85,
    });

    const provider = makeSingleProvider("model-a", evalJson, crossJson);
    const providerB = makeSingleProvider("model-b", evalJson, crossJson);
    const judgeProvider = makeSingleProvider("judge", evalJson, crossJson);

    const orchestrator = new JudgeOrchestrator([provider, providerB], judgeProvider);
    const events: Parameters<ProgressCallback>[0][] = [];
    await orchestrator.evaluateClaims(packet, (event) => events.push(event));

    // Should emit ensemble "started" and "done" for each claim.
    const ensembleStarted = events.filter((e) => e.step === "ensemble" && e.status === "started");
    const ensembleDone = events.filter((e) => e.step === "ensemble" && e.status === "done");
    expect(ensembleStarted.length).toBeGreaterThanOrEqual(2);
    expect(ensembleDone.length).toBe(2);

    // Should emit cross-examine events for each claim.
    const crossDone = events.filter((e) => e.step === "cross-examine" && e.status === "done");
    expect(crossDone.length).toBe(2);

    // Should emit judge "done" for each claim.
    const judgeDone = events.filter((e) => e.step === "judge" && e.status === "done");
    expect(judgeDone.length).toBe(2);
  });

  it("falls back to first candidate's evaluation when judge fails for a claim", async () => {
    const packet: CasePacket = {
      content: makeContent("transcript"),
      claims: ["Claim A", "Claim B"],
      contexts: [makeContext("Claim A", []), makeContext("Claim B", [])],
    };

    // Batch-format JSON: array of evaluations with claimIndex.
    const batchEvalJson = JSON.stringify([
      { claimIndex: 0, verdict: "true", confidence: 85, explanation: "Yes", proofs: [] },
      { claimIndex: 1, verdict: "true", confidence: 85, explanation: "Yes", proofs: [] },
    ]);
    const batchCrossJson = JSON.stringify([
      { claimIndex: 0, stance: "agree", argument: "Agreed", revisedVerdict: "true", revisedConfidence: 85 },
      { claimIndex: 1, stance: "agree", argument: "Agreed", revisedVerdict: "true", revisedConfidence: 85 },
    ]);

    const provider = makeSingleProvider("model-a", batchEvalJson, batchCrossJson);
    const providerB = makeSingleProvider("model-b", batchEvalJson, batchCrossJson);
    // Judge throws on every call (503-like failure).
    const failingJudge: AiProvider = {
      name: "judge",
      capabilities: ["text"] as const,
      isAvailable: () => true,
      async run() { throw new Error("503 Service overloaded"); },
      async runStream() { throw new Error("503 Service overloaded"); },
    };

    const orchestrator = new JudgeOrchestrator([provider, providerB], failingJudge);
    const results = await orchestrator.evaluateClaims(packet);

    // Should NOT throw — should fall back to first candidate's evaluation.
    expect(results.length).toBe(2);
    expect(results[0].verdict).toBe("true");
    expect(results[0].confidence).toBe(85);
    expect(results[1].verdict).toBe("true");
    expect(results[1].confidence).toBe(85);
  });
});

